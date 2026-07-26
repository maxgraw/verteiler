# Comments

Comment why, not what. Leave it out when the code already says it.

Use JSDoc on exported functions when the contract is not obvious: units, ranges, sentinel
values, what throws. Interface fields carrying a sentinel need one, for example -1 meaning
unassigned or don't care.

Mark non-obvious workarounds with a short note naming the constraint, so the next reader
does not simplify them away.

Comments are English even where the surrounding strings are German.

Plain text only. No emoji, no ASCII art, no decorative separators, no markdown formatting
inside comments.
