import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Chess, type Move, type Square } from 'chess.js'
import { Chessboard, type ChessboardOptions } from 'react-chessboard'
import {
  FlipHorizontal2,
  Plus,
  RotateCcw,
  Undo2,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { BrandMark } from './components/BrandMark'
import { ChessCoach } from './components/ChessCoach'
import { Council } from './components/Council'
import { MoveLedger } from './components/MoveLedger'
import { PlayerBar } from './components/PlayerBar'
import { StockfishClient } from './engine/StockfishClient'
import { parseUciMove } from './engine/uci'
import {
  buildCouncilReading,
  type CouncilReading,
  type GuideId,
} from './model/modelGuide'
import {
  INITIAL_COACH_STATE,
  requestCoach,
  type CoachRequest,
  type CoachState,
} from './model/ollamaCoach'
import './App.css'

type EngineState = 'loading' | 'ready' | 'error'

function gameStatus(game: Chess, thinking: boolean, engineState: EngineState) {
  if (engineState === 'loading') return 'Engine loading'
  if (engineState === 'error') return 'Engine unavailable'
  if (game.isCheckmate()) return game.turn() === 'w' ? 'Death wins' : 'You win'
  if (game.isDraw()) return 'Draw'
  if (game.isCheck()) return thinking ? 'Death considers' : 'Check'
  return thinking ? 'Death considers' : 'Your move'
}

function App() {
  const gameRef = useRef(new Chess())
  const engineRef = useRef<StockfishClient | null>(null)
  const searchIdRef = useRef(0)
  const audioRef = useRef<AudioContext | null>(null)
  const coachAbortRef = useRef<AbortController | null>(null)
  const lastCoachRequestRef = useRef<CoachRequest | null>(null)
  const [fen, setFen] = useState(gameRef.current.fen())
  const [history, setHistory] = useState<Move[]>([])
  const [orientation, setOrientation] = useState<'white' | 'black'>('white')
  const [lastMove, setLastMove] = useState<[string, string] | null>(null)
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [legalSquares, setLegalSquares] = useState<string[]>([])
  const [thinking, setThinking] = useState(false)
  const [engineState, setEngineState] = useState<EngineState>('loading')
  const [engineError, setEngineError] = useState('')
  const [council, setCouncil] = useState<CouncilReading | null>(null)
  const [coach, setCoach] = useState<CoachState>(INITIAL_COACH_STATE)
  const [activeGuide, setActiveGuide] = useState<GuideId>('witness')
  const [activeTab, setActiveTab] = useState<'moves' | 'method'>('moves')
  const [soundOn, setSoundOn] = useState(true)

  useEffect(() => {
    const engine = new StockfishClient(import.meta.env.BASE_URL)
    engineRef.current = engine
    engine
      .ready()
      .then(() => setEngineState('ready'))
      .catch((error: Error) => {
        setEngineState('error')
        setEngineError(error.message)
      })

    return () => {
      searchIdRef.current += 1
      coachAbortRef.current?.abort()
      engine.terminate()
      engineRef.current = null
    }
  }, [])

  const runCoach = useCallback(async (position: CoachRequest) => {
    coachAbortRef.current?.abort()
    const controller = new AbortController()
    coachAbortRef.current = controller
    lastCoachRequestRef.current = position
    setCoach({
      status: 'loading',
      message: 'DeepSeek is reading the position and Stockfish lines.',
    })

    try {
      const result = await requestCoach(position, controller.signal)
      if (coachAbortRef.current !== controller) return
      setCoach({
        status: 'ready',
        message: result.coach,
        model: result.model,
        cached: result.cached,
      })
    } catch (error) {
      if (controller.signal.aborted || coachAbortRef.current !== controller) return
      setCoach({
        status: 'error',
        message: error instanceof Error ? error.message : 'Chess Coach paused unexpectedly.',
      })
    }
  }, [])

  const retryCoach = useCallback(() => {
    if (lastCoachRequestRef.current) void runCoach(lastCoachRequestRef.current)
  }, [runCoach])

  const clearCoach = useCallback(() => {
    coachAbortRef.current?.abort()
    coachAbortRef.current = null
    lastCoachRequestRef.current = null
    setCoach(INITIAL_COACH_STATE)
  }, [])

  const syncGame = useCallback(() => {
    const game = gameRef.current
    setFen(game.fen())
    setHistory(game.history({ verbose: true }))
    try {
      window.localStorage.setItem('chess-lm-pgn', game.pgn())
    } catch {
      // The game remains playable when storage is unavailable.
    }
  }, [])

  const playMoveSound = useCallback(() => {
    if (!soundOn) return
    const AudioContextClass = window.AudioContext
    const context = audioRef.current ?? new AudioContextClass()
    audioRef.current = context
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(164, context.currentTime)
    gain.gain.setValueAtTime(0.0001, context.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.045, context.currentTime + 0.01)
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.12)
    oscillator.connect(gain)
    gain.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.13)
  }, [soundOn])

  const askDeathToMove = useCallback(async () => {
    const game = gameRef.current
    const engine = engineRef.current
    if (!engine || game.isGameOver() || game.turn() !== 'b') return

    const positionBeforeSearch = game.fen()
    const playerMove = game.history({ verbose: true }).at(-1)?.san ?? '—'
    const searchId = ++searchIdRef.current
    setThinking(true)
    setSelectedSquare(null)
    setLegalSquares([])

    try {
      const analysis = await engine.analyze(positionBeforeSearch)
      if (searchId !== searchIdRef.current) return

      const reading = buildCouncilReading(positionBeforeSearch, analysis)
      setCouncil(reading)
      setActiveGuide('witness')

      await new Promise((resolve) => window.setTimeout(resolve, 460))
      if (searchId !== searchIdRef.current) return

      const move = game.move(parseUciMove(analysis.bestMove))
      if (!move) throw new Error('Stockfish returned a move the board could not apply.')

      setLastMove([move.from, move.to])
      playMoveSound()
      syncGame()
      setEngineError('')
      void runCoach({
        fen: game.fen(),
        pgn: game.pgn(),
        playerMove,
        engineMove: move.san,
        candidates: reading.advisers.map(({ move: candidate, evaluation, continuation }) => ({
          move: candidate,
          evaluation,
          continuation,
        })),
      })
    } catch (error) {
      if (searchId !== searchIdRef.current) return
      setEngineState('error')
      setEngineError(error instanceof Error ? error.message : 'The engine stopped unexpectedly.')
    } finally {
      if (searchId === searchIdRef.current) setThinking(false)
    }
  }, [playMoveSound, runCoach, syncGame])

  const commitPlayerMove = useCallback(
    (source: string, target: string) => {
      const game = gameRef.current
      if (
        engineState !== 'ready' ||
        thinking ||
        game.isGameOver() ||
        game.turn() !== 'w'
      ) {
        return false
      }

      try {
        const move = game.move({
          from: source,
          to: target,
          promotion: 'q',
        })
        if (!move) return false
        setLastMove([move.from, move.to])
        setSelectedSquare(null)
        setLegalSquares([])
        playMoveSound()
        syncGame()
        window.setTimeout(() => void askDeathToMove(), 180)
        return true
      } catch {
        return false
      }
    },
    [askDeathToMove, engineState, playMoveSound, syncGame, thinking],
  )

  const chooseSquare = useCallback(
    (square: string) => {
      if (thinking || engineState !== 'ready') return
      const game = gameRef.current

      if (selectedSquare && legalSquares.includes(square)) {
        commitPlayerMove(selectedSquare, square)
        return
      }

      const piece = game.get(square as Square)
      if (!piece || piece.color !== 'w' || game.turn() !== 'w') {
        setSelectedSquare(null)
        setLegalSquares([])
        return
      }

      const moves = game.moves({ square: square as Square, verbose: true })
      setSelectedSquare(square)
      setLegalSquares(moves.map((move) => move.to))
    },
    [commitPlayerMove, engineState, legalSquares, selectedSquare, thinking],
  )

  const resetGame = useCallback(() => {
    searchIdRef.current += 1
    gameRef.current.reset()
    setCouncil(null)
    clearCoach()
    setLastMove(null)
    setSelectedSquare(null)
    setLegalSquares([])
    setThinking(false)
    setEngineError('')
    if (engineRef.current) setEngineState('ready')
    syncGame()
  }, [clearCoach, syncGame])

  const undoTurn = useCallback(() => {
    if (thinking) return
    searchIdRef.current += 1
    const game = gameRef.current
    if (!game.history().length) return
    game.undo()
    if (game.turn() === 'b' && game.history().length) game.undo()
    setLastMove(null)
    setCouncil(null)
    clearCoach()
    setSelectedSquare(null)
    setLegalSquares([])
    syncGame()
  }, [clearCoach, syncGame, thinking])

  const squareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {}
    lastMove?.forEach((square) => {
      styles[square] = {
        boxShadow: 'inset 0 0 0 3px rgba(129, 45, 42, .82)',
      }
    })
    if (selectedSquare) {
      styles[selectedSquare] = {
        ...styles[selectedSquare],
        boxShadow: 'inset 0 0 0 4px #91342f',
      }
    }
    legalSquares.forEach((square) => {
      styles[square] = {
        ...styles[square],
        backgroundImage:
          'radial-gradient(circle, rgba(119, 38, 35, .86) 0 13%, transparent 15%)',
      }
    })
    return styles
  }, [lastMove, legalSquares, selectedSquare])

  const boardOptions = useMemo<ChessboardOptions>(
    () => ({
      id: 'seventh-seal-board',
      position: fen,
      boardOrientation: orientation,
      onPieceDrop: ({ sourceSquare, targetSquare }) =>
        targetSquare ? commitPlayerMove(sourceSquare, targetSquare) : false,
      onPieceClick: ({ square }) => {
        if (square) chooseSquare(square)
      },
      onSquareClick: ({ square }) => chooseSquare(square),
      canDragPiece: ({ piece }) =>
        engineState === 'ready' &&
        !thinking &&
        gameRef.current.turn() === 'w' &&
        piece.pieceType.startsWith('w'),
      squareStyles,
      allowDrawingArrows: true,
      animationDurationInMs: 230,
      boardStyle: {
        borderRadius: 0,
        boxShadow: '0 18px 48px rgba(0, 0, 0, .48)',
      },
      lightSquareStyle: { backgroundColor: '#d4d0c5' },
      darkSquareStyle: { backgroundColor: '#272a29' },
      lightSquareNotationStyle: {
        color: '#272a29',
        fontFamily: 'var(--ui-font)',
        fontSize: 11,
        fontWeight: 700,
      },
      darkSquareNotationStyle: {
        color: '#d4d0c5',
        fontFamily: 'var(--ui-font)',
        fontSize: 11,
        fontWeight: 700,
      },
    }),
    [chooseSquare, commitPlayerMove, engineState, fen, orientation, squareStyles, thinking],
  )

  const status = gameStatus(gameRef.current, thinking, engineState)
  const shoreline = `${import.meta.env.BASE_URL}assets/shoreline.webp`

  return (
    <div className="app-shell">
      <div
        className="shoreline-scene"
        style={{ backgroundImage: `url(${shoreline})` }}
        aria-hidden="true"
      />
      <header className="site-header">
        <a className="brand" href="#game" aria-label="Chess LM home">
          <BrandMark />
          <span>Chess / LM</span>
        </a>
        <p>Play the position. Read the machine.</p>
        <a className="header-source" href="https://github.com/milwrite/chess-lm">
          Source
        </a>
      </header>

      <main id="game" className="game-shell">
        <section
          className="board-column"
          aria-label="Chess board"
          style={{ backgroundImage: `linear-gradient(rgba(9, 11, 11, 0.84), rgba(9, 11, 11, 0.94)), url(${shoreline})` }}
        >
          <PlayerBar side="death" />
          <div className="board-frame">
            <Chessboard options={boardOptions} />
          </div>
          <PlayerBar side="player" status={status} />

          <div className="game-controls" aria-label="Game controls">
            <button className="control control--primary" type="button" onClick={resetGame}>
              <Plus aria-hidden="true" />
              New game
            </button>
            <button
              className="control"
              type="button"
              onClick={undoTurn}
              disabled={thinking || history.length === 0}
            >
              <Undo2 aria-hidden="true" />
              Undo
            </button>
            <button
              className="control"
              type="button"
              onClick={() => setOrientation((current) => (current === 'white' ? 'black' : 'white'))}
            >
              <FlipHorizontal2 aria-hidden="true" />
              Flip board
            </button>
            <button className="control control--sound" type="button" onClick={() => setSoundOn((value) => !value)}>
              {soundOn ? <Volume2 aria-hidden="true" /> : <VolumeX aria-hidden="true" />}
              Sound
            </button>
          </div>
          {engineError ? (
            <div className="engine-error" role="alert">
              <span>{engineError}</span>
              <button type="button" onClick={() => window.location.reload()}>
                <RotateCcw aria-hidden="true" />
                Reload engine
              </button>
            </div>
          ) : null}
        </section>

        <section className="coach-strip" aria-label="Chess Coach">
          <ChessCoach coach={coach} onRetry={retryCoach} />
        </section>

        <Council
          reading={council}
          activeGuide={activeGuide}
          onGuideChange={setActiveGuide}
          thinking={thinking}
        />

        <MoveLedger history={history} activeTab={activeTab} onTabChange={setActiveTab} />
      </main>

      <footer className="site-footer">
        <button type="button" onClick={() => setActiveTab('method')}>
          How it works
        </button>
        <span aria-hidden="true" />
        <a href="https://github.com/milwrite/chess-lm/blob/main/model/README.md">Model guide</a>
        <span aria-hidden="true" />
        <a href="https://github.com/milwrite/chess-lm">Source</a>
      </footer>
    </div>
  )
}

export default App
