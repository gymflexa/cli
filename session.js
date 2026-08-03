/* Copyright 2025 GymFlexa LLC */
const createSessionStore = require('@monorepool/agentfirst/sessionStore.js')

// ~/.gymflexa/ holds both credential kinds: the accessToken + refreshToken a
// browser login stores, and the API key secret `login --with-key` prompts
// for. The directory is only created on first use — `gymflexa --help` leaves
// nothing behind.
module.exports = createSessionStore({ productDirName: 'gymflexa' })
