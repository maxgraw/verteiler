# Domain

A semester has 8 time slots with 4 parallel rotation groups each, so 32 slots, default
capacity 6 students. Groups of 1 to 6 students submit three ranked time-slot preferences or
"Egal" (don't care).

buildSlots flattens this into a Slot array where id is the flat index and timeSlot is the
time period, so four consecutive ids share one timeSlot. Preferences are expressed over
timeSlot, capacity over individual slots.

## CSV format

Google Forms export. detectLayout resolves the columns from the header text, not from fixed
positions, because a form only exports an E-Mail column when it asks for addresses and the
question wording differs between form copies:

- three columns matching /\bwahl\b/, each "Gruppe X-Y" or "Egal", ranked 1./2./3. by column
  order
- Gruppengröße, matching /anzahl|größe/, must parse to 1-6
- Mitglieder, matching /name|mitglied/, comma- or newline-separated names, non-empty

Größe is resolved first, because "Anzahl Gruppenmitglieder" matches both patterns. Everything
else, timestamp and E-Mail among them, is ignored. A header where one of the five is missing
is a fatal error.

parseChoices sniffs comma vs semicolon from the first non-empty line, strips a BOM, and
hand-parses quoted cells including doubled quotes.

The scanner walks the whole text rather than splitting on newlines first, so a quoted field
may contain newlines. Google Forms produces those whenever someone types the member names
one per line. Member names are then split on commas and newlines alike and rejoined as a
comma-separated list, so the stored string and the member count are both correct either way.

## Slot labels

"Gruppe X-Y" maps to time slot Math.floor(Y / 4) - 1, matched off the trailing -(\d+):
Gruppe 1-4 is 0, Gruppe 5-8 is 1, up to Gruppe 29-32 which is 7.

"Egal" maps to -1, which matches any time slot at that rank. rankOf returns the index of the
first choice that is either -1 or equal to the time slot, so a group answering "Egal" first
always counts as a first-choice match.

## Result export

Both exports list one row per group rather than one block per time slot: the time slot number
is internal, the rotation group range is what the group picked in the form. groupRows flattens
the time slot view, formatDistribution renders it for the clipboard and pdf.ts builds the PDF.

downloadDistributionPdf imports jsPDF and jspdf-autotable on demand, so their ~120 KB gzipped
only load when the organizer asks for the PDF. The built-in Helvetica is WinAnsi encoded,
which covers umlauts, ß and the en dash in the slot labels, so no font has to be embedded.

## Parse failure modes

Fatal, parseChoices throws and the upload is rejected: empty file, header only, an
unrecognized header, or zero valid rows.

Recoverable, a German warning is collected and the upload still succeeds: invalid group size,
missing members, or an unreadable choice skip the row; a duplicate preference or a member
count that disagrees with the stated size keep the row.
