# Language

The UI is entirely German. Every user-facing string is German: labels, buttons, headings,
errors, warnings and the copyable template messages.

Code is English: identifiers, comments, test names, commit messages.

Parser warnings and solver errors reach the user directly, so they must read as plain German,
not as technical output. Include the 1-based row number in parser warnings (Zeile N) and say
what happened to the row. Map raw solver errors through toUserMessage in StepAlgorithm.svelte.

The three copyable chat messages live in messages.ts, not in the step files, and address the
semester with ihr. Everything shown in the page itself addresses the single organizer with du.

Call the form Google Forms throughout, not Google Form or Google Formular. Quote UI elements
of other tools with German quotation marks („Antworten“), not ASCII ones. Use an em dash for
asides, never a hyphen.
