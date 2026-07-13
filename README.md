# Chess / LM

A responsive chess game set on a spare, monochrome shore. You play White against Stockfish at UCI Skill Level 8 while three constrained model roles read the engine's legal candidate lines from different strategic angles.

**Live game:** [milwrite.github.io/chess-lm](https://milwrite.github.io/chess-lm/)

## What is here

- A legal, draggable, click-to-move board powered by `chess.js` and `react-chessboard`.
- Stockfish 18 Lite in a dedicated browser worker, configured with `Skill Level 8` and three principal variations.
- New game, undo, board flip, sound, move history, check and game-over states, and promotion.
- A responsive council that turns Stockfish evidence into brief positional, tactical, and structural guidance.
- Chess Coach uses `deepseek-v4-flash:cloud` through Ollama Cloud to explain what your move changed and how to meet Stockfish’s candidate replies.
- Desktop and mobile layouts shaped from original interface concepts and an original shoreline image.
- A GitHub Pages release workflow that tests, lints, builds, and deploys every push to `main`.

## Model guidance set

[`model/council-prompts.json`](model/council-prompts.json) defines The Witness, The Knight, and The Bishop. Each role receives the current FEN plus three legal Stockfish candidates and must select one candidate in a one-sentence response. Stockfish `bestmove` remains the move played on the board.

[`model/evals/positions.json`](model/evals/positions.json) supplies six legal evaluation positions. The validation script checks FEN legality, prompt structure, role identifiers, and the candidate-move gate. The browser uses a deterministic local renderer today, while [`model/README.md`](model/README.md) describes a provider-neutral server adapter for future language-model calls.

The chess game and Stockfish engine run in the browser. A small server route sends bounded position data to Ollama Cloud, while the Ollama credential stays in Railway and outside the public bundle. The coach explains supplied lines, and Stockfish remains responsible for every move played by Death.

## Chess Coach

The browser sends the current FEN, recent PGN, player move, Stockfish reply, and three legal Stockfish candidates to `POST /api/coach`. The server validates the position, limits request frequency, caches repeated positions briefly, and calls `deepseek-v4-flash:cloud` in direct response mode. Stockfish has already played its move and calculated the comparison lines, so the language model can concentrate on a concise explanation. The response contains plain coaching prose plus the model name; the browser receives no provider credential.

Current chess-language research supports this division of labor. ChessArena reports that general language models still fall below a modest chess engine, while its chess-tuned Qwen3-8B improves sharply. ChessQA places DeepSeek and Qwen families among strong open models for chess understanding. Chess / LM therefore uses the language model for explanation and retains Stockfish for legal move selection.

## Run locally

```bash
npm install
npm run dev
```

Run the coach service in another terminal:

```bash
cp .env.example .env.local
set -a; source .env.local; set +a
npm start
```

Add `OLLAMA_API_KEY` to `.env.local` before starting the server. The example file contains variable names and public defaults only.

Before a release:

```bash
npm test
npm run lint
npm run build
```

## Structure

- `src/engine/` — Stockfish worker protocol, UCI parsing, and chess notation.
- `src/model/` — deterministic engine-grounded council renderer.
- `server/` — validated, rate-limited Ollama Cloud proxy.
- `model/` — reusable role prompts, contract, and evaluation set.
- `docs/design/` — generated desktop and mobile concepts plus implementation captures.
- `public/engine/` — Stockfish 18 Lite JavaScript, WebAssembly, and license.
- `.github/workflows/deploy.yml` — GitHub Pages release.
- `railway.json` — Railway health and start configuration for the coach service.

## Open-source foundation

The board uses [chess.js](https://github.com/jhlywa/chess.js) for rules and [react-chessboard](https://github.com/Clariity/react-chessboard) for responsive interaction. The opponent uses [Stockfish.js](https://github.com/nmrugg/stockfish.js), which packages the [Stockfish](https://github.com/official-stockfish/Stockfish) engine for browsers. See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for the full license list.

Chess / LM is distributed under GPL-3.0-only because it includes Stockfish.js.
