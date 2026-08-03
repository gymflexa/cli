/* Copyright 2025 GymFlexa LLC */

// Production GymFlexa API. Override with GYMFLEXA_API_URL for staging/dev.
module.exports = function getApiUrl() {
  return process.env.GYMFLEXA_API_URL || 'https://api.gymflexa.com'
}
