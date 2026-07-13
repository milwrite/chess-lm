import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { Chess } from 'chess.js'

const prompts = JSON.parse(
  await readFile(new URL('../model/council-prompts.json', import.meta.url), 'utf8'),
)
const positions = JSON.parse(
  await readFile(new URL('../model/evals/positions.json', import.meta.url), 'utf8'),
)

assert.equal(prompts.authority, 'stockfish-uci-skill-8')
assert.equal(prompts.roles.length, 3)
assert.equal(new Set(prompts.roles.map((role) => role.id)).size, prompts.roles.length)
assert.match(prompts.moveGate, /Stockfish bestmove/)

for (const role of prompts.roles) {
  assert.ok(role.systemPrompt.includes('supplied candidate'))
  assert.ok(role.systemPrompt.length > 120)
}

for (const position of positions) {
  assert.doesNotThrow(() => new Chess(position.fen), position.id)
  assert.ok(position.focus.length >= 1, position.id)
}

console.log(`Validated ${prompts.roles.length} council roles and ${positions.length} chess positions.`)
