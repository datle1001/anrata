# Spectrum Review — Traficom SinceAI

Evidence-first hackathon prototype for Space IFIC 3074 and terrestrial IFIC 3076.
Not a complete interference assessment or regulatory verdict.

## Demo and outputs

The first screen opens the review desk. Choose **Space IFIC 3074** or **Terrestrial IFIC 3076**, filter records and inspect source evidence. **Submission evidence & source coverage** provides the separate CSVs, stored calculation artifacts, organizer Q&A coverage and reference links. CSVs are frequency-review outputs, not complete concern benchmarks.

The **Inbox** accepts supported Space/Terrestrial JSON and stores original evidence in the same owner-scoped Cloud before Scan. Scan transfers evidence, not live calculations. Later uploads receive stored all-field Changes; deletion removes per-file evidence/state so re-upload is unread. Oma retrieves fresh stored evidence. Correspondence is editable, expert-approved and never automatically sent. Raw MDB preparation remains offline; automatic IFIC monitoring is not connected.

Official M4 allocation snapshot and reproducible interval comparisons now accompany the existing Excel screening. Allocation overlap does not establish service applicability or safety. Historical PFD outputs remain unchanged; hardened regeneration gates service/power/footnotes and full-band criterion selection.

Judges can test the flow themselves with the synthetic inputs in
[public/demo-files](public/demo-files/README.md): three Space issues and three
Terrestrial issues plus one stored P.1546 case, with the upload order and the
expected Changes written out.

For input/output schemas, reproducible commands, licenses and limitations see
[scripts/README.md](scripts/README.md), [SUBMISSION.md](SUBMISSION.md), [REQUIREMENTS.md](REQUIREMENTS.md) and [CHALLENGE_AUDIT.md](CHALLENGE_AUDIT.md).

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS
