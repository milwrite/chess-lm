import { Chess } from 'chess.js'

export const DEFAULT_MODEL = 'deepseek-v4-flash:cloud'

export class CoachInputError extends Error {
  constructor(message) {
    super(message)
    this.name = 'CoachInputError'
  }
}

function requiredString(value, label, maxLength) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new CoachInputError(`${label} is required.`)
  }

  const trimmed = value.trim()
  if (trimmed.length > maxLength) {
    throw new CoachInputError(`${label} is too long.`)
  }
  return trimmed
}

export function validateCoachRequest(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new CoachInputError('A chess position is required.')
  }

  const fen = requiredString(input.fen, 'FEN', 120)
  try {
    new Chess(fen)
  } catch {
    throw new CoachInputError('FEN must describe a legal chess position.')
  }

  const pgn = typeof input.pgn === 'string' ? input.pgn.trim().slice(0, 2_000) : ''
  const playerMove = requiredString(input.playerMove, 'Player move', 24)

  if (!Array.isArray(input.candidates) || input.candidates.length < 1 || input.candidates.length > 3) {
    throw new CoachInputError('One to three Stockfish candidates are required.')
  }

  const candidates = input.candidates.map((candidate, index) => {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
      throw new CoachInputError(`Candidate ${index + 1} is invalid.`)
    }

    return {
      move: requiredString(candidate.move, `Candidate ${index + 1} move`, 24),
      evaluation: requiredString(candidate.evaluation, `Candidate ${index + 1} evaluation`, 16),
      continuation: requiredString(candidate.continuation, `Candidate ${index + 1} continuation`, 160),
    }
  })

  if (new Set(candidates.map((candidate) => candidate.move)).size !== candidates.length) {
    throw new CoachInputError('Stockfish candidate moves must be unique.')
  }

  const engineMove =
    typeof input.engineMove === 'string' && input.engineMove.trim()
      ? requiredString(input.engineMove, 'Stockfish reply', 24)
      : candidates[0].move

  return { fen, pgn, playerMove, engineMove, candidates }
}

export function buildCoachMessages(position) {
  const candidateText = position.candidates
    .map(
      (candidate, index) =>
        `${index + 1}. ${candidate.move} | ${candidate.evaluation} | ${candidate.continuation}`,
    )
    .join('\n')

  return [
    {
      role: 'system',
      content:
        "You are Chess Coach for a player facing Stockfish 18 at UCI Skill Level 8. Stockfish owns move selection. The FEN is the current position after Stockfish's reply. In sentence one, explain what the player's move changed and how Stockfish's played reply answers it. In sentence two, give one practical plan. Use candidate lines only when the played reply matches one of them, and omit them otherwise. Mention the played reply exactly as written. Write exactly two connected sentences, 35 to 70 words, in plain text and address the player as 'you'.",
    },
    {
      role: 'user',
      content: [
        `Current FEN after Stockfish's reply: ${position.fen}`,
        `Recent PGN: ${position.pgn || '(first move)'}`,
        `Player move: ${position.playerMove}`,
        `Stockfish played reply: ${position.engineMove}`,
        'Stockfish candidate lines from before its reply (move | evaluation for White | continuation):',
        candidateText,
      ].join('\n'),
    },
  ]
}

export function cleanCoachReply(value) {
  if (typeof value !== 'string') throw new Error('Ollama returned an empty coaching reply.')
  const cleaned = value
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^['"]|['"]$/g, '')

  if (cleaned.length < 20) throw new Error('Ollama returned an incomplete coaching reply.')
  const bounded = cleaned.slice(0, 1_000)
  const lastPunctuation = Math.max(
    bounded.lastIndexOf('.'),
    bounded.lastIndexOf('!'),
    bounded.lastIndexOf('?'),
  )
  return lastPunctuation >= 20 ? bounded.slice(0, lastPunctuation + 1) : bounded
}

export async function requestOllamaCoach(
  position,
  {
    apiKey,
    model = DEFAULT_MODEL,
    fetchImpl = fetch,
    signal,
  } = {},
) {
  if (!apiKey) throw new Error('OLLAMA_API_KEY is required by the coach service.')

  const response = await fetchImpl('https://ollama.com/api/chat', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages: buildCoachMessages(position),
      stream: false,
      think: false,
      options: {
        temperature: 0.2,
        num_predict: 180,
      },
    }),
    signal,
  })

  if (!response.ok) {
    const message =
      response.status === 429
        ? 'Ollama Cloud is busy. Try the coach again in a moment.'
        : 'Ollama Cloud could not complete this coaching request.'
    throw new Error(message)
  }

  const result = await response.json()
  return {
    coach: cleanCoachReply(result?.message?.content),
    model: typeof result?.model === 'string' ? result.model : model,
  }
}
