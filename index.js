#!/usr/bin/env node
/* Copyright 2025 GymFlexa LLC */

import { existsSync, realpathSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

import skillsCommand from '@monorepool/agentfirst/skillsCommand.js'
import { program } from 'commander'

import appointmentsCommand from './appointmentsCommand.js'
import gymsCommand from './gymsCommand.js'
import loginCommand from './loginCommand.js'
import logoutCommand from './logoutCommand.js'
import membersCommand from './membersCommand.js'
import packageJson from './package.json' with { type: 'json' }
import paymentsCommand from './paymentsCommand.js'
import schemaCommand from './schemaCommand.js'
import servicesCommand from './servicesCommand.js'
import signupCommand from './signupCommand.js'

const cliDirectory = fileURLToPath(new URL('.', import.meta.url))

function isDirectRun() {
  return Boolean(
    process.argv[1] &&
    existsSync(process.argv[1]) &&
    import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href,
  )
}

program
  .name('gymflexa')
  .description(
    'gymflexa cli — manage the gyms, members, services, appointments' +
      ' and payments of your organization from the terminal',
  )
  .version(packageJson.version)
  .addCommand(signupCommand())
  .addCommand(loginCommand())
  .addCommand(logoutCommand())
  .addCommand(gymsCommand())
  .addCommand(membersCommand())
  .addCommand(servicesCommand())
  .addCommand(appointmentsCommand())
  .addCommand(paymentsCommand())
  // baseDirectory must be this file's directory: the shared factory resolves
  // the bundled skills/ relative to it (dist/index.js → ../skills).
  .addCommand(skillsCommand({ baseDirectory: cliDirectory }))

// `schema` describes the assembled program, itself included, so it is added
// after every other command is registered and before parsing.
program.addCommand(schemaCommand(program))
if (isDirectRun()) program.parse(process.argv)

export default program
