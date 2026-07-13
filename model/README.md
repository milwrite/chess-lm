# Chess / LM model guide

The council and Chess Coach form a guidance set built for one narrow task: explain legal candidate moves from Stockfish at UCI Skill Level 8 while Stockfish retains authority over the board.

## Contract

The browser asks Stockfish for three principal variations. Each council role receives the same FEN, candidate moves, evaluations, and continuations, then reads a different part of the position:

- The Witness covers material, king safety, and the immediate threat.
- The Knight covers checks, captures, threats, and tempo.
- The Bishop covers pawn structure, development, space, and piece activity.

Each local adviser selects one supplied candidate, preserves its notation, and stays within one sentence. The interface also sends the FEN after Death's move, PGN, player move, Stockfish reply, and the same three candidates to `server/index.mjs`, which calls `deepseek-v4-flash:cloud` through Ollama Cloud. Provider credentials remain on that server route.

## Move authority

Stockfish runs in a dedicated Web Worker with `Skill Level` set to `8` and `MultiPV` set to `3`. `chess.js` validates both the player move and Stockfish `bestmove`. Council and coach output remain commentary, which gives the model useful evidence while keeping move authority with the engine.

## Evaluation set

`evals/positions.json` provides legal positions that cover development, king safety, pawn structure, tactical tempo, and endgames. `npm run validate:model` checks each FEN, the prompt schema, unique role identifiers, and the move gate.

## Extending the set

The server adapter keeps provider credentials outside the browser and supplies only the three engine candidates. The deterministic advisers remain visible while the coach loads or pauses. The same positions can seed a larger evaluation set by recording whether a reply quotes a supplied move faithfully and limits its claims to engine evidence.

## Model choice

Ollama’s current catalog names the fast model `deepseek-v4-flash:cloud`; the catalog also offers the larger `deepseek-v4-pro:cloud` and `qwen3.5:cloud`. Chess-specific evidence remains limited for the new V4 models, so the implementation favors Flash for short latency and uses Stockfish candidates as its factual boundary. Change `OLLAMA_MODEL` on the server to compare another Ollama Cloud model without rebuilding the game.
