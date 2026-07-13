# Design system

The accepted visual references are `desktop-concept.png` at 1536 × 1024 and `mobile-concept.png` at 853 × 1920. The production background is `public/assets/shoreline.webp`.

## Visible copy

The first viewport uses `CHESS / LM`, `Death`, `Stockfish · Level 8`, `You`, `White`, `Your move`, `New game`, `Undo`, `Flip board`, `Sound`, `The council`, the three adviser names, and `Death considers`. `Source` and the quiet header sentence support navigation without competing with play.

## Tokens and components

- Background: charcoal black `#090b0b`; raised surfaces `#111414` and `#181b1a`.
- Text: bone `#e1ddd1`; muted bone `#aaa69b`.
- Active state: restrained oxblood `#91342f` and `#b64942`.
- Type: an old-style editorial serif for names and decisions, paired with a compact humanist sans serif for controls.
- Geometry: fine rules, square corners, open rails, and one carved board frame.
- Motion: board transitions, the engine signal, and decision dots. Reduced-motion preferences collapse these cues.

The application divides into a quiet header, player bars, the interactive board, a control strip, the council rail, a move and method ledger, and a restrained footer. At mobile widths, the board remains first, controls keep thumb-sized targets, and the council becomes an accordion with one expanded voice.

## Asset treatment

The shoreline sits behind the interface with a vertical mask rather than a color overlay. Open-source vector chess pieces remain part of the board component because their consistent silhouettes preserve square recognition, movement, and accessibility better than generated raster pieces. That is the sole intentional production-art deviation from the concept.
