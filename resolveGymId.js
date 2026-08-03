/* Copyright 2025 GymFlexa LLC */

// gymflexa/api requires a gymId on every member/appointment/service/payment
// write (`checkStringNotEmpty(gymId, 'missing gymId')`). A key locked to one
// gym supplies it implicitly through response.locals; an organization-wide
// key must send it. On update, when the caller passed no --gymId, reuse the
// gymId of the existing record (costs one extra read, and therefore the
// matching `:read` scope).
module.exports = async function resolveGymId(options, body, getExisting) {
  let gymId = options.gymId || body.gymId
  if (!gymId) {
    const existing = await getExisting()
    gymId = existing?.gymId
  }
  return gymId
}
