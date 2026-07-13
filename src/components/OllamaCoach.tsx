import { Cloud, RefreshCw } from 'lucide-react'
import type { CoachState } from '../model/ollamaCoach'

type OllamaCoachProps = {
  coach: CoachState
  onRetry: () => void
}

function modelLabel(model?: string) {
  if (!model) return 'DeepSeek V4 Flash · Ollama Cloud'
  return `${model.replace(':cloud', '').replaceAll('-', ' ')} · Ollama Cloud`
}

export function OllamaCoach({ coach, onRetry }: OllamaCoachProps) {
  const working = coach.status === 'loading'
  const canRetry = coach.status === 'ready' || coach.status === 'error'

  return (
    <section className={`ollama-coach ollama-coach--${coach.status}`} aria-labelledby="ollama-coach-title">
      <div className="ollama-coach__heading">
        <Cloud aria-hidden="true" strokeWidth={1.35} />
        <div>
          <h3 id="ollama-coach-title">Ollama coach</h3>
          <span>{modelLabel(coach.status === 'ready' ? coach.model : undefined)}</span>
        </div>
        <i className="ollama-coach__status" aria-hidden="true" />
      </div>
      <p aria-live="polite" aria-busy={working}>{coach.message}</p>
      {canRetry ? (
        <button type="button" onClick={onRetry}>
          <RefreshCw aria-hidden="true" />
          {coach.status === 'error' ? 'Try again' : 'Read again'}
        </button>
      ) : null}
    </section>
  )
}
