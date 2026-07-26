# Language

The UI is entirely German. Every user-facing string is German: labels, buttons, headings,
errors, warnings and the copyable template messages.

Code is English: identifiers, comments, test names, commit messages.

Parser warnings and solver errors reach the user directly, so they must read as plain German,
not as technical output. Include the 1-based row number in parser warnings (Zeile N). Map raw
solver errors through toUserMessage in StepAlgorithm.svelte.
