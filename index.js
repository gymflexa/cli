#!/usr/bin/env node
/* Copyright 2025 GymFlexa LLC */
const program = require('commander')
const skillsCommand = require('@monorepool/agentfirst/skillsCommand.js')
const appointmentsCommand = require('./appointmentsCommand.js')
const gymsCommand = require('./gymsCommand.js')
const loginCommand = require('./loginCommand.js')
const logoutCommand = require('./logoutCommand.js')
const membersCommand = require('./membersCommand.js')
const paymentsCommand = require('./paymentsCommand.js')
const schemaCommand = require('./schemaCommand.js')
const servicesCommand = require('./servicesCommand.js')
const signupCommand = require('./signupCommand.js')
const packageJson = require('./package.json')

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
  .addCommand(skillsCommand({ baseDirectory: __dirname }))

// `schema` describes the assembled program, itself included, so it is added
// after every other command is registered and before parsing.
program.addCommand(schemaCommand(program))
program.parse(process.argv)
