import { CircleUserRound, Skull } from 'lucide-react'

type PlayerBarProps = {
  side: 'death' | 'player'
  status?: string
}

export function PlayerBar({ side, status }: PlayerBarProps) {
  const isDeath = side === 'death'
  const Icon = isDeath ? Skull : CircleUserRound

  return (
    <div className={`player-bar player-bar--${side}`}>
      <div className="player-avatar" aria-hidden="true">
        <Icon strokeWidth={1.35} />
      </div>
      <div className="player-copy">
        <strong>{isDeath ? 'Death' : 'You'}</strong>
        <span>{isDeath ? 'Stockfish · Level 8' : 'White'}</span>
      </div>
      {status ? (
        <div className="turn-status" role="status" aria-live="polite">
          <span className="turn-status__dot" />
          {status}
        </div>
      ) : null}
    </div>
  )
}
