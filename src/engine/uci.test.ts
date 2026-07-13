import { describe, expect, it } from 'vitest'
import { formatEvaluation, parseInfoLine, parseUciMove, sanLineFromPv } from './uci'

describe('UCI parsing', () => {
  it('parses a multipv search line', () => {
    expect(
      parseInfoLine(
        'info depth 11 seldepth 16 multipv 2 score cp 34 nodes 2000 pv c7c5 g1f3 d7d6',
      ),
    ).toEqual({
      depth: 11,
      multipv: 2,
      scoreCp: 34,
      mate: null,
      pv: ['c7c5', 'g1f3', 'd7d6'],
    })
  })

  it('converts UCI moves and principal variations', () => {
    expect(parseUciMove('e7e8q')).toEqual({ from: 'e7', to: 'e8', promotion: 'q' })
    expect(
      sanLineFromPv(
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
        ['c7c5', 'g1f3'],
      ),
    ).toEqual(['c5', 'Nf3'])
  })

  it('normalizes evaluation to White', () => {
    const line = {
      depth: 11,
      multipv: 1,
      scoreCp: 25,
      mate: null,
      pv: ['c7c5'],
    }
    expect(
      formatEvaluation(
        'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
        line,
      ),
    ).toBe('−0.25')
  })
})
