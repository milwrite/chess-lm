export type CoachCandidate = {
  move: string
  evaluation: string
  continuation: string
}

export type CoachRequest = {
  fen: string
  pgn: string
  playerMove: string
  candidates: CoachCandidate[]
}

export type CoachReading = {
  coach: string
  model: string
  provider: 'ollama-cloud'
  cached: boolean
}

export type CoachState =
  | { status: 'idle'; message: string }
  | { status: 'loading'; message: string }
  | { status: 'ready'; message: string; model: string; cached: boolean }
  | { status: 'error'; message: string }

const endpoint = import.meta.env.VITE_COACH_API_URL?.replace(/\/$/, '')

export const INITIAL_COACH_STATE: CoachState = {
  status: 'idle',
  message: 'Complete a move, and the coach will read Stockfish’s reply lines.',
}

export async function requestCoach(
  position: CoachRequest,
  signal?: AbortSignal,
): Promise<CoachReading> {
  if (!endpoint) throw new Error('The Ollama coach service is being prepared.')

  const response = await fetch(`${endpoint}/api/coach`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(position),
    signal,
  })

  const result = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(
      typeof result.error === 'string'
        ? result.error
        : 'The Ollama coach could not read this position.',
    )
  }

  if (
    typeof result.coach !== 'string' ||
    typeof result.model !== 'string' ||
    result.provider !== 'ollama-cloud'
  ) {
    throw new Error('The Ollama coach returned an incomplete reply.')
  }

  return {
    coach: result.coach,
    model: result.model,
    provider: 'ollama-cloud',
    cached: Boolean(result.cached),
  }
}
