import { parseInfoLine, type EngineLine } from './uci'

export type StockfishAnalysis = {
  bestMove: string
  ponder: string | null
  lines: EngineLine[]
}

type PendingAnalysis = {
  lines: Map<number, EngineLine>
  resolve: (analysis: StockfishAnalysis) => void
  reject: (error: Error) => void
  timeout: number
}

export class StockfishClient {
  private worker: Worker
  private readyPromise: Promise<void>
  private markReady!: () => void
  private markFailed!: (error: Error) => void
  private pending: PendingAnalysis | null = null
  private isReady = false

  constructor(baseUrl: string) {
    const engineUrl = `${baseUrl}engine/stockfish-18-lite-single.js`
    this.worker = new Worker(engineUrl)
    this.readyPromise = new Promise((resolve, reject) => {
      this.markReady = resolve
      this.markFailed = reject
    })

    this.worker.addEventListener('message', this.handleMessage)
    this.worker.addEventListener('error', this.handleError)
    this.worker.postMessage('uci')
  }

  ready() {
    return this.readyPromise
  }

  async analyze(fen: string, depth = 11): Promise<StockfishAnalysis> {
    await this.ready()

    if (this.pending) {
      this.worker.postMessage('stop')
      window.clearTimeout(this.pending.timeout)
      this.pending.reject(new Error('Engine search replaced by a newer position.'))
      this.pending = null
    }

    return new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        this.worker.postMessage('stop')
        this.pending = null
        reject(new Error('Stockfish took too long to answer.'))
      }, 15_000)

      this.pending = {
        lines: new Map(),
        resolve,
        reject,
        timeout,
      }

      this.worker.postMessage(`position fen ${fen}`)
      this.worker.postMessage(`go depth ${depth}`)
    })
  }

  terminate() {
    if (this.pending) {
      window.clearTimeout(this.pending.timeout)
      this.pending.reject(new Error('Engine stopped.'))
      this.pending = null
    }
    this.worker.postMessage('quit')
    this.worker.terminate()
  }

  private handleMessage = (event: MessageEvent) => {
    if (typeof event.data !== 'string') return
    const line = event.data.trim()

    if (line === 'uciok') {
      this.worker.postMessage('setoption name Skill Level value 8')
      this.worker.postMessage('setoption name MultiPV value 3')
      this.worker.postMessage('setoption name Hash value 32')
      this.worker.postMessage('setoption name Ponder value false')
      this.worker.postMessage('isready')
      return
    }

    if (line === 'readyok' && !this.isReady) {
      this.isReady = true
      this.markReady()
      return
    }

    if (!this.pending) return

    const parsed = parseInfoLine(line)
    if (parsed) {
      const previous = this.pending.lines.get(parsed.multipv)
      if (!previous || parsed.depth >= previous.depth) {
        this.pending.lines.set(parsed.multipv, parsed)
      }
      return
    }

    if (line.startsWith('bestmove ')) {
      const [, bestMove, ponderLabel, ponderMove] = line.split(/\s+/)
      const pending = this.pending
      this.pending = null
      window.clearTimeout(pending.timeout)
      pending.resolve({
        bestMove,
        ponder: ponderLabel === 'ponder' ? ponderMove : null,
        lines: [...pending.lines.values()].sort((a, b) => a.multipv - b.multipv),
      })
    }
  }

  private handleError = () => {
    const error = new Error('Stockfish could not load in this browser.')
    if (!this.isReady) this.markFailed(error)
    if (this.pending) {
      window.clearTimeout(this.pending.timeout)
      this.pending.reject(error)
      this.pending = null
    }
  }
}
