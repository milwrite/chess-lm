# Repository guidance

Keep chess rules, engine communication, and model commentary in separate modules. Stockfish owns every move made by Death. Model-facing prose may explain supplied candidate lines and must never invent or apply a move.

Use plain, connected prose. Avoid made-up noun phrases, choppy sentences, awkward definite articles, and claims framed as negations.

Run `npm test`, `npm run lint`, and `npm run build` before publishing. Browser checks must cover one complete human and engine turn at desktop and mobile widths.
