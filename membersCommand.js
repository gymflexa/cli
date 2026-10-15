/* Copyright 2025 GymFlexa LLC */

import { fail, printJson, withJson } from '@monorepool/agentfirst/output.js'
import * as commander from 'commander'

import buildQuery from './buildQuery.js'
import { bold, cyan, dim } from './formatOutput.js'
import parseBody from './parseBody.js'
import api from './request.js'
import resolveGymId from './resolveGymId.js'

function membersCommand() {
  const command = new commander.Command('members')
  command.description(
    'manage the members enrolled in your gyms (members:read / members:write)',
  )

  withJson(
    command
      .command('list')
      .description('list members (GET /api/members)')
      .option('--gymId <gymId>', 'only members of this gym')
      .option('--email <email>', 'only members with this exact email')
      .option('--userId <userId>', 'only members linked to this user')
      .option('--id <id>', 'a single member id')
      .option('--ids <ids>', 'comma-separated member ids')
      .option('-n, --limit <limit>', 'max results (server-capped at 200)', '25')
      .option('--skip <skip>', 'skip the first N results')
      .option('--fields <fields>', 'comma-separated projection of fields'),
  ).action(async options => {
    try {
      const members = await api.get(
        `/api/members${buildQuery({
          _id: options.id,
          _ids: options.ids,
          email: options.email,
          fields: options.fields,
          gymId: options.gymId,
          limit: options.limit,
          skip: options.skip,
          userId: options.userId,
        })}`,
      )

      if (options.json) {
        printJson(members)
        return
      }

      if (members.length === 0) {
        console.log('No members found')
        return
      }

      console.log(`Found ${members.length} member(s):`)
      members.forEach((member, index) => {
        const contact = [member.email, member.phone].filter(Boolean).join(' · ')
        console.log(
          `${index + 1}. ${member.name || member._id}` +
            `${contact ? ` — ${contact}` : ''} (${member._id})`,
        )
      })
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('get <memberId>')
      .description('raw JSON for one member (GET /api/members/:memberId)'),
  ).action(async (memberId, options) => {
    try {
      const member = await api.get(`/api/members/${memberId}`)
      printJson(member)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('read <memberId>')
      .description('read one member formatted for the terminal'),
  ).action(async (memberId, options) => {
    try {
      const member = await api.get(`/api/members/${memberId}`)
      if (options.json) {
        printJson(member)
        return
      }
      if (!member) {
        console.log('Member not found')
        return
      }
      console.log()
      console.log(bold(member.name || member._id))
      console.log(dim(member._id))
      console.log()
      if (member.email) console.log(`${cyan('email')}  ${member.email}`)
      if (member.phone) console.log(`${cyan('phone')}  ${member.phone}`)
      if (member.dateOfBirth) {
        console.log(`${cyan('dateOfBirth')}  ${member.dateOfBirth}`)
      }
      if (member.language) {
        console.log(`${cyan('language')}  ${member.language}`)
      }
      if (member.gymId) console.log(`${cyan('gymId')}  ${member.gymId}`)
      if (member.note) console.log(`${cyan('note')}  ${member.note}`)
      if (member.creationTime) {
        console.log(`${cyan('created')}  ${member.creationTime}`)
      }
      console.log()
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('add')
      .description('create a member (POST /api/members, fires member.created)')
      .requiredOption('--name <name>', 'member full name')
      .option(
        '--gymId <gymId>',
        'gym the member belongs to (required unless the key is locked to one gym)',
      )
      .option('--email <email>', 'member email')
      .option('--phone <phone>', 'member phone number')
      .option('--language <language>', 'two-letter language code, e.g. en')
      .option('--dateOfBirth <dateOfBirth>', 'date of birth, e.g. 1986-01-31')
      .option('--note <note>', 'free-text note kept on the member')
      .option(
        '--body <json>',
        'extra JSON fields merged into the request body',
      ),
  ).action(async options => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const member = await api.post('/api/members', {
        ...body,
        name: options.name,
        ...(options.gymId && { gymId: options.gymId }),
        ...(options.email && { email: options.email }),
        ...(options.phone && { phone: options.phone }),
        ...(options.language && { language: options.language }),
        ...(options.dateOfBirth && { dateOfBirth: options.dateOfBirth }),
        ...(options.note && { note: options.note }),
      })
      if (options.json) {
        printJson({ ok: true, id: member._id })
        return
      }
      printJson(member)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('update <memberId>')
      .description(
        'update a member (PUT /api/members/:memberId, fires member.updated)',
      )
      .option('--name <name>', 'member full name')
      .option('--gymId <gymId>', 'gym the member belongs to')
      .option('--email <email>', 'member email')
      .option('--phone <phone>', 'member phone number')
      .option('--language <language>', 'two-letter language code, e.g. en')
      .option('--dateOfBirth <dateOfBirth>', 'date of birth, e.g. 1986-01-31')
      .option('--note <note>', 'free-text note kept on the member')
      .option(
        '--body <json>',
        'extra JSON fields merged into the request body',
      ),
  ).action(async (memberId, options) => {
    try {
      const body = options.body ? parseBody(options.body) : {}
      const gymId = await resolveGymId(options, body, () =>
        api.get(`/api/members/${memberId}`),
      )
      const member = await api.put(`/api/members/${memberId}`, {
        ...body,
        _id: memberId,
        ...(gymId && { gymId }),
        ...(options.name && { name: options.name }),
        ...(options.email && { email: options.email }),
        ...(options.phone && { phone: options.phone }),
        ...(options.language && { language: options.language }),
        ...(options.dateOfBirth && { dateOfBirth: options.dateOfBirth }),
        ...(options.note && { note: options.note }),
      })
      if (options.json) {
        printJson({ ok: true, id: member._id })
        return
      }
      printJson(member)
    } catch (error) {
      fail(error, { json: options.json })
    }
  })

  withJson(
    command
      .command('delete <memberId...>')
      .description(
        'delete one or more members by id (DELETE /api/members/:memberId)',
      ),
  ).action(async (memberIds, options) => {
    const deleted = []
    for (let index = 0; index < memberIds.length; index += 1) {
      const memberId = memberIds[index]
      try {
        await api.del(`/api/members/${memberId}`)
        deleted.push(memberId)
        if (!options.json) {
          console.log(`deleted ${memberId}`)
        }
      } catch (error) {
        fail(error, { json: options.json })
      }
    }
    if (options.json) {
      printJson({ ok: deleted.length === memberIds.length, deleted })
    }
  })

  return command
}

export default membersCommand
