# Traficom submission roadmap

## Cloud upload evidence and alignment
- [x] Normalize accepted JSON publication filings in Cloud atomically, preserve original content and stored PFD, and enable scoped Oma queries across issues, administration, frequencies and PFD categories.
- [x] Verify guest upload → two Cloud filing rows before transfer → Oma returns exact stored 4.25 dB → refresh → deletion; all 81 tests pass and preview build OK. Test uploads deleted. Supported imports remain validated synthetic Space JSON, not arbitrary official ITU MDB/PDF.
- [ ] Verify authenticated ownership end-to-end: blocked because the remixed project has no auth users; sign in/create an account before testing. Guest storage and retrieval verified separately.
- [ ] Center filing metadata and table values: deferred from earlier request; latest request only covers immediate Cloud upload and Oma access.

## Neutral identity and read-state update
- [x] Create a distinctive transparent Antara logo and favicon; align Oma logo with MA.
- [x] Neutralize vivid accents and expose satellite photography above the directly usable desk.
- [x] Persist detail-read markers, remove NEW across filters, and move unreviewed filings In review without reopening completed reviews.
- [x] Order terrestrial high before medium/low and remove read review prompts; verified real JSON upload → transfer → NEW → detail → In review → refresh, RUS High first and read prompt removed after detail/refresh, desktop/mobile without overflow or runtime errors. All 74 tests pass; preview build OK.

## Expert checks and visual refresh
- [x] Add evidence-gated national-register, licence-exempt M4 and coordination-reference prompts to Terrestrial detail and Word drafts. Actual register agreements, M4 case applicability and field strength remain unavailable; 12 dB(µV/m) is explicitly conditional, never universal.
- [x] Refresh shared desk/portal styling with restrained dark spectrum imagery, mint accents, stronger typography and data hierarchy.
- [x] Adopt the supplied transparent black Oma logo in its name, contrasting chat surface, watermark and favicon.
- [x] Verify selected real notice detail, review persistence, actual Word download/content, desktop/mobile without overflow and live Oma response of 13 matching terrestrial notices. All 69 tests and changed-file lint pass; preview build OK and no browser errors. Full-project lint still reports existing formatting errors in untouched files.

## November 7 desk upgrade
- [x] Space: one publication-filtered desk with 25-row pagination, immediate stored status/unresolved reasons and reviewed archive. Verified template upload → transfer → publication selection → completion → archive → refresh; synthetic evidence and browser ownership stay separate. This improves presentation, not production-scale multi-year ingestion/storage.
- [x] Terrestrial: four interactive workload filters, restored active selection, shared geographic review tiers and unresolved explanation. Verified 1,658 no-overlap, RUS tier 25 overlap, In review after refresh and mobile without page overflow; tiers remain team triage, never calculated interference findings.
- [x] Oma: search/exact evidence/statistics read the same full immutable terrestrial asset as the desk. Live original question returns 13 notices with exactly 3 Finnish Excel matches; offline distribution/source hashes reproduced. All 61 tests pass, changed-file lint and latest preview build OK; no browser errors. Browser-local review states are not asserted as server evidence totals.

## Current desk and portal request
- [x] Keep Oma answers scoped to the latest question. Live chat verified Russia count 117 → standalone above-limit explanation without Russian findings → explicit Russian follow-up with fresh evidence; 16 tests pass, preview build OK and no browser errors.
- [x] Upgrade Terrestrial with an immediately available overlap queue, administration/ID/frequency filters, pagination, selected evidence, browser-persistent review states and editable Word coordination drafts. Verified 200 overlap rows, RUS 25 and filter restoration, selected POL evidence, In review / Reviewed and refresh, outstanding overlap 200→199, edited Word content, pagination, 1,658 unresolved no-overlap rows and mobile without overflow. Ten focused tests and changed-file lint pass; preview build OK. Actual-path P.1546 and regulatory clearance remain blocked, not invented.
- [x] Make dashboard counts track outstanding reviews, new transfers and reopening; synchronize browser review changes and verify persistence. Verified real completion 15→14, transfer unresolved 108→110, synthetic completion 110→109, cross-tab reopening and all-completed zero after refresh. 21 focused tests pass; preview build OK, no browser errors.
- [x] Accept publication/notices demo uploads, retain legacy format and original files, update the downloadable template and verify upload-to-desk persistence. Declared counts, Space service and duplicate IDs validated; 13 focused tests pass. Download/upload/refresh/unchanged original/transfer/detail/desk refresh checked with no browser errors; preview build OK.
- [x] Improve Oma context handling, unread synonym, exact administration lookup, New chat and answer-only display.
- [x] Replace hover navigation with compact visible navigation; show prepared records immediately and restore desk filters.
- [x] Add synthetic publication portal, JSON template, browser-persistent upload inbox, new-row notifications and validated transfer/detail workflow. Transfer is structural validation only, not a PFD calculation or live ITU sync.
- [x] Verify upload-to-desk, original-file preservation, completed review and country-filter refresh persistence. Live Oma replies: 15 stored Space exceedances; exact D lookup: 6 Space / 0 terrestrial. New chat remains empty after refresh; desktop/mobile show no runtime errors or overflow. All 29 tests and changed-file lint pass; preview build OK.

## Antara / Oma update
- [x] Open guest Oma chat with browser conversation/reviews and optional separate account history; live guest evidence reply, refreshed chat, audited filter action and refreshed Completed queue checked. Desktop/mobile show no page errors or overflow; 21 tests pass.
- [x] Clear Review Trigger, eight labelled demo filings, expert completion workflow and aligned filters; completed demo persists across reload and appears in its own queue.
- [x] Antara identity and top-right Oma 70/30 copilot panel; desktop/mobile checked.
- [x] Account-backed continuous chat, available-evidence retrieval and audited UI actions; real AI stream, red filtering (15 real filings) and history restoration verified in signed-in preview.
- [x] Verify signed-in review/chat/control/history flows; 17 tests pass and preview builds successfully. Full-project lint retains pre-existing formatting errors; changed feature files pass lint.

## Current completion request
- [x] Phase 1: show available IFIC publications, explicit scan/load states, evidence-based review labels and reasons; apply the requested dark blue/cyan palette. Verified real-data scan/search/details/rescan on desktop/mobile and 9 tests. No simulated live ITU monitoring or invented regulatory risk verdicts.
- [x] Acquire geoBoundaries FIN ADM0 full with source hash/dates/license; combine national-footprint and official territorial-sea samples. Land-border-only legal validation remains blocked.
- [x] Add 12 offline conditional sample maxima for the existing GSO example, preserving historical results and null limits/margins.
- [x] Deliver searchable expert queues, source-linked draft correspondence and separate Space/Terrestrial CSV results.
- [x] Provide a reusable offline processing entry point, submission report, I/O instructions and demo checklist. Raw Space and terrestrial MDB runs verified.
- [x] Verify 67 Python and 5 browser-logic/routing tests plus real-data desktop/mobile review/import/export. No runtime errors or mobile page overflow observed.

- [ ] Apply organizer follow-up: acquire and audit national/territorial-sea geometry, prepare reproducible evaluation points, expose configurable screening margins without band-based priority, and retain earlier conditional results without upgrading them.
  - [x] Download official Traficom TerritorialSeaArea_L as CRS84; prepare 360 outer-limit samples from 6 features with source hashes, properties and unchanged evidence export. Add editable offline grid/boundary/review settings and tests; prior numeric results retained.
  - [x] Obtain public national footprint (6,296 grid / 351,725 polygon boundary / 360 sea samples). Footprint includes inland waters/coastline; true land-border validation and actual-path terrestrial calculations remain blocked.

- [x] Normalize 874 Finnish Excel rows with raw values, provenance, comma decimals and ITU-style bandwidth parsing; unresolved quality issues retained.
- [x] Extract Space IFIC 3074 and terrestrial 3075–3076 with raw provenance and join checks; interpretation/identity validation remains limited.
- [ ] Screen Finnish relevance using M4 and protected reception frequencies; preliminary Space Excel-overlap script added, full M4/geography/beam-type screening still pending.
- [ ] Implement and validate one applicable worst-case satellite PFD scenario.
  - [x] Add reproducible conditional nominal-GSO single-point geometry/PFD example with analytic tests; applicability, spectral-envelope semantics, orbital maxima and independent validation remain open.
- [x] Audit raw satellite-beam/orbit/emission input presence and quarantine non-downlink categories; 8,498 groups audited, applicability and PFD validation remain pending.
- [ ] Implement and validate P.1546 land-mobile screening at borders/territorial sea and stations.
  - [x] Verify 52 bundled P.1546 references and calculate conditional all-land/cold-sea 3076 example for station 987279; not independent validation, actual-path prediction or coordination comparison. Two other paths exceed 1000 km and remain unresolved. ERP/height semantics, spectrum, M4 and national geometry still block a complete assessment.
  - [x] Encode the gated T/R 25-08 A1.2.3 threshold and uniform-spectrum bandwidth conversion; above-470 MHz extension requires explicit challenge confirmation. No real-case coordination comparison yet.
  - [x] Add 3076 foreign FB/ML Excel-overlap screening and raw geography/transmitter/antenna/height evidence; retain no-overlap and unresolved cases. Actual-path P.1546 and national geographic screening remain unimplemented.
- [ ] Compare terrestrial issues and summarize neighboring-administration trends.
  - [x] Add publication-aware 3075–3076 comparison retaining raw actions, provenance and ambiguous identities; presence differences are not withdrawal evidence. Geographic relevance, validated identity and trends remain pending.
- [x] Build expert review website, offline JSON import, evidence view and editable deterministic draft correspondence; Oma now adds live grounded chat, never automatic sending.
  - [x] Display the conditional real-input satellite case and download its full evidence; desktop/mobile rendering and export checked. Queue and correspondence now implemented.
  - [x] Add a separate terrestrial evidence view with offline screening metrics, raw example joins and unchanged full-artifact download; this is not a P.1546 result or the full review queue.
- [x] Export separate 3074 and 3076 review results; prepare source handoff, report, I/O documentation and demo script. Author must provide repository URL, publish/record if wanted and submit to contest.

## Blocked full-scope objectives
- Full M4/provision mapping, all Space notice/orbit types and Finnish satellite protection: require additional verified per-case rules and protection data.
- Regulatory PFD verdict and actual-path P.1546 border/sea comparisons: require validated power/spectrum/aggregation/height/path assumptions and independent checks.
- Verified withdrawal/history and long-term trends: require cross-issue identity validation and additional publication history.
- Oma cannot claim universal ITU/M4/M15 coverage: complete source rules and live ITU acquisition are unavailable. Its hypothetical interval-overlap helper is not an independently validated regulatory reassessment.
- Final repository URL, contest submission and optional recording: author-controlled external actions.

Organizer follow-up received: no benchmark filings or special reference implementation available; ordinary geographic sources and a Finland-wide evaluation grid accepted; margins must be documented/modifiable; no synthetic-data band priority. Independent validation, actual model inputs and geographic processing remain our responsibility.
## Expert interview rebuild
- [x] Remove ZIP dossier; letter only, editable Word with diary-number placeholder
- [x] Automated worst-case GSO PFD screening vs encoded Table 21-4 rows, with visible calculation and citation
- [x] Show affected Finnish frequencies (national list, possibly not notified to ITU) and audit trail per filing
- [ ] Automatic download of new IFIC issues from ITU (blocked: needs ITU account/access)
