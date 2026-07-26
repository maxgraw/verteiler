# Styling

Plain CSS, no framework. Component styles are scoped style blocks. The reset and the design
tokens live in src/lib/styles/app.css, imported once in +layout.svelte.

Never hardcode a color, spacing value, radius or font size. Use the tokens:

- spacing: --space-1 through --space-16
- radius: --radius-sm, -md, -lg, -full
- type scale: --text-xs through --text-2xl
- text: --color-text, -secondary, -muted, -subtle, -faint
- surface: --color-bg, -bg-subtle, -surface
- border: --color-border, -border-input
- semantic: --color-primary, -success, -error, -warning, each with -bg and -border variants
- preference ranks: --color-choice-1, -2, -3, -0, where -0 is the no-match red

Drive variants with data attributes instead of extra classes, for example
.spread-item[data-rank="0"].

If a token is missing, add one rather than inlining a literal.

Rank colors are not written per component. app.css maps data-rank 0 to 3 onto --rank-text,
--rank-bg and --rank-border, and any element carrying data-rank picks them up.
