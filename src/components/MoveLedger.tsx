import type { Move } from 'chess.js'
import { MODEL_GUIDES } from '../model/modelGuide'

type MoveLedgerProps = {
  history: Move[]
  activeTab: 'moves' | 'method'
  onTabChange: (tab: 'moves' | 'method') => void
}

export function MoveLedger({ history, activeTab, onTabChange }: MoveLedgerProps) {
  const pairs: Array<{ number: number; white?: string; black?: string }> = []
  history.forEach((move, index) => {
    const pairIndex = Math.floor(index / 2)
    pairs[pairIndex] ??= { number: pairIndex + 1 }
    if (move.color === 'w') pairs[pairIndex].white = move.san
    else pairs[pairIndex].black = move.san
  })

  return (
    <section className="ledger" id="method" aria-label="Game record and method">
      <div className="ledger-tabs" role="tablist" aria-label="Game details">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'moves'}
          onClick={() => onTabChange('moves')}
        >
          Moves
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'method'}
          onClick={() => onTabChange('method')}
        >
          Method
        </button>
      </div>

      {activeTab === 'moves' ? (
        <div className="move-record" role="tabpanel">
          {pairs.length ? (
            <ol>
              {pairs.map((pair) => (
                <li key={pair.number}>
                  <span>{pair.number}.</span>
                  <strong>{pair.white}</strong>
                  <strong className="black-move">{pair.black}</strong>
                </li>
              ))}
            </ol>
          ) : (
            <p>Move a white piece to begin.</p>
          )}
        </div>
      ) : (
        <div className="method-copy" role="tabpanel">
          <p>
            Stockfish 18 owns the legal move and runs at UCI Skill Level 8. Its
            three principal variations become bounded briefs for the advisers and
            Chess Coach. DeepSeek explains the position, while engine output
            alone changes the board.
          </p>
          <ul>
            {MODEL_GUIDES.map((guide) => (
              <li key={guide.id}>
                <strong>{guide.name}</strong>
                <span>{guide.brief}</span>
              </li>
            ))}
            <li>
              <strong>Chess Coach</strong>
              <span>Turns supplied engine lines into a practical plan for your next turn.</span>
            </li>
          </ul>
        </div>
      )}
    </section>
  )
}
