import { ChevronDown, Cross, Eye, Skull, Swords } from 'lucide-react'
import type { CouncilReading, GuideId } from '../model/modelGuide'

type CouncilProps = {
  reading: CouncilReading | null
  activeGuide: GuideId
  onGuideChange: (guide: GuideId) => void
  thinking: boolean
}

const iconByGuide = {
  witness: Eye,
  knight: Swords,
  bishop: Cross,
}

const waitingCopy = {
  witness: 'Waiting to read the first position.',
  knight: 'Forcing lines will appear after your move.',
  bishop: 'Structure and development will appear here.',
}

const purposeByGuide = {
  witness: 'Measures the position',
  knight: 'Finds forcing lines',
  bishop: 'Reads structure and development',
}

export function Council({
  reading,
  activeGuide,
  onGuideChange,
  thinking,
}: CouncilProps) {
  const advisers = reading?.advisers ?? [
    { id: 'witness' as const, name: 'The Witness', move: '—', evaluation: '—', counsel: waitingCopy.witness, continuation: '' },
    { id: 'knight' as const, name: 'The Knight', move: '—', evaluation: '—', counsel: waitingCopy.knight, continuation: '' },
    { id: 'bishop' as const, name: 'The Bishop', move: '—', evaluation: '—', counsel: waitingCopy.bishop, continuation: '' },
  ]

  return (
    <aside className="council" aria-labelledby="council-title">
      <div className="council-heading">
        <h2 id="council-title">The council</h2>
        <div className={`signal ${thinking ? 'signal--active' : ''}`} aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
      </div>

      <div className="adviser-list">
        {advisers.map((adviser) => {
          const Icon = iconByGuide[adviser.id]
          const expanded = Boolean(reading && activeGuide === adviser.id)
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
                <span className="adviser-label">
                  <span className="adviser-name">{adviser.name}</span>
                  <span className="adviser-purpose">{purposeByGuide[adviser.id]}</span>
                </span>
                <span className="adviser-move">{adviser.move}</span>
                <span className="adviser-eval">{adviser.evaluation}</span>
                <ChevronDown className="adviser-chevron" aria-hidden="true" />
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

      <div
        className={`death-decision ${thinking ? 'death-decision--thinking' : ''} ${!reading && !thinking ? 'death-decision--collapsed' : ''}`}
      >
        <div className="death-decision__heading">
          <Skull aria-hidden="true" strokeWidth={1.2} />
          <div>
            <h3>Death considers</h3>
            <span className="death-decision__purpose">Stockfish chooses the reply</span>
          </div>
          {reading || thinking ? (
            <span className="thinking-dots" aria-hidden="true">
              <i />
              <i />
              <i />
              <i />
              <i />
            </span>
          ) : null}
        </div>
        {reading || thinking ? (
          <>
            <strong className="death-decision__move">{reading?.decision ?? '…'}</strong>
            <p>
              {reading?.decisionLine ??
                'Stockfish is searching its candidate lines.'}
            </p>
          </>
        ) : null}
      </div>
    </aside>
  )
}
