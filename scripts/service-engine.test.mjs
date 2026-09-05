import test from 'node:test'
import assert from 'node:assert/strict'
import { serviceReducer as reduce, initialState, scenarios, diagnose, normal } from '../src/serviceEngine.js'

test('invalid transitions cannot close or service an unstarted task', () => {
  const initial = initialState()
  for (const type of ['inject', 'adjust', 'ticket', 'check', 'verify', 'close', 'normalClose']) assert.deepEqual(reduce(initial, { type, recovered: true }), initial)
})
for (const id of Object.keys(scenarios)) test(`${id}: failed verification keeps task paused; passing permits archive`, () => {
  let s = reduce(initialState(), { type: 'scenario', id })
  s = reduce(s, { type: 'start', id: `TEST-${id}` })
  assert.equal(reduce(s, { type: 'scenario', id: 'normal' }).scenario, id)
  s = reduce(s, { type: 'inject' })
  assert.ok(diagnose(s.values).some(m => m.triggered))
  s = reduce(s, { type: 'adjust' })
  s = reduce(s, { type: 'ticket' })
  assert.equal(reduce(s, { type: 'verify', recovered: true }).phase, 'ticketed')
  for (let i = 0; i < 3; i++) s = reduce(s, { type: 'check', index: i })
  s = reduce(s, { type: 'verify', recovered: false })
  assert.equal(s.outcome, 'fail')
  assert.equal(reduce(s, { type: 'close' }).phase, 'ticketed')
  s = reduce(s, { type: 'verify', recovered: true })
  assert.equal(s.phase, 'verified')
  assert.deepEqual(s.values, normal)
  s = reduce(s, { type: 'close' })
  assert.equal(s.phase, 'closed')
  assert.ok(s.events.some(e => e.message.includes('复检未通过')))
  assert.equal(s.ticket.scenario, id)
  assert.deepEqual(s.ticket.triggerValues, scenarios[id].values)
})
test('normal inspection archives without a fault work order', () => {
  let s = reduce(initialState(), { type: 'start', id: 'NORMAL' })
  for (let i = 0; i < 90; i++) s = reduce(s, { type: 'tick' })
  assert.equal(s.samples.length, 30)
  assert.ok(diagnose(s.values).every(m => !m.triggered))
  s = reduce(s, { type: 'normalClose' })
  assert.equal(s.phase, 'closed')
  assert.equal(s.ticket, null)
  assert.deepEqual(reduce(s, { type: 'reset' }), initialState())
})
test('threshold boundary triggers at equality', () => {
  assert.ok(diagnose([65, 6, 3, 10]).every(m => m.triggered))
  assert.ok(diagnose([64.9, 5.9, 2.9, 9.9]).every(m => !m.triggered))
})
