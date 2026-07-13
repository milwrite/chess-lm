import { Chess } from 'chess.js'

export type EngineLine = {
  depth: number
  multipv: number
  scoreCp: number | null
  mate: number | null
  pv: string[]
}

export type ParsedEngineInfo = EngineLine | null

export function parseInfoLine(line: string): ParsedEngineInfo {
  if (!line.startsWith('info ') || !line.includes(' pv ')) return null

  const depth = Number(line.match(/\bdepth\s+(\d+)/)?.[1] ?? 0)
  const multipv = Number(line.match(/\bmultipv\s+(\d+)/)?.[1] ?? 1)
  const score = line.match(/\bscore\s+(cp|mate)\s+(-?\d+)/)
  const pvText = line.split(' pv ')[1]?.trim()

  if (!pvText) return null

  return {
    depth,
    multipv,
    scoreCp: score?.[1] === 'cp' ? Number(score[2]) : null,
    mate: score?.[1] === 'mate' ? Number(score[2]) : null,
    pv: pvText.split(/\s+/),
  }
}

export function parseUciMove(uci: string) {
  return {
    from: uci.slice(0, 2),
    to: uci.slice(2, 4),
    promotion: uci.length > 4 ? uci.slice(4, 5) : undefined,
  }
}

export function sanLineFromPv(fen: string, pv: string[], length = 4) {
  const game = new Chess(fen)
  const san: string[] = []

  for (const uci of pv.slice(0, length)) {
    try {
      const move = game.move(parseUciMove(uci))
      if (!move) break
      san.push(move.san)
    } catch {
      break
    }
  }

  return san
}

export function formatEvaluation(fen: string, line: EngineLine) {
  const sideToMove = fen.split(' ')[1]

  if (line.mate !== null) {
    const mateForWhite = sideToMove === 'b' ? -line.mate : line.mate
    return mateForWhite > 0 ? `M${mateForWhite}` : `−M${Math.abs(mateForWhite)}`
  }

  const raw = line.scoreCp ?? 0
  const whiteScore = sideToMove === 'b' ? -raw : raw
  const pawns = whiteScore / 100
  return `${pawns >= 0 ? '+' : '−'}${Math.abs(pawns).toFixed(2)}`
}
