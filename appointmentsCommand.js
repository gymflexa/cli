/* Copyright 2025 GymFlexa LLC */
const commander = require('commander')
const { printJson, withJson, fail } = require('@monorepool/agentfirst/output.js')
const buildQuery = require('./buildQuery.js')
const parseBody = require('./parseBody.js')
const api = require('./request.js')
const resolveGymId = require('./resolveGymId.js')
const { dim, bold, cyan } = require('./formatOutput.js')

// gymflexa/model/Appointment.js — the statuses the API stores.
const STATUSES = ['SCHEDULED', 'MEMBER_ARRIVED', 'NO_SHOW', 'CANCELED']

function appointmentsCommand() {
  const command = new commander.Command('appointments')
  command.description(
    'manage the appointments on your gyms’ calendars' +
      ' (appointments:read / appointments:write)',
  )

  withJson(
    command
      .command('list')
      .description('list appointments (GET /api/appointments)')
      .option('--gymId <gymId>', 'only appointments of this gym')
      .option('--memberId <memberId>', 'only appointments of this member')
      .option(
        '--startTime <startTime>',
        'ISO timestamp — keep appointments starting at or after it',
      )
      .option(
        '--endTime <endTime>',
        'ISO timestamp — keep appointments ending before it',
      )
      .option(
        '-n, --limit <limit>',
        'max results (server-capped at 200)',
        '25',
      )
      .option('--skip <skip>', 'skip the first N results')
      .option('--sortField <sortField>', 'field to sort by, e.g. startTime')
      .option('--sortDirection <sortDirection>', 'ASC or DESC (default DESC)')
      .option('--fields <fields>', 'comma-separated projection of fields'),
  ).action(async options => {
    try {
      const appointments = await api.get(
        `/api/appointments${buildQuery({
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
        printJson(appointments)
        return
      }

      if (appointments.length === 0) {
        console.log('No appointments found')
        return
      }

      console.log(`Found ${appointments.length} appointment(s):`)
      appointments.forEach((appointment, index) => {
        const when = [appointment.startTime, appointment.endTime]
          .filter(Boolean)
          .join(' → ')
        console.log(
          `${index + 1}. ${when || appointment._id}` +
            `${appointment.status ? ` [${appointment.status}]` : ''}` +
            ` (${appointment._id})`,
        )
      })
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('get <appointmentId>')
      .description(
        'raw JSON for one appointment (GET /api/appointments/:appointmentId)',
      ),
  ).action(async (appointmentId, options) => {
    try {
      const appointment = await api.get(`/api/appointments/${appointmentId}`)
      printJson(appointment)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('read <appointmentId>')
      .description('read one appointment formatted for the terminal'),
  ).action(async (appointmentId, options) => {
    try {
      const appointment = await api.get(`/api/appointments/${appointmentId}`)
      if (options.json) {
        printJson(appointment)
        return
      }
      if (!appointment) {
        console.log('Appointment not found')
        return
      }
      console.log()
      console.log(bold(appointment.startTime || appointment._id))
      console.log(dim(appointment._id))
      console.log()
      if (appointment.endTime) {
        console.log(`${cyan('endTime')}  ${appointment.endTime}`)
      }
      if (appointment.status) {
        console.log(`${cyan('status')}  ${appointment.status}`)
      }
      if (appointment.memberId) {
        console.log(`${cyan('memberId')}  ${appointment.memberId}`)
      }
      if (appointment.gymId) {
        console.log(`${cyan('gymId')}  ${appointment.gymId}`)
      }
      if (appointment.services?.length) {
        console.log(
          `${cyan('services')}  ${appointment.services
            .map(service => service.name)
            .filter(Boolean)
            .join(', ')}`,
        )
      }
      if (appointment.note) {
        console.log(`${cyan('note')}  ${appointment.note}`)
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
        'book an appointment (POST /api/appointments, fires appointment.created)',
      )
      .requiredOption('--startTime <startTime>', 'ISO start timestamp')
      .requiredOption('--endTime <endTime>', 'ISO end timestamp')
      .option('--memberId <memberId>', 'member the appointment is for')
      .option(
        '--gymId <gymId>',
        'gym the appointment belongs to (required unless the key is locked to one gym)',
      )
      .option('--status <status>', `one of ${STATUSES.join(', ')}`)
      .option('--note <note>', 'free-text note kept on the appointment')
      .option('--body <json>', 'extra JSON fields merged into the request body'),
  ).action(async options => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const appointment = await api.post('/api/appointments', {
        ...body,
        startTime: options.startTime,
        endTime: options.endTime,
        ...(options.memberId && { memberId: options.memberId }),
        ...(options.gymId && { gymId: options.gymId }),
        ...(options.status && { status: options.status }),
        ...(options.note && { note: options.note }),
      })
      if (options.json) {
        printJson({ ok: true, id: appointment._id })
        return
      }
      printJson(appointment)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('update <appointmentId>')
      .description(
        'update an appointment (PUT /api/appointments/:appointmentId,' +
          ' fires appointment.updated)',
      )
      .option('--startTime <startTime>', 'ISO start timestamp')
      .option('--endTime <endTime>', 'ISO end timestamp')
      .option('--memberId <memberId>', 'member the appointment is for')
      .option('--gymId <gymId>', 'gym the appointment belongs to')
      .option('--status <status>', `one of ${STATUSES.join(', ')}`)
      .option('--note <note>', 'free-text note kept on the appointment')
      .option('--body <json>', 'extra JSON fields merged into the request body'),
  ).action(async (appointmentId, options) => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const gymId = await resolveGymId(options, body, () =>
        api.get(`/api/appointments/${appointmentId}`),
      )
      const appointment = await api.put(`/api/appointments/${appointmentId}`, {
        ...body,
        _id: appointmentId,
        ...(gymId && { gymId }),
        ...(options.startTime && { startTime: options.startTime }),
        ...(options.endTime && { endTime: options.endTime }),
        ...(options.memberId && { memberId: options.memberId }),
        ...(options.status && { status: options.status }),
        ...(options.note && { note: options.note }),
      })
      if (options.json) {
        printJson({ ok: true, id: appointment._id })
        return
      }
      printJson(appointment)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('delete <appointmentId...>')
      .description(
        'delete one or more appointments by id' +
          ' (DELETE /api/appointments/:appointmentId); their scheduled' +
          ' reminders are cancelled too',
      ),
  ).action(async (appointmentIds, options) => {
    const deleted = []
    for (let index = 0; index < appointmentIds.length; index += 1) {
      const appointmentId = appointmentIds[index]
      try {
        await api.del(`/api/appointments/${appointmentId}`)
        deleted.push(appointmentId)
        if (!options.json) {
          console.log(`deleted ${appointmentId}`)
        }
      } catch (error) {
        fail(error, { json: options.json })
      }
    }
    if (options.json) {
      printJson({ ok: deleted.length === appointmentIds.length, deleted })
    }
  })

  return command
}

module.exports = appointmentsCommand
