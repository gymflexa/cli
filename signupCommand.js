/* Copyright 2025 GymFlexa LLC */
import signupCommand from '@monorepool/agentfirst/signupCommand.js'

import { appUrl, binaryName } from './constants.js'
import getApiUrl from './getApiUrl.js'
import session from './session.js'

// The step that used to need a person. `login` assumes the account already
// exists; an agent pointed at gymflexa.com for the first time has nothing to
// log into, and the browser flow it would otherwise fall back to blocks with
// nobody there to complete it.
//
//   gymflexa signup --email founder@example.com --json
//
// drives the same public POST /api/signup the web signup form posts to
// (HTTP Basic `email:password`), then stores the returned token pair in the
// same ~/.gymflexa/ the browser login writes — so every other command works
// immediately afterwards. The new organization is seeded with one gym.
export default () => signupCommand({ binaryName, getApiUrl, appUrl, session })
