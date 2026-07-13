# Chess / LM model guide

The council is a provider-neutral guidance set built for one narrow task: explain legal candidate moves from Stockfish at UCI Skill Level 8 without gaining authority over the board.

## Contract

The browser asks Stockfish for three principal variations. Each council role receives the same FEN, candidate moves, evaluations, and continuations, then reads a different part of the position:

- The Witness covers material, king safety, and the immediate threat.
- The Knight covers checks, captures, threats, and tempo.
- The Bishop covers pawn structure, development, space, and piece activity.

Every response selects one supplied candidate, preserves its notation, and stays within one sentence. The interface can use the deterministic local renderer in `src/model/modelGuide.ts` or send the same contract to a language model through a private server-side adapter. Provider credentials belong on that private adapter, while the public game runs without an API credential.

## Move authority

Stockfish runs in a dedicated Web Worker with `Skill Level` set to `8` and `MultiPV` set to `3`. `chess.js` validates both the player move and Stockfish `bestmove`. Council output remains commentary, which gives a model useful chess evidence while preventing invented or illegal moves from entering the game.

## Evaluation set

`evals/positions.json` provides legal positions that cover development, king safety, pawn structure, tactical tempo, and endgames. `npm run validate:model` checks each FEN, the prompt schema, unique role identifiers, and the move gate.

## Extending the set

A future server-side adapter should keep provider credentials outside the browser, supply only the three engine candidates, validate the returned candidate against that list, and fall back to the deterministic renderer whenever parsing or validation fails. The same positions can seed a larger evaluation set by recording whether the response selects a supplied move, quotes the principal variation faithfully, and limits its claims to engine evidence.
