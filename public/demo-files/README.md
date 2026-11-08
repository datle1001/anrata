# Demo test files

Synthetic review inputs for judges. Nothing here is real ITU data: every file is
marked `synthetic: true` and carries invented network names, coordinates and
levels. Upload them to the app's **Inbox** to exercise the review flow end to
end. They are inputs only — the app never sends them anywhere.

## Space test files (`space/`)

Upload in this order:

1. `IFIC_3077_demo_full.json` — 4 filings, all new to the desk.
2. `IFIC_3081_demo_full.json` — 5 filings, all new to the desk.
3. `IFIC_3082_demo_full.json` — 4 filings; `BALTIC-STREAM` repeats the 3081
   filing with three changed values (lower edge 10700 → 10725 MHz, PSD
   −57.5 → −59.0 dBW/m², PFD margin 3.28 → 1.78 dB).

Expected result: after Scan, the 3082 copy of `BALTIC-STREAM` opens with a
**CHANGES** panel naming the 3081 baseline and the exact before → after fields.
The 3081 copy keeps the normal Review Trigger layout.

## Terrestrial test files (`terrestrial/`)

Upload in this order:

1. `IFIC_3083_terrestrial_demo.json` — 3 notices (RUS Vyborg, POL Gdańsk,
   KAZ Aktau), all new.
2. `IFIC_3084_terrestrial_demo.json` — RUS Vyborg and POL Gdańsk repeat with
   changed power / antenna height / gain / channel; SWE is a new notice.
3. `IFIC_3085_terrestrial_demo.json` — RUS Vyborg repeats as a withdrawal
   (MOD → SUP); NOR Kirkenes is new.
4. `IFIC_3076_terrestrial_p1546_demo.json` — one real Polish notice (IFIC 3076,
   station 987279) carrying a stored offline P.1546-6 assessment.

Expected result: repeated notices open with **CHANGES** against the earlier
issue; new notices open with the normal Review Trigger layout. The 3076 file
shows the stored P.1546 table (−57.41 dBµV/m land, −35.66 dBµV/m cold sea at
849.11 km) plus the unresolved paths and unconfirmed comparison gates.

## Archives

`ANRATA_Space_Test_Files.zip` and `ANRATA_Terrestrial_Test_Files.zip` are the
same JSON files packaged for a single download.

## Reading the output

A filing or notice is **not** cleared by these files. Changes lists field-level
differences; Review Trigger lists overlap and action evidence; the P.1546 panel
states conditional predictions and which gates remain unconfirmed. None of it
is an interference or compliance verdict — that judgement stays with the expert.
