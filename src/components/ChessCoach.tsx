import { BookOpen, RefreshCw } from 'lucide-react'
import type { CoachState } from '../model/ollamaCoach'

type ChessCoachProps = {
  coach: CoachState
  onRetry: () => void
}

function modelLabel(model?: string) {
  if (!model) return 'DeepSeek V4 Flash · Ollama Cloud'
  return `${model.replace(':cloud', '').replaceAll('-', ' ')} · Ollama Cloud`
}

export function ChessCoach({ coach, onRetry }: ChessCoachProps) {
  const working = coach.status === 'loading'
  const canRetry = coach.status === 'ready' || coach.status === 'error'

  return (
    <section
      className={`chess-coach chess-coach--${coach.status}`}
      aria-labelledby="chess-coach-title"
    >
      <div className="chess-coach__heading">
        <span className="chess-coach__mark" aria-hidden="true">
          <BookOpen strokeWidth={1.25} />
        </span>
        <div>
          <h3 id="chess-coach-title">Chess Coach</h3>
          <span>{modelLabel(coach.status === 'ready' ? coach.model : undefined)}</span>
        </div>
        <i className="chess-coach__status" aria-hidden="true" />
      </div>
      <p aria-live="polite" aria-busy={working}>
        {coach.message}
      </p>
      {canRetry ? (
        <button type="button" onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          {coach.status === 'error' ? 'Try again' : 'Read again'}
        </button>
      ) : null}
    </section>
  )
}
