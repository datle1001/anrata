# Spectrum Review — Traficom SinceAI

Evidence-first hackathon prototype for Space IFIC 3074 and terrestrial IFIC 3076.
Not a complete interference assessment or regulatory verdict.

## Demo and outputs

The first screen opens the expert queue. Select **Load 3074 + 3076**, search an
administration/network, open a filing, inspect source rows, and edit/export its
draft correspondence. Download the two independent CSVs. Space and terrestrial
tabs retain the conditional real-input calculations. Geographic evidence shows
national-grid, polygon-boundary and territorial-sea sample maxima.

No backend, user accounts, automatic sending, scheduled monitoring or LLM API is
connected. Correspondence is deterministic, evidence-derived draft text. Imports
and edits are transient. Raw MDB processing is offline, not performed in-browser.

For input/output schemas, reproducible commands, licenses and limitations see
[scripts/README.md](scripts/README.md) and [SUBMISSION.md](SUBMISSION.md).

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
