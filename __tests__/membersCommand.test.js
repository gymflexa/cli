/* Copyright 2025 GymFlexa LLC */

import { stripVTControlCharacters } from 'node:util'

import { fail, printJson } from '@monorepool/agentfirst/output.js'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import membersCommand from '../membersCommand.js'
import api from '../request.js'

vi.mock('../request.js', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), del: vi.fn() },
}))
vi.mock('@monorepool/agentfirst/output.js', async importOriginal => ({
  ...(await importOriginal()),
  printJson: vi.fn(),
  fail: vi.fn(),
}))

beforeEach(() => {
  vi.resetAllMocks()
  vi.spyOn(console, 'log').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

const run = args =>
  membersCommand().exitOverride().parseAsync(args, { from: 'user' })

it('lists with the documented filters and passes JSON data unchanged', async () => {
  const members = [{ _id: 'one', name: 'Jane' }]
  api.get.mockResolvedValue(members)
  await run([
    'list',
    '--gymId',
    'gym',
    '--email',
    'a+b@example.com',
    '--userId',
    'user',
    '--ids',
    'one,two',
    '--limit',
    '8',
    '--skip',
    '0',
    '--fields',
    'name,email',
    '--json',
  ])
  expect(api.get).toHaveBeenCalledExactlyOnceWith(
    '/api/members?_ids=one%2Ctwo&email=a%2Bb%40example.com&fields=name%2Cemail&gymId=gym&limit=8&skip=0&userId=user',
  )
  expect(printJson).toHaveBeenCalledExactlyOnceWith(members)
  expect(fail).not.toHaveBeenCalled()
})

it('uses the default list limit without adding absent filters', async () => {
  api.get.mockResolvedValue([])
  await run(['list', '--json'])
  expect(api.get).toHaveBeenCalledExactlyOnceWith('/api/members?limit=25')
  expect(printJson).toHaveBeenCalledExactlyOnceWith([])
})

it.each(['get', 'read'])('reads one member with %s --json', async action => {
  const member = { _id: 'one', name: 'Jane' }
  api.get.mockResolvedValue(member)
  await run([action, 'one', '--json'])
  expect(api.get).toHaveBeenCalledExactlyOnceWith('/api/members/one')
  expect(printJson).toHaveBeenCalledExactlyOnceWith(member)
})

it('merges extra create fields while explicit options take precedence', async () => {
  api.post.mockResolvedValue({ _id: 'created' })
  await run([
    'add',
    '--name',
    'Jane',
    '--gymId',
    'gym',
    '--email',
    'jane@example.com',
    '--phone',
    '+123',
    '--dateOfBirth',
    '1986-01-31',
    '--language',
    'en',
    '--note',
    'explicit note',
    '--body',
    '{"name":"overridden","note":"keep","gymId":"overridden"}',
    '--json',
  ])
  expect(api.post).toHaveBeenCalledExactlyOnceWith('/api/members', {
    name: 'Jane',
    gymId: 'gym',
    email: 'jane@example.com',
    phone: '+123',
    dateOfBirth: '1986-01-31',
    language: 'en',
    note: 'explicit note',
  })
  expect(printJson).toHaveBeenCalledExactlyOnceWith({ ok: true, id: 'created' })
})

it('retains the record gym on update and cannot replace the path ID with a body ID', async () => {
  api.get.mockResolvedValue({ gymId: 'existing' })
  api.put.mockResolvedValue({ _id: 'one' })
  await run([
    'update',
    'one',
    '--name',
    'Jane',
    '--body',
    '{"_id":"other","note":"keep"}',
    '--json',
  ])
  expect(api.get).toHaveBeenCalledExactlyOnceWith('/api/members/one')
  expect(api.put).toHaveBeenCalledExactlyOnceWith('/api/members/one', {
    _id: 'one',
    gymId: 'existing',
    name: 'Jane',
    note: 'keep',
  })
  expect(printJson).toHaveBeenCalledExactlyOnceWith({ ok: true, id: 'one' })
})

it('does not fetch before an update with an explicit gym', async () => {
  api.put.mockResolvedValue({ _id: 'one' })
  await run(['update', 'one', '--gymId', 'chosen', '--json'])
  expect(api.get).not.toHaveBeenCalled()
  expect(api.put).toHaveBeenCalledExactlyOnceWith('/api/members/one', {
    _id: 'one',
    gymId: 'chosen',
  })
})

it('rejects malformed extra JSON without sending a write', async () => {
  await run(['add', '--name', 'Jane', '--body', '{', '--json'])
  expect(api.post).not.toHaveBeenCalled()
  expect(fail).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({
      message: expect.stringContaining('--body is not valid JSON:'),
    }),
    { json: true },
  )
  expect(printJson).not.toHaveBeenCalled()
})

it('reports transport failures through the shared error output', async () => {
  const failure = Object.assign(new Error('not allowed'), { status: 403 })
  api.get.mockRejectedValue(failure)
  await run(['get', 'one', '--json'])
  expect(fail).toHaveBeenCalledExactlyOnceWith(failure, { json: true })
  expect(printJson).not.toHaveBeenCalled()
})

it('deletes each requested ID and reports the actual successes', async () => {
  api.del.mockResolvedValue(undefined)
  await run(['delete', 'one', 'two', '--json'])
  expect(api.del.mock.calls).toEqual([
    ['/api/members/one'],
    ['/api/members/two'],
  ])
  expect(printJson).toHaveBeenCalledExactlyOnceWith({
    ok: true,
    deleted: ['one', 'two'],
  })
})

it('reports partial delete success without including the failed ID', async () => {
  const error = new Error('synthetic deletion denied')
  api.del.mockRejectedValueOnce(error).mockResolvedValueOnce(undefined)
  await run(['delete', 'one', 'two', '--json'])
  expect(api.del.mock.calls).toEqual([
    ['/api/members/one'],
    ['/api/members/two'],
  ])
  expect(fail).toHaveBeenCalledExactlyOnceWith(error, { json: true })
  expect(printJson).toHaveBeenCalledExactlyOnceWith({
    ok: false,
    deleted: ['two'],
  })
})

it('preserves an explicitly supplied zero list limit', async () => {
  api.get.mockResolvedValue([])
  await run(['list', '--limit', '0', '--json'])
  expect(api.get).toHaveBeenCalledExactlyOnceWith('/api/members?limit=0')
})

it('does not write when the existing record cannot be fetched for an update', async () => {
  const error = new Error('synthetic read denied')
  api.get.mockRejectedValue(error)
  await run(['update', 'one', '--name', 'Synthetic Name', '--json'])
  expect(api.put).not.toHaveBeenCalled()
  expect(fail).toHaveBeenCalledExactlyOnceWith(error, { json: true })
  expect(printJson).not.toHaveBeenCalled()
})

it('keeps body fields on update while explicit options and the path ID take precedence', async () => {
  api.put.mockResolvedValue({ _id: 'one' })
  await run([
    'update',
    'one',
    '--name',
    'Synthetic Name',
    '--email',
    'synthetic@example.test',
    '--phone',
    '+123',
    '--dateOfBirth',
    '1986-01-31',
    '--language',
    'en',
    '--body',
    '{"_id":"other","gymId":"body-gym","note":"keep","email":"overridden"}',
    '--json',
  ])
  expect(api.get).not.toHaveBeenCalled()
  expect(api.put).toHaveBeenCalledExactlyOnceWith('/api/members/one', {
    _id: 'one',
    gymId: 'body-gym',
    note: 'keep',
    name: 'Synthetic Name',
    email: 'synthetic@example.test',
    phone: '+123',
    dateOfBirth: '1986-01-31',
    language: 'en',
  })
})

it('renders an empty human list without printing JSON', async () => {
  api.get.mockResolvedValue([])
  await run(['list'])
  expect(console.log).toHaveBeenCalledExactlyOnceWith('No members found')
  expect(printJson).not.toHaveBeenCalled()
})

it('renders human list contact details and the ID fallback', async () => {
  api.get.mockResolvedValue([
    {
      _id: 'one',
      name: 'Synthetic Name',
      email: 'synthetic@example.test',
      phone: '+123',
    },
    { _id: 'two' },
  ])
  await run(['list'])
  expect(console.log.mock.calls).toEqual([
    ['Found 2 member(s):'],
    ['1. Synthetic Name — synthetic@example.test · +123 (one)'],
    ['2. two (two)'],
  ])
  expect(printJson).not.toHaveBeenCalled()
})

it('renders a missing member in human mode', async () => {
  api.get.mockResolvedValue(null)
  await run(['read', 'one'])
  expect(console.log).toHaveBeenCalledExactlyOnceWith('Member not found')
  expect(printJson).not.toHaveBeenCalled()
})

it('renders all supplied member details in human mode', async () => {
  api.get.mockResolvedValue({
    _id: 'one',
    name: 'Synthetic Name',
    email: 'synthetic@example.test',
    phone: '+123',
    dateOfBirth: '1986-01-31',
    language: 'en',
    gymId: 'gym',
    note: 'Synthetic note',
    creationTime: '2026-01-01T00:00:00Z',
  })
  await run(['read', 'one'])
  expect(
    console.log.mock.calls.map(args => args.map(stripVTControlCharacters)),
  ).toEqual([
    [],
    ['Synthetic Name'],
    ['one'],
    [],
    ['email  synthetic@example.test'],
    ['phone  +123'],
    ['dateOfBirth  1986-01-31'],
    ['language  en'],
    ['gymId  gym'],
    ['note  Synthetic note'],
    ['created  2026-01-01T00:00:00Z'],
    [],
  ])
  expect(printJson).not.toHaveBeenCalled()
})

it('uses the member ID when human details are absent', async () => {
  api.get.mockResolvedValue({ _id: 'one' })
  await run(['read', 'one'])
  expect(
    console.log.mock.calls.map(args => args.map(stripVTControlCharacters)),
  ).toEqual([[], ['one'], ['one'], [], []])
  expect(printJson).not.toHaveBeenCalled()
})

it('passes a single member ID through the documented filter', async () => {
  api.get.mockResolvedValue([])
  await run(['list', '--id', 'one', '--json'])
  expect(api.get).toHaveBeenCalledExactlyOnceWith(
    '/api/members?_id=one&limit=25',
  )
})
