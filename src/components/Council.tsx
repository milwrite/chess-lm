import { Activity, BrainCircuit, Cpu, ScanSearch, Swords } from 'lucide-react'
import type { CouncilReading, GuideId } from '../model/modelGuide'
import type { CoachState } from '../model/ollamaCoach'
import { ChessCoach } from './ChessCoach'

type CouncilProps = {
  reading: CouncilReading | null
  coach: CoachState
  activeGuide: GuideId
  onGuideChange: (guide: GuideId) => void
  onCoachRetry: () => void
  thinking: boolean
}

const iconByGuide = {
  witness: ScanSearch,
  knight: Swords,
  bishop: Activity,
}

const labelByGuide = {
  witness: 'Evaluation',
  knight: 'Tactics',
  bishop: 'Position',
}

const waitingCopy = {
  witness: 'Waiting to read the first position.',
  knight: 'Forcing lines will appear after your move.',
  bishop: 'Structure and development will appear here.',
}

export function Council({
  reading,
  coach,
  activeGuide,
  onGuideChange,
  onCoachRetry,
  thinking,
}: CouncilProps) {
  const advisers = reading?.advisers ?? [
    { id: 'witness' as const, name: 'The Witness', move: '—', evaluation: '—', counsel: waitingCopy.witness, continuation: '' },
    { id: 'knight' as const, name: 'The Knight', move: '—', evaluation: '—', counsel: waitingCopy.knight, continuation: '' },
    { id: 'bishop' as const, name: 'The Bishop', move: '—', evaluation: '—', counsel: waitingCopy.bishop, continuation: '' },
  ]

  return (
    <aside className="council" aria-labelledby="council-title">
      <ChessCoach coach={coach} onRetry={onCoachRetry} />

      <div className="council-heading">
        <BrainCircuit aria-hidden="true" />
        <h2 id="council-title">Analysis</h2>
      </div>

      <div className="adviser-list">
        {advisers.map((adviser) => {
          const Icon = iconByGuide[adviser.id]
          const expanded = activeGuide === adviser.id
          return (
            <article
              className={`adviser ${expanded ? 'adviser--expanded' : ''}`}
              key={adviser.id}
            >
              <button
                className="adviser-heading"
                type="button"
                aria-expanded={expanded}
                onClick={() => onGuideChange(adviser.id)}
              >
                <span className="adviser-icon" aria-hidden="true">
                  <Icon strokeWidth={1.25} />
                </span>
                <span className="adviser-name">{labelByGuide[adviser.id]}</span>
                <span className="adviser-move">{adviser.move}</span>
                <span className="adviser-eval">{adviser.evaluation}</span>
              </button>
              <p className="adviser-copy">{adviser.counsel}</p>
              {adviser.continuation ? (
                <p className="adviser-line" aria-label="Principal variation">
                  {adviser.continuation}
                </p>
              ) : null}
            </article>
          )
        })}
      </div>

      <div className={`death-decision ${thinking ? 'death-decision--thinking' : ''}`}>
        <div className="death-decision__heading">
          <Cpu aria-hidden="true" strokeWidth={1.5} />
          <h3>Engine move</h3>
        </div>
        <strong className="death-decision__move">{reading?.decision ?? '…'}</strong>
        <p>
          {reading?.decisionLine ??
            'Move first. Stockfish will search, and the analysis will update from its candidate lines.'}
        </p>
      </div>

    </aside>
  )
}
