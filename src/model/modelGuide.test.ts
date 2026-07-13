import { describe, expect, it } from 'vitest'
import type { StockfishAnalysis } from '../engine/StockfishClient'
import { buildCouncilReading, MODEL_GUIDES } from './modelGuide'

const fen = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1'

const analysis: StockfishAnalysis = {
  bestMove: 'c7c5',
  ponder: 'g1f3',
  lines: [
    { depth: 11, multipv: 1, scoreCp: 18, mate: null, pv: ['c7c5', 'g1f3'] },
    { depth: 11, multipv: 2, scoreCp: 10, mate: null, pv: ['e7e5', 'g1f3'] },
    { depth: 11, multipv: 3, scoreCp: 4, mate: null, pv: ['g8f6', 'b1c3'] },
  ],
}

describe('model council', () => {
  it('maps every role to a legal engine line', () => {
    const reading = buildCouncilReading(fen, analysis)
    expect(reading.advisers.map((adviser) => adviser.move)).toEqual(['c5', 'e5', 'Nf6'])
    expect(reading.decision).toBe('c5')
  })

  it('keeps every system prompt bounded by supplied candidates', () => {
    expect(MODEL_GUIDES).toHaveLength(3)
    for (const guide of MODEL_GUIDES) {
      expect(guide.systemPrompt).toMatch(/supplied candidate/)
    }
  })
})
