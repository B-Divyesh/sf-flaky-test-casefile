# Visual thesis: the incident drafting sheet

Flaky Test Casefile borrows from an engineer's marked-up blueprint: evidence is measured, aligned, and annotated rather than decorated. The site is a single midnight-blue drafting surface with cyan construction lines, cream paper labels, vermilion fault marks, and a compact evidence board. This is deliberately a single-mode identity; changing to a conventional light/dark theme would break the drafting-sheet metaphor. The background is always painted explicitly.

## Palette

- `blueprint-950 #071b2b`: page background, taken from diazo blueprint stock.
- `blueprint-900 #0b2639`: raised evidence surfaces.
- `blueprint-800 #12364a`: rules and inactive controls.
- `paper #f3eddc`: primary text, echoing tracing paper; 13.4:1 on the background.
- `pencil #a8c2cc`: secondary text; 8.4:1 on the background.
- `cyan #64d8e8`: measurements, focus, and primary action; 10.2:1 on the background.
- `ink #05212c`: text on cyan controls; 10.1:1.
- `fault #ff755f`: failures and divergence marks; 6.7:1 on the background.
- `verified #8ed3a6`: passing/verified states; 9.1:1 on the background.
- `warning #f1c46b`: incomplete evidence; 10.4:1 on the background.

Color is never the only signal: every status includes a word, symbol, or border pattern.

## Type and rhythm

The display face is the locally self-hosted **Space Grotesk** subset (SIL Open Font License), whose squared terminals feel like labeled technical plans without becoming cosplay. Evidence, commands, and numerals use the native monospace stack for crisp tabular alignment. Type steps are 12, 14, 16, 20, 28, and a fluid 44–68px title. Body copy never drops below 16px. Spacing follows an 8px baseline with 4px for optical micro-adjustments; the content rail tops out at 1180px and prose at 68 characters.

## Interaction grammar

Primary actions look like cyan drafting tabs that shift by two pixels when pressed. Focus is a 3px paper-colored outer keyline plus cyan inner line. Expandable evidence rows use native disclosure controls. The demo accepts a casefile JSON drop or file selection, while the sample loads without a network request. At phone width, comparison columns become a sequence and ornamental coordinate labels disappear; primary actions remain at least 44px tall.

## Motion

The only entrance is a 240ms upward reveal, like tracing paper settling on a plan. Diagram marks draw once in 500ms. Evidence selection fades in over 180ms. Nothing loops. Under `prefers-reduced-motion: reduce`, transforms and line drawing are removed and all state changes are instant.

## Asset plan and provenance

- `site/public/casefile-drafting.webp` and its responsive 640px derivative: original generated hero illustration, a top-down technical casefile with retry strips converging on one fault pin. Generated for this product with the factory `factory-image` deployment on 2026-08-27, then converted locally to WebP. The generation sidecar accompanied the PNG source during production; the source was discarded after visual review and the durable final prompt is recorded below. No third-party visual assets.
- CSS grid, dimension marks, icons, and the product monogram are hand-authored in CSS/SVG so they remain sharp and accessible.
- Space Grotesk is redistributed under the SIL Open Font License; its license is kept with the font asset.

Generation prompt:

> Use case: stylized-concept. Asset type: landing page hero for a developer tool. Primary request: an original top-down editorial illustration of a dark navy blueprint drafting sheet documenting an intermittent software test failure. Subject: three translucent retry evidence strips containing abstract browser frames, network timing ticks, and DOM node diagrams converge toward one small vermilion fault pin; a cyan technical pencil and metal ruler sit at the margins. Style/medium: tactile cut-paper and precise technical ink, subtle paper grain, modern editorial still life, not photorealistic UI. Composition: wide 3:2 crop, central evidence cluster, generous clean edge space, strong silhouette at small size. Palette: midnight blueprint blue, cyan lines, warm cream paper, one vermilion fault accent. Constraints: no people, no brands, no logos, no readable words, no fake product UI, no gradients, no watermark.
