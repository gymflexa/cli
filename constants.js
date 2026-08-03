/* Copyright 2025 GymFlexa LLC */

// The per-product configuration every @monorepool/agentfirst factory needs.
//
// GYMFLEXA_API_KEY is read from the environment at request time; a stored
// login (browser session or pasted key) always wins over it, so a globally
// exported key cannot silently hijack an interactive session.
module.exports = {
  binaryName: 'gymflexa',
  appUrl: 'https://app.gymflexa.com',
  envKeyName: 'GYMFLEXA_API_KEY',
}
