import test from 'node:test'
import assert from 'node:assert/strict'
import { __test__ } from '../src/lib/prompt.mjs'

test('maskDefault redacts HypersHub keys', () => {
  assert.equal(__test__.maskDefault('hy-1234567890abcdef'), 'hy-****cdef')
  assert.equal(__test__.maskDefault('plain'), 'plain')
  assert.equal(__test__.maskDefault(''), '')
})
