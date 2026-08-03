/* Copyright 2025 GymFlexa LLC */
const commander = require('commander')
const { printJson, withJson, fail } = require('@monorepool/agentfirst/output.js')
const buildQuery = require('./buildQuery.js')
const parseBody = require('./parseBody.js')
const api = require('./request.js')
const resolveGymId = require('./resolveGymId.js')
const { dim, bold, cyan } = require('./formatOutput.js')

// gymflexa/model/Payment.js — the statuses the API stores.
const STATUSES = ['SUCCEEDED', 'FAILED', 'CANCELED']

function paymentsCommand() {
  const command = new commander.Command('payments')
  command.description(
    'manage the payments recorded by your gyms' +
      ' (payments:read / payments:write)',
  )

  withJson(
    command
      .command('list')
      .description('list payments (GET /api/payments)')
      .option('--gymId <gymId>', 'only payments of this gym')
      .option('--memberId <memberId>', 'only payments of this member')
      .option(
        '--startTime <startTime>',
        'ISO timestamp — keep payments created at or after it',
      )
      .option(
        '--endTime <endTime>',
        'ISO timestamp — keep payments created before it',
      )
      .option('-n, --limit <limit>', 'max results (0 means no limit)', '25')
      .option('--skip <skip>', 'skip the first N results')
      .option('--sortField <sortField>', 'field to sort by, e.g. creationTime')
      .option('--sortDirection <sortDirection>', 'ASC or DESC (default DESC)')
      .option('--fields <fields>', 'comma-separated projection of fields'),
  ).action(async options => {
    try {
      const payments = await api.get(
        `/api/payments${buildQuery({
          endTime: options.endTime,
          fields: options.fields,
          gymId: options.gymId,
          limit: options.limit,
          memberId: options.memberId,
          skip: options.skip,
          sortDirection: options.sortDirection,
          sortField: options.sortField,
          startTime: options.startTime,
        })}`,
      )

      if (options.json) {
        printJson(payments)
        return
      }

      if (payments.length === 0) {
        console.log('No payments found')
        return
      }

      console.log(`Found ${payments.length} payment(s):`)
      payments.forEach((payment, index) => {
        const amount = [payment.amount, payment.currency]
          .filter(value => value !== undefined && value !== null)
          .join(' ')
        console.log(
          `${index + 1}. ${amount || payment._id}` +
            `${payment.status ? ` [${payment.status}]` : ''}` +
            ` (${payment._id})`,
        )
      })
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('get <paymentId>')
      .description('raw JSON for one payment (GET /api/payments/:paymentId)'),
  ).action(async (paymentId, options) => {
    try {
      const payment = await api.get(`/api/payments/${paymentId}`)
      printJson(payment)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('read <paymentId>')
      .description('read one payment formatted for the terminal'),
  ).action(async (paymentId, options) => {
    try {
      const payment = await api.get(`/api/payments/${paymentId}`)
      if (options.json) {
        printJson(payment)
        return
      }
      if (!payment) {
        console.log('Payment not found')
        return
      }
      console.log()
      console.log(
        bold(
          [payment.amount, payment.currency]
            .filter(value => value !== undefined && value !== null)
            .join(' ') || payment._id,
        ),
      )
      console.log(dim(payment._id))
      console.log()
      if (payment.status) console.log(`${cyan('status')}  ${payment.status}`)
      if (payment.memberId) {
        console.log(`${cyan('memberId')}  ${payment.memberId}`)
      }
      if (payment.gymId) console.log(`${cyan('gymId')}  ${payment.gymId}`)
      if (payment.services?.length) {
        console.log(
          `${cyan('services')}  ${payment.services
            .map(service => service.name)
            .filter(Boolean)
            .join(', ')}`,
        )
      }
      if (payment.note) console.log(`${cyan('note')}  ${payment.note}`)
      if (payment.creationTime) {
        console.log(`${cyan('created')}  ${payment.creationTime}`)
      }
      console.log()
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('add')
      .description(
        'record a payment (POST /api/payments, fires payment.created)',
      )
      .option(
        '--gymId <gymId>',
        'gym the payment belongs to (required unless the key is locked to one gym)',
      )
      .option('--memberId <memberId>', 'member the payment is for')
      .option('--amount <amount>', 'amount in the gym currency, e.g. 50')
      .option('--currency <currency>', 'three-letter currency code, e.g. EUR')
      .option('--status <status>', `one of ${STATUSES.join(', ')}`)
      .option('--note <note>', 'free-text note kept on the payment')
      .option('--body <json>', 'extra JSON fields merged into the request body'),
  ).action(async options => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const payment = await api.post('/api/payments', {
        ...body,
        ...(options.gymId && { gymId: options.gymId }),
        ...(options.memberId && { memberId: options.memberId }),
        ...(options.amount !== undefined && { amount: Number(options.amount) }),
        ...(options.currency && { currency: options.currency }),
        ...(options.status && { status: options.status }),
        ...(options.note && { note: options.note }),
      })
      if (options.json) {
        printJson({ ok: true, id: payment._id })
        return
      }
      printJson(payment)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('update <paymentId>')
      .description('update a payment (PUT /api/payments/:paymentId)')
      .option('--gymId <gymId>', 'gym the payment belongs to')
      .option('--memberId <memberId>', 'member the payment is for')
      .option('--amount <amount>', 'amount in the gym currency, e.g. 50')
      .option('--currency <currency>', 'three-letter currency code, e.g. EUR')
      .option('--status <status>', `one of ${STATUSES.join(', ')}`)
      .option('--note <note>', 'free-text note kept on the payment')
      .option('--body <json>', 'extra JSON fields merged into the request body'),
  ).action(async (paymentId, options) => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const gymId = await resolveGymId(options, body, () =>
        api.get(`/api/payments/${paymentId}`),
      )
      const payment = await api.put(`/api/payments/${paymentId}`, {
        ...body,
        _id: paymentId,
        ...(gymId && { gymId }),
        ...(options.memberId && { memberId: options.memberId }),
        ...(options.amount !== undefined && { amount: Number(options.amount) }),
        ...(options.currency && { currency: options.currency }),
        ...(options.status && { status: options.status }),
        ...(options.note && { note: options.note }),
      })
      if (options.json) {
        printJson({ ok: true, id: payment._id })
        return
      }
      printJson(payment)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('delete <paymentId...>')
      .description(
        'delete one or more payments by id (DELETE /api/payments/:paymentId)',
      ),
  ).action(async (paymentIds, options) => {
    const deleted = []
    for (let index = 0; index < paymentIds.length; index += 1) {
      const paymentId = paymentIds[index]
      try {
        await api.del(`/api/payments/${paymentId}`)
        deleted.push(paymentId)
        if (!options.json) {
          console.log(`deleted ${paymentId}`)
        }
      } catch (error) {
        fail(error, { json: options.json })
      }
    }
    if (options.json) {
      printJson({ ok: deleted.length === paymentIds.length, deleted })
    }
  })

  return command
}

module.exports = paymentsCommand
