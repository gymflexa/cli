/* Copyright 2025 GymFlexa LLC */
import createRequest from '@monorepool/agentfirst/request.js'

import { binaryName, envKeyName } from './constants.js'
import getApiUrl from './getApiUrl.js'
import session from './session.js'

// Dual-mode transport from @monorepool/agentfirst:
//
//   token mode — `Authorization: Token base64(jwt)` after a browser login,
//                with a single refresh against /api/refresh-access-token
//                on a 401
//   key mode   — `Authorization: Basic base64(<key secret>)` from the
//                stored secret or the GYMFLEXA_API_KEY environment variable;
//                API keys are long-lived secrets, so there is no refresh
//
// Both wire formats are what gymflexa/api documents in its published
// reference (`apiKey` = Basic base64(<key secret>) with no username and no
// colon, `accessToken` = Token <access token>).
//
// Credential precedence lives in agentfirst's resolveCredential.js: stored
// session > stored key > environment key. Errors carry `.status` and
// `.body`, and end with the login hint (naming both `gymflexa login` and
// GYMFLEXA_API_KEY) when the caller never authenticated.
export default createRequest({ getApiUrl, session, envKeyName, binaryName })
