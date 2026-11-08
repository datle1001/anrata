# Spectrum Review — submission notes

Author: NGUYEN THANH DAT LE. Traficom SinceAI challenge, 7 November 2026.

## What this prototype delivers
- Reproducible offline preparation of supplied Excel and compatible IFIC MDBs.
- 874 Finnish source rows normalized, 317 flagged; raw values and Excel row provenance retained.
- Space 3074: 95,865 frequency rows inspected; 51,057 foreign emission rows;
  14,305 Excel-overlap frequency rows across 131 notices. 8,498 candidate groups
  audited; 8,448 groups/122 notices in an unverified downlink review pool.
- Terrestrial 3076: 1,858 foreign FB/ML publication rows retained, 200 with Excel
  overlap, 1,658 without overlap **not cleared**. Associated transmitters retained.
- Publication-aware 3075/3076 comparison with raw ADD/MODIFY actions and presence
  differences kept distinct. Neighboring-administration snapshot table is not a
  long-term trend or withdrawal detector.
- Separate CSV review outputs, searchable queue, source evidence, editable draft
  correspondence, original conditional satellite and P.1546 artifacts.
- National-footprint grid and boundary samples plus official territorial-sea
  samples; conditional nominal-GSO sample maxima for INTELSAT7 66E only.

## Four mandatory inputs and their actual use
Space MDB: notice/group/frequency joins, beam/orbit/emission audit and conditional
GSO example. Terrestrial MDB: circular/publication scoping, FB/ML intervals,
transmitter and antenna joins. Finnish Excel: protection intervals, coordinates,
provenance and quality flags. M4: documentary service/provision review for the
single 3.7 GHz example (M4 PDF p.157); **not a complete machine-readable M4-wide
applicability map**. See `src/data/space3074-example-applicability.json`.

## Technical analysis and validation
Satellite formula: PSD + maximum beam gain + 10log10(4000 Hz) minus spherical
spreading loss using WGS84 receiver geometry and nominal circular GSO. Four
emission alternatives remain separate, not aggregated. Worst-case pointing is
organizer-permitted; PSD semantics, carrier aggregation and orbital tolerances
remain conditional. Incident PFD does not include receiving antenna gain.

P.1546: external eeveetza/p1546 pinned commit
`0e4263999ce055100f42257c2aafbac96ac630af`; 52 bundled cases/24 profiles matched
at eight-decimal precision under Octave 11.1.0. This is **implementation reference
agreement, not independent Finnish-case validation**. POL example evaluates
homogeneous land/cold-sea sensitivity scenarios for one in-domain Excel station;
two >1000 km paths remain unresolved. Not actual mixed paths or verified bounds.
ERP/height/spectrum semantics remain unverified. T/R 25-08 criterion module is
gated separately. No real coordination margin or violation is established.

Automated checks are documented in `scripts/README.md`: analytic geometry,
normalization, relational joins, criterion gates and domain handling. No labeled
expert set exists; false-positive/negative rates and time savings are not claimed.

## Geography and organizer responses
National source: geoBoundaries gbOpen FIN ADM0 full, revision 9469f09, underlying
OpenStreetMap/Wambacher, ODbL 1.0. Represented 2017, source update January 2023,
build December 2023. Åland included; inland waters included; coastline and islands
are not land-border-only geometry. Source hashes travel with point artifacts.
Territorial source: Traficom `avoin:TerritorialSeaArea_L` in CRS84, six features,
360 samples. Not EEZ or internal-water baseline. Source feature dates are retained;
no claim of 2026 legal boundary validation.

6,296 national-grid points, 351,725 polygon-boundary samples, 360 outer-limit
samples. Twelve conditional PFD sample maxima are **not continuous national
maxima**. Grid step 0.1°, boundary segment control 5 km; editable offline settings.
3 dB review buffer is team-selected, separate from limits and not applied where
comparison is unresolved. No band has preferential priority.

## Honest scope and remaining blockers
Not completed: comprehensive M4 applicability; Finnish satellite protection;
API/A, CR/C and AP30/30A/30B-specific processing; non-GSO/EPFD; orbital/geographic
continuous maxima; actual-path terrestrial prediction; true land-border layer
validation; verified withdrawals; independently labeled accuracy assessment;
live AI API integration; automatic monitoring or dispatch. These require model,
schema, source and expert validation beyond the present prepared demo. The
organizer supplied no benchmark filings/reference implementation, which does
not waive validation. This is a functional **partial-scope submission prototype**,
not fulfillment of every technical challenge objective.

## Demo script (approximately three minutes)
1. Load the queue. Search USA, open INTELSAT7, inspect linked source evidence.
2. Export separate 3074/3076 CSVs; show unresolved no-overlap terrestrial cases.
3. Open terrestrial evidence: show raw action, transmitter link and out-of-domain paths.
4. Open Space evidence: explain conditional PFD and outstanding provision checks.
5. Show geographic sample maxima, source dates/hashes, modifiable settings.
6. Open a notice, edit/export the correspondence draft. Nothing is sent.
7. Import a CLI-generated review artifact and explain generic offline MDB processing.

## Submission handoff
Submit the two CSVs, conditional calculation artifacts, this report, I/O
documentation and source repository. Reviewer should approve all technical claims.
The app is not yet published. Repository URL and final contest upload must be
supplied by the author; neither is fabricated here. Video recording is optional
under supplied sections 02–07 and has not been generated.