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
of other tools with German quotation marks („Antworten“), not ASCII ones.

Keep every string short. Prefer two plain sentences over one with a subclause, and cut words
that carry nothing: bestmöglich becomes best, manuell becomes von Hand, "Bitte prüfe, ob die
richtige Datei hochgeladen wurde" becomes "Ist das die richtige Datei?".

No em dash anywhere in user-facing German. Where one held an aside, end the sentence and start
a new one, or use a colon when the second half explains the first.
