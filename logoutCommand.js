/* Copyright 2025 GymFlexa LLC */
import logoutCommand from '@monorepool/agentfirst/logoutCommand.js'

import { binaryName, envKeyName } from './constants.js'
import session from './session.js'

// Clears everything stored in ~/.gymflexa/ — the API key secret and any
// browser-login tokens. A key exported as GYMFLEXA_API_KEY stays in effect;
// the shared factory says so instead of silently staying authenticated.
export default () => logoutCommand({ binaryName, session, envKeyName })
