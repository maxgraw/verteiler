# Domain

A semester has 8 time slots with 4 parallel rotation groups each, so 32 slots, default
capacity 6 students. Groups of 1 to 6 students submit three ranked time-slot preferences or
"Egal" (don't care).

buildSlots flattens this into a Slot array where id is the flat index and timeSlot is the
time period, so four consecutive ids share one timeSlot. Preferences are expressed over
timeSlot, capacity over individual slots.

## CSV format

Google Forms export, columns 0-based:

0 Zeitstempel (ignored)
1 E-Mail-Adresse (ignored)
2 Gruppengröße, must parse to 1-6
3 Mitglieder, comma-separated names, non-empty
4-6 1./2./3. Wahl, either "Gruppe X-Y" or "Egal"

parseChoices sniffs comma vs semicolon from the first line, strips a BOM, and hand-parses
quoted cells including doubled quotes. Fewer than 7 header columns is a fatal error.

## Slot labels

"Gruppe X-Y" maps to time slot Math.floor(Y / 4) - 1, matched off the trailing -(\d+):
Gruppe 1-4 is 0, Gruppe 5-8 is 1, up to Gruppe 29-32 which is 7.

"Egal" maps to -1, which matches any time slot at that rank. rankOf returns the index of the
first choice that is either -1 or equal to the time slot, so a group answering "Egal" first
always counts as a first-choice match.

## Parse failure modes

Fatal, parseChoices throws and the upload is rejected: empty file, header only, too few
header columns, or zero valid rows.

Recoverable, a German warning is collected and the upload still succeeds: invalid group size,
missing members, or an unreadable choice skip the row; a duplicate preference or a member
count that disagrees with the stated size keep the row.
