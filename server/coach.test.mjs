import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildCoachMessages,
  cleanCoachReply,
  validateCoachRequest,
} from './coach.mjs'

const position = {
  fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
  pgn: '1. e4',
  playerMove: 'e4',
  engineMove: 'c5',
  candidates: [
    { move: 'c5', evaluation: '+0.18', continuation: 'c5 Nf3 Nc6' },
    { move: 'e5', evaluation: '+0.10', continuation: 'e5 Nf3' },
  ],
}

test('validates a bounded chess position', () => {
  assert.deepEqual(validateCoachRequest(position), position)
})

test('places supplied Stockfish lines in the coach prompt', () => {
  const messages = buildCoachMessages(position)
  assert.match(messages[0].content, /Stockfish owns move selection/)
  assert.match(messages[1].content, /Stockfish played reply: c5/)
  assert.match(messages[1].content, /c5 \| \+0\.18 \| c5 Nf3 Nc6/)
})

test('rejects duplicated candidate moves', () => {
  assert.throws(
    () => validateCoachRequest({ ...position, candidates: [position.candidates[0], position.candidates[0]] }),
    /must be unique/,
  )
})

test('cleans reasoning wrappers from a coach reply', () => {
  assert.equal(
    cleanCoachReply('<think>private reasoning</think> You claimed the center, so prepare for ...c5.'),
    'You claimed the center, so prepare for ...c5.',
  )
})

test('drops an unfinished tail after the last complete sentence', () => {
  assert.equal(
    cleanCoachReply('You claimed the center with e4. Prepare for c5 by developing the knight. A final thought'),
    'You claimed the center with e4. Prepare for c5 by developing the knight.',
  )
})
