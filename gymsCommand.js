/* Copyright 2025 GymFlexa LLC */

import { fail, printJson, withJson } from '@monorepool/agentfirst/output.js'
import * as commander from 'commander'

import buildQuery from './buildQuery.js'
import { bold, cyan, dim } from './formatOutput.js'
import parseBody from './parseBody.js'
import api from './request.js'

function gymsCommand() {
  const command = new commander.Command('gyms')
  command.description(
    'manage the gyms of your organization (gyms:read / gyms:write)',
  )

  withJson(
    command
      .command('list')
      .description('list the gyms of your organization (GET /api/gyms)')
      .option('-n, --limit <limit>', 'max results (server-capped at 200)', '25')
      .option('--skip <skip>', 'skip the first N results')
      .option(
        '--sortField <sortField>',
        'sort by _id, name or lastEditTime (anything else falls back to _id)',
      )
      .option('--sortDirection <sortDirection>', 'ASC or DESC')
      .option('--fields <fields>', 'comma-separated projection of fields'),
  ).action(async options => {
    try {
      const gyms = await api.get(
        `/api/gyms${buildQuery({
          fields: options.fields,
          limit: options.limit,
          skip: options.skip,
          sortDirection: options.sortDirection,
          sortField: options.sortField,
        })}`,
      )

      if (options.json) {
        printJson(gyms)
        return
      }

      if (gyms.length === 0) {
        console.log('No gyms found')
        return
      }

      console.log(`Found ${gyms.length} gym(s):`)
      gyms.forEach((gym, index) => {
        const place = [gym.city, gym.countryCode].filter(Boolean).join(', ')
        console.log(
          `${index + 1}. ${gym.name || gym._id}` +
            `${place ? ` — ${place}` : ''} (${gym._id})`,
        )
      })
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('get <gymId>')
      .description('raw JSON for one gym (GET /api/gyms/:gymId)'),
  ).action(async (gymId, options) => {
    try {
      const gym = await api.get(`/api/gyms/${gymId}`)
      printJson(gym)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('read <gymId>')
      .description('read one gym formatted for the terminal'),
  ).action(async (gymId, options) => {
    try {
      const gym = await api.get(`/api/gyms/${gymId}`)
      if (options.json) {
        printJson(gym)
        return
      }
      if (!gym) {
        console.log('Gym not found')
        return
      }
      console.log()
      console.log(bold(gym.name || gym._id))
      console.log(dim(gym._id))
      console.log()
      if (gym.email) console.log(`${cyan('email')}  ${gym.email}`)
      if (gym.phone) console.log(`${cyan('phone')}  ${gym.phone}`)
      if (gym.currency) console.log(`${cyan('currency')}  ${gym.currency}`)
      if (gym.timezone) console.log(`${cyan('timezone')}  ${gym.timezone}`)
      if (gym.defaultLocale) {
        console.log(`${cyan('defaultLocale')}  ${gym.defaultLocale}`)
      }
      if (gym.appointmentDuration) {
        console.log(
          `${cyan('appointmentDuration')}  ${gym.appointmentDuration} min`,
        )
      }
      if (gym.openingHours?.length) {
        console.log(
          `${cyan('openingHours')}  ${gym.openingHours.length} rule(s)`,
        )
      }
      if (gym.creationTime) {
        console.log(`${cyan('created')}  ${gym.creationTime}`)
      }
      console.log()
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('add')
      .description('create a gym (POST /api/gyms)')
      .requiredOption('--name <name>', 'gym name')
      .option('--email <email>', 'contact email')
      .option('--phone <phone>', 'contact phone number')
      .option('--currency <currency>', 'three-letter currency code, e.g. EUR')
      .option('--timezone <timezone>', 'IANA timezone, e.g. Europe/Rome')
      .option('--defaultLocale <defaultLocale>', 'two-letter language code')
      .option(
        '--appointmentDuration <minutes>',
        'default appointment length in minutes',
      )
      .option(
        '--body <json>',
        'extra JSON fields merged into the request body',
      ),
  ).action(async options => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const gym = await api.post('/api/gyms', {
        ...body,
        name: options.name,
        ...(options.email && { email: options.email }),
        ...(options.phone && { phone: options.phone }),
        ...(options.currency && { currency: options.currency }),
        ...(options.timezone && { timezone: options.timezone }),
        ...(options.defaultLocale && { defaultLocale: options.defaultLocale }),
        ...(options.appointmentDuration && {
          appointmentDuration: Number(options.appointmentDuration),
        }),
      })
      if (options.json) {
        printJson({ ok: true, id: gym._id })
        return
      }
      printJson(gym)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('update <gymId>')
      .description('update a gym (PUT /api/gyms/:gymId)')
      .option('--name <name>', 'gym name')
      .option('--email <email>', 'contact email')
      .option('--phone <phone>', 'contact phone number')
      .option('--currency <currency>', 'three-letter currency code, e.g. EUR')
      .option('--timezone <timezone>', 'IANA timezone, e.g. Europe/Rome')
      .option('--defaultLocale <defaultLocale>', 'two-letter language code')
      .option(
        '--appointmentDuration <minutes>',
        'default appointment length in minutes',
      )
      .option(
        '--body <json>',
        'extra JSON fields merged into the request body',
      ),
  ).action(async (gymId, options) => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const gym = await api.put(`/api/gyms/${gymId}`, {
        ...body,
        _id: gymId,
        ...(options.name && { name: options.name }),
        ...(options.email && { email: options.email }),
        ...(options.phone && { phone: options.phone }),
        ...(options.currency && { currency: options.currency }),
        ...(options.timezone && { timezone: options.timezone }),
        ...(options.defaultLocale && { defaultLocale: options.defaultLocale }),
        ...(options.appointmentDuration && {
          appointmentDuration: Number(options.appointmentDuration),
        }),
      })
      if (options.json) {
        printJson({ ok: true, id: gym._id })
        return
      }
      printJson(gym)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('delete <gymId...>')
      .description('delete one or more gyms by id (DELETE /api/gyms/:gymId)'),
  ).action(async (gymIds, options) => {
    const deleted = []
    for (let index = 0; index < gymIds.length; index += 1) {
      const gymId = gymIds[index]
      try {
        await api.del(`/api/gyms/${gymId}`)
        deleted.push(gymId)
        if (!options.json) {
          console.log(`deleted ${gymId}`)
        }
      } catch (error) {
        fail(error, { json: options.json })
      }
    }
    if (options.json) {
      printJson({ ok: deleted.length === gymIds.length, deleted })
    }
  })

  return command
}

export default gymsCommand
