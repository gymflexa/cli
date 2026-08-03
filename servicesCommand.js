/* Copyright 2025 GymFlexa LLC */
const commander = require('commander')
const { printJson, withJson, fail } = require('@monorepool/agentfirst/output.js')
const buildQuery = require('./buildQuery.js')
const parseBody = require('./parseBody.js')
const api = require('./request.js')
const resolveGymId = require('./resolveGymId.js')
const { dim, bold, cyan } = require('./formatOutput.js')

function servicesCommand() {
  const command = new commander.Command('services')
  command.description(
    'manage the services your gyms sell (services:read / services:write)',
  )

  withJson(
    command
      .command('list')
      .description('list services (GET /api/services)')
      .option('--gymId <gymId>', 'only services of this gym')
      .option(
        '-n, --limit <limit>',
        'max results (server-capped at 200)',
        '25',
      )
      .option('--skip <skip>', 'skip the first N results')
      .option('--sortField <sortField>', 'field to sort by, e.g. name')
      .option('--sortDirection <sortDirection>', 'ASC or DESC (default DESC)')
      .option('--fields <fields>', 'comma-separated projection of fields'),
  ).action(async options => {
    try {
      const services = await api.get(
        `/api/services${buildQuery({
          fields: options.fields,
          gymId: options.gymId,
          limit: options.limit,
          skip: options.skip,
          sortDirection: options.sortDirection,
          sortField: options.sortField,
        })}`,
      )

      if (options.json) {
        printJson(services)
        return
      }

      if (services.length === 0) {
        console.log('No services found')
        return
      }

      console.log(`Found ${services.length} service(s):`)
      services.forEach((service, index) => {
        const price =
          service.price === undefined || service.price === null
            ? ''
            : ` — ${service.price}`
        console.log(
          `${index + 1}. ${service.name || service._id}${price}` +
            ` (${service._id})`,
        )
      })
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('get <serviceId>')
      .description('raw JSON for one service (GET /api/services/:serviceId)'),
  ).action(async (serviceId, options) => {
    try {
      const service = await api.get(`/api/services/${serviceId}`)
      printJson(service)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('read <serviceId>')
      .description('read one service formatted for the terminal'),
  ).action(async (serviceId, options) => {
    try {
      const service = await api.get(`/api/services/${serviceId}`)
      if (options.json) {
        printJson(service)
        return
      }
      if (!service) {
        console.log('Service not found')
        return
      }
      console.log()
      console.log(bold(service.name || service._id))
      console.log(dim(service._id))
      console.log()
      if (service.price !== undefined && service.price !== null) {
        console.log(`${cyan('price')}  ${service.price}`)
      }
      if (service.description) {
        console.log(`${cyan('description')}  ${service.description}`)
      }
      if (service.color) console.log(`${cyan('color')}  ${service.color}`)
      if (service.gymId) console.log(`${cyan('gymId')}  ${service.gymId}`)
      if (service.lastEditTime) {
        console.log(`${cyan('lastEdited')}  ${service.lastEditTime}`)
      }
      console.log()
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('add')
      .description('create a service (POST /api/services)')
      .requiredOption('--name <name>', 'service name')
      .option(
        '--gymId <gymId>',
        'gym the service belongs to (required unless the key is locked to one gym)',
      )
      .option('--price <price>', 'price in the gym currency, e.g. 50')
      .option('--description <description>', 'service description')
      .option('--color <color>', 'calendar color, e.g. #EC407A')
      .option('--body <json>', 'extra JSON fields merged into the request body'),
  ).action(async options => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const service = await api.post('/api/services', {
        ...body,
        name: options.name,
        ...(options.gymId && { gymId: options.gymId }),
        ...(options.price !== undefined && { price: Number(options.price) }),
        ...(options.description && { description: options.description }),
        ...(options.color && { color: options.color }),
      })
      if (options.json) {
        printJson({ ok: true, id: service._id })
        return
      }
      printJson(service)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('update <serviceId>')
      .description('update a service (PUT /api/services/:serviceId)')
      .option('--name <name>', 'service name')
      .option('--gymId <gymId>', 'gym the service belongs to')
      .option('--price <price>', 'price in the gym currency, e.g. 50')
      .option('--description <description>', 'service description')
      .option('--color <color>', 'calendar color, e.g. #EC407A')
      .option('--body <json>', 'extra JSON fields merged into the request body'),
  ).action(async (serviceId, options) => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const gymId = await resolveGymId(options, body, () =>
        api.get(`/api/services/${serviceId}`),
      )
      const service = await api.put(`/api/services/${serviceId}`, {
        ...body,
        _id: serviceId,
        ...(gymId && { gymId }),
        ...(options.name && { name: options.name }),
        ...(options.price !== undefined && { price: Number(options.price) }),
        ...(options.description && { description: options.description }),
        ...(options.color && { color: options.color }),
      })
      if (options.json) {
        printJson({ ok: true, id: service._id })
        return
      }
      printJson(service)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('delete <serviceId...>')
      .description(
        'delete one or more services by id (DELETE /api/services/:serviceId)',
      ),
  ).action(async (serviceIds, options) => {
    const deleted = []
    for (let index = 0; index < serviceIds.length; index += 1) {
      const serviceId = serviceIds[index]
      try {
        await api.del(`/api/services/${serviceId}`)
        deleted.push(serviceId)
        if (!options.json) {
          console.log(`deleted ${serviceId}`)
        }
      } catch (error) {
        fail(error, { json: options.json })
      }
    }
    if (options.json) {
      printJson({ ok: deleted.length === serviceIds.length, deleted })
    }
  })

  return command
}

module.exports = servicesCommand
