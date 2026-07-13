import type { StockfishAnalysis } from '../engine/StockfishClient'
import { formatEvaluation, sanLineFromPv } from '../engine/uci'

export type GuideId = 'witness' | 'knight' | 'bishop'

export type ModelGuide = {
  id: GuideId
  name: string
  brief: string
  systemPrompt: string
}

export type CouncilAdvice = {
  id: GuideId
  name: string
  move: string
  evaluation: string
  continuation: string
  counsel: string
}

export type CouncilReading = {
  advisers: CouncilAdvice[]
  decision: string
  decisionLine: string
}

export const MODEL_GUIDES: ModelGuide[] = [
  {
    id: 'witness',
    name: 'The Witness',
    brief: 'Reads the position before judging it.',
    systemPrompt:
      'You are The Witness, a chess observer. Receive a FEN, legal Stockfish candidates, evaluations, and principal variations. Describe material, king safety, and the immediate threat in one restrained sentence. Recommend only a supplied candidate and preserve its notation. Never invent a move or claim certainty beyond the engine line.',
  },
  {
    id: 'knight',
    name: 'The Knight',
    brief: 'Tests forcing moves and tactical pressure.',
    systemPrompt:
      'You are The Knight, a tactical chess adviser. Receive a FEN and legal candidates produced by Stockfish at UCI Skill Level 8. Compare checks, captures, threats, and tempo in one restrained sentence. Choose only from the supplied candidates, quote its principal variation faithfully, and never alter the engine move.',
  },
  {
    id: 'bishop',
    name: 'The Bishop',
    brief: 'Examines structure, space, and development.',
    systemPrompt:
      'You are The Bishop, a strategic chess adviser. Receive a FEN and legal Stockfish candidates with evaluations and principal variations. Explain pawn structure, development, weak squares, or long-term piece activity in one restrained sentence. Recommend only a supplied candidate and never substitute an unverified move.',
  },
]

const counselByRole: Record<GuideId, (line: string, evaluation: string) => string> = {
  witness: (line, evaluation) =>
    `Records ${line} and keeps the position measured at ${evaluation} from White’s side.`,
  knight: (line) =>
    `Tests the forcing sequence ${line}, looking first for tempo, captures, and exposed kings.`,
  bishop: (line) =>
    `Favors ${line} for the way it develops the position and preserves useful squares.`,
}

export function buildCouncilReading(
  fen: string,
  analysis: StockfishAnalysis,
): CouncilReading {
  const usableLines = analysis.lines.filter((line) => line.pv.length > 0)
  const fallback = usableLines[0]

  const advisers = MODEL_GUIDES.map((guide, index) => {
    const line = usableLines[index] ?? fallback
    const san = line ? sanLineFromPv(fen, line.pv) : []
    const continuation = san.length ? san.join(' ') : analysis.bestMove
    const move = san[0] ?? analysis.bestMove
    const evaluation = line ? formatEvaluation(fen, line) : '—'

    return {
      id: guide.id,
      name: guide.name,
      move,
      evaluation,
      continuation,
      counsel: counselByRole[guide.id](continuation, evaluation),
    }
  })

  return {
    advisers,
    decision: sanLineFromPv(fen, [analysis.bestMove], 1)[0] ?? analysis.bestMove,
    decisionLine:
      'The engine makes the move. The council explains the pressure without changing the board.',
  }
}
