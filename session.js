/* Copyright 2025 GymFlexa LLC */
import createSessionStore from '@monorepool/agentfirst/sessionStore.js'

// ~/.gymflexa/ holds both credential kinds: the accessToken + refreshToken a
// browser login stores, and the API key secret `login --with-key` prompts
// for. The directory is only created on first use — `gymflexa --help` leaves
// nothing behind.
export default createSessionStore({ productDirName: 'gymflexa' })
