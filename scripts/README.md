# Offline challenge preparation

These scripts prepare and audit real inputs. They do **not** implement a complete
satellite or terrestrial interference assessment.

## Official M4 snapshot and interval evidence

```sh
curl -L --fail 'https://opendata.traficom.fi/api/v13/Taajuusjakotaulukko' -o /tmp/m4-allocation-raw.json
lovable-assets get --file src/data/space3074-frequency-candidates.asset.json --output /tmp/space3074-frequency-candidates.json
lovable-assets get --file src/data/terrestrial3076-screening.asset.json --output /tmp/terrestrial3076-screening.json
python scripts/prepare_m4_evidence.py /tmp/m4-allocation-raw.json /tmp/space3074-frequency-candidates.json /tmp/terrestrial3076-screening.json /tmp/m4-evidence.json
```

Numeric `Sub_band_*__Hz_` fields are converted explicitly to MHz; invalid fields remain unresolved. Raw API rows, IDs, source positions and hashes are preserved. This compares the retained Space Excel-overlap pool and all retained terrestrial rows to M4 sub-bands, not all Space records or service/provision applicability. Power units and licence-exemption are not inferred. Stored November 8 snapshot: 5,917 allocation rows; all 1,858 retained terrestrial rows overlap a listed allocation, including 1,658 without Excel matches. These are broad allocation matches, not 1,858 interference cases.

## Hardened bulk GSO PFD regeneration

Historical stored PFD artifacts remain unchanged. After notice preparation:

```sh
python scripts/screen_gso_pfd.py /tmp/ific-work src/data/ific3074-notice-records.json src/data/finland-normalized.json src/data/pfd-limits.json /tmp/pfd-screening.json --settings src/data/geographic-screening-settings.json --confirmations /tmp/reviewed-group-confirmations.json
```

Confirmations are keyed by group ID: `service` must match the row; `applicabilityConfirmed` and `powerEnvelopeConfirmed` must be true; `evidenceReference` identifies reviewed evidence; conditional-footnote rows require `footnotesConfirmed: true`. Omit confirmations to retain conditional numerical estimates with criterion-relative status unresolved. No confirmation is fabricated. A group must fit wholly within one unique encoded row; boundary-spanning groups remain unresolved. All calculated groups are retained. Input/script/settings hashes travel with output; review buffer comes from shared settings, not a hard-coded regulatory rule. Unittest discovery now includes bulk PFD formula, boundary, ambiguity, buffer and applicability regressions.

## Terrestrial publication comparison

### Package a prepared subset for the Cloud inbox
After offline screening and source review, package a selected land-mobile review artifact without changing its records:

```sh
python scripts/package_terrestrial_review.py /tmp/selected-terrestrial-screening.json /tmp/terrestrial-upload.json --published-at 2026-11-08
```

Use the actual publication date, not the example date. The versioned inbox accepts up to 500 notices / 2 MB per issue; the complete real 3076 artifact remains in the separate benchmark queue. Packaging retains all source metadata and a SHA-256 of the input. It does not perform screening, propagation or regulatory comparison. It rejects ambiguous duplicate identities and never truncates evidence. Use `--synthetic` only for explicitly synthetic inputs.

Export `fxm_terra`, `fxm_pub_hist`, `pub`, and `pub_current_circ` from each
unmodified terrestrial MDB into separate directories, then run:

```sh
python scripts/compare_terrestrial.py /tmp/terra3075 /tmp/terra3076 /tmp/terrestrial3075-3076-comparison.json
```

The current issue is verified from `pub_current_circ`; history is joined to
`pub` by prefix and publication number before selecting current publications.
`FB` and `ML` are only a class-based review pool (embedded `ref_stn_cls` labels:
base station and land mobile station). `intent` and `amend_type` remain raw.
Presence-only differences never establish new assignments or withdrawals.
Identity is provisional; duplicate identities and unresolved joins are retained.
No geographic filtering, P.1546 calculation or coordination verdict is performed.

## Terrestrial Excel overlap and input audit

Also export `fxm_geo`, `fxm_tx`, `fxm_ant`, and `fxm_ant_hgt` for the target
issue, then run:

```sh
python scripts/screen_terrestrial.py /tmp/terra3076 src/data/finland-normalized.json /tmp/terrestrial3076-screening.json
```

All foreign FB/ML publication rows remain in the artifact, including no-overlap
and invalid-interval cases. Lack of Excel overlap does not exclude M4-wide,
border/territorial-sea or adjacent-band relevance. TX sites and associated
transmitter links on RX notices are retained separately, with raw antenna and
height rows. Decimal point coordinates are conditional reported values; circles
and other areas are not collapsed to transmitter points. Power units and model
applicability remain unvalidated; no field strength or criterion is calculated.

## Conditional terrestrial path preparation

### Reusable notice-linked P.1546 runner

`run_p1546_review.py` enriches prepared terrestrial JSON with immutable `record.p1546` artifacts. It invokes the external P.1546-6 implementation, not an invented approximation; both its entry point and entire executable MATLAB tree are pinned. The model remains external under its existing attribution/licence. The browser and Oma never run Octave or recompute propagation.

```sh
python scripts/run_p1546_review.py /tmp/terrestrial-review.json /tmp/reviewed-path-manifest.json /path/to/pinned/matlab /tmp/terrestrial-with-p1546.json --octave-command 'nix run nixpkgs#octave --'
```

Manifest shape: `{"notices":{"TERRAKEY":[path,...]}}`. Each path explicitly supplies `id`, `target`, `frequencyMHz`, `timePercentage`, `locationPercentage` (50 only), `effectiveHeightM`, `receiverHeightM`, `receiverClutterHeightM`, `receiverEnvironment`, `erpKw`, ordered `sections` (`distanceKm` and `zone`: Land/Cold/Warm), `evidenceReference` and nonempty `assumptions`. Paths under 15 km also require `transmitterHeightAglM`. This is the conservative no-terrain-profile conditional runner; it does not derive terrain heights, climates, directional patterns or land/sea fractions. Missing inputs, 1–1000 km distance violations and execution failures remain unresolved with null predictions. Raw `pwr_dbw`, AGL height and emission bandwidth are never silently promoted into ERP, effective height or channel spacing.

Optional `coordination` must declare reviewed `lowerMHz`, `upperMHz`, `applicabilityConfirmed`, `spectrumBasisConfirmed`, `evaluationLocationConfirmed` and `evidenceReference`. Optional wide `channelSpacingKhz` requires `uniformSpectrumConfirmed`; above 470 MHz requires `challengeExtensionConfirmed`. Prediction `powerReferenceBandwidthHz`, time/location percentages and receiver height must match the selected T/R 25-08 criterion before any signed margin is produced. Positive margin is field minus trigger, never harmful-interference proof; below-trigger is not clearance. The runner does not authenticate those reviewer claims.

`src/data/p1546-example-manifest.json` and `p1546-notice-reference.json` reproduce the existing POL 3076 homogeneous Land/Cold experiment: station 987279 fields −57.407288886711 / −35.658872975466 dBµV/m; two other paths stay unresolved beyond 1000 km. No coordination margin exists because spectrum/applicability are unconfirmed. These are not user demo files or new actual-path claims.

Existing JSON uploads need no changes and stay unresolved without a prepared artifact. To include predictions, prepare a *new* enriched JSON offline and upload it through the normal Terrestrial inbox. Evidence is stored immediately with the original and read by Oma before Scan. Complete source-record equality guards against stale results when any notice/join/match/blocker field changes; source binding is not model authenticity. Deletion removes the artifact with its owning publication. Never edit values in an attached assessment by hand.

```sh
python scripts/prepare_terrestrial_example.py src/data/terrestrial3076-screening-summary.json src/data/finland-normalized.json src/data/terrestrial3076-example-preparation.json
```

Prepares the POL / 92817506 example and three Excel reception points. Distances
use a spherical great circle, not terrain or mixed-path geometry. Two paths
exceed P.1546's 1–1000 km distance domain and must not be extrapolated. ERP and
effective-height interpretations are explicitly conditional. No field strength
or 25 kHz criterion margin is calculated by this script.

Run the external model without vendoring its source (credits: Jef Statham and
Ivica Stevanovic; custom license permits distribution with acknowledgments and
identification of modifications). Pin repository `https://github.com/eeveetza/p1546`
to commit `0e4263999ce055100f42257c2aafbac96ac630af`, extract outside the project,
and run its MATLAB `validateP1546` with Octave before running the example:

```sh
python scripts/summarize_p1546_validation.py /path/to/matlab/validation_results/combined_results.csv src/data/p1546-reference-validation.json
python scripts/calculate_terrestrial_example.py src/data/terrestrial3076-example-preparation.json /path/to/matlab src/data/terrestrial3076-conditional-p1546.json --octave-command 'nix run nixpkgs#octave --'
```

52 bundled cases in 24 profiles agreed to eight-decimal output precision under
Octave 11.1.0. This is not independent validation. The example evaluates only
homogeneous land and cold-sea sensitivity paths for station 987279. Neither is
the actual mixed path or a verified worst-case bound. No spectrum conversion or
coordination comparison is performed. Climate-region adjustment and Annex 5
section 4.3(a) terrain correction are absent in the external implementation.

## Space input-presence audit

Export `notice`, `grp`, `freq`, `emiss`, `s_beam`, `geo`, `non_geo`, and `srv_cls`
from the unmodified Space MDB using `mdb-export`. Keep raw exports outside the
repository. Then run:

```sh
python scripts/screen_space.py /tmp/ific-work src/data/finland-normalized.json /tmp/ific-work/space3074-frequency-candidates.json
python scripts/audit_space_readiness.py /tmp/ific-work /tmp/ific-work/space3074-frequency-candidates.json /tmp/ific-work/space3074-input-audit.json
python -m unittest discover -s scripts -p 'test_*.py'
```

Group-level emission alternatives are retained; frequency and emission sequence
numbers are not joined to each other. The audit retains CSV row provenance and
does not discard missing or ambiguous joins. Its GSO input-presence count is not
a count of cases with validated calculation inputs.

## Verified dictionary meanings

ITU SNS dictionary v9.1:
https://www.itu.int/en/ITU-R/space/Documents/sns_dbv91.pdf

- PDF p.5: `emiss.pwr_ds_max`, maximum/mean power density in dBW/Hz; not EIRP.
- PDF p.8: `grp.pwr_max`, antenna-input total peak/aggregate power in dBW.
- PDF p.20: `s_beam.gain`, maximum isotropic antenna gain in dB; not directional
  gain toward Finland.
- PDF p.23: station/service codes require Preface Tables 3 and 4.

Worst-case pointing is allowed by organizer Q&A, so missing beam footprints
are not themselves a blocker for a labelled bound. Power-density semantics,
reference-bandwidth treatment, service applicability and reception-area geometry
still require verification. Maximum gain is not evidence of actual illumination.

## Narrow criterion module

`satellite_pfd_criteria.py` encodes only the GSO fixed-satellite space-to-Earth
3.4–4.2 GHz Table 21-4 limit in RR2024 Volume 1, printed pp.286–287
(PDF pp.296–297). It requires an explicit applicability confirmation and rejects
other bands. Unit tests check the piecewise limits, domain and 4 kHz reference.
They do not validate PFD, service-code decoding or any real-case compliance.

## Conditional real-input example

```sh
python scripts/calculate_space_example.py src/data/space3074-input-audit-summary.json src/data/finland-normalized.json src/data/space3074-single-point-example.json
```

This computes nominal GSO range/elevation and separate conditional free-space
PFD estimates for the four reported emission alternatives of the example group.
The 4 kHz integration assumes the reported maximum PSD is a valid per-Hz upper
envelope; it does not assume constant actual emitted power. No alternatives are
summed. No receiving-antenna gain is added to incident PFD. The receiver is on
the WGS84 ellipsoid surface because Excel ASL heights are not ellipsoid heights.
Orbital tolerances, national reception-area maxima and independent benchmark
validation remain undone. Limit and margin stay null pending provision review.

## Organizer follow-up and geographic preparation

Traficom accepts an evaluation grid and ordinary boundary datasets, provides no
benchmark cases/special reference model, permits documented modifiable review
margins, and specifies no preferential band in the synthetic dataset. Earlier
numeric artifacts remain unchanged: these answers do not verify power, actual
paths, aggregation or criterion applicability.

`src/data/geographic-screening-settings.json` holds a team-selected initial
3 dB near-limit review buffer, 0.1-degree angular grid and 5 km boundary segment
sampling setting. These are not organizer-specified numeric requirements. Edit
the settings and regenerate offline; do not relabel historical results.

Obtain a national polygon and explicitly select the territorial-sea OUTER limit
from https://avoindata.suomi.fi/data/dataset/aluevesien-rajat . Do not use EEZ or
internal-water limits. Convert selected layers to EPSG:4326 GeoJSON outside the
project, preserving the original downloads and conversion commands, then run:

```sh
python scripts/prepare_geographic_points.py /tmp/finland-national.geojson /tmp/finland-territorial-outer.geojson /tmp/geographic-evaluation-points.json --land-source 'EXACT_SOURCE_URL' --land-layer 'EXACT_LAYER_NAME_AND_VERSION' --sea-source 'EXACT_SOURCE_URL' --sea-layer 'EXACT_LAYER_NAME_AND_VERSION'
python -m unittest discover -s scripts -p 'test_*.py'
```

This produces point groups, source hashes and scope statements, not interference
results. Polygon boundaries may include maritime segments; do not label every
segment a land border. National-grid point inclusion uses lon/lat ray casting;
holes are excluded. Boundary interpolation preserves source vertices and adds
linear lon/lat samples. No continuous geographic maximum is claimed.

Official territorial-sea line preparation (no user download required):

```sh
curl --fail 'https://julkinen.traficom.fi/inspirepalvelu/avoin/wfs?service=WFS&version=2.0.0&request=GetFeature&typeNames=avoin%3ATerritorialSeaArea_L&outputFormat=application%2Fjson&srsName=urn:ogc:def:crs:OGC::CRS84' -o /tmp/territorial-sea-outer-crs84.geojson
python scripts/prepare_territorial_sea.py /tmp/territorial-sea-outer-crs84.geojson src/data/territorial-sea-evaluation-points.json
```

The retrieved six features produce 360 unique samples at the initial 5 km
setting. Feature properties/source dates and response hash remain in the
artifact. National land-border/polygon acquisition is still pending; the
territorial-sea artifact must not imply a prepared national grid.

## National footprint and conditional sampled PFD

National samples now use geoBoundaries gbOpen FIN ADM0 **full**, revision
`9469f09`, boundary `FIN-ADM0-59408979`. Represented year 2017; source update
2023-01-19; build 2023-12-12. OpenStreetMap/Wambacher and geoBoundaries attribution,
layer license ODbL 1.0. This is **not** the previously proposed NLS source.
SHA256: `658462437b581dcad4ef68e01ed5b02ece8de641909c820cbcf05ccd506ea4c6`.
Åland is included; inland waters are not excluded. Polygon boundaries include
coastline/islands, not a verified land-border-only line or current legal survey.

```sh
python -m pip install shapely==2.2.0
curl -L --fail 'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/FIN/ADM0/geoBoundaries-FIN-ADM0.geojson' -o /tmp/finland-national.geojson
python scripts/prepare_national_sampling.py /tmp/finland-national.geojson /tmp/territorial-sea-outer-crs84.geojson /tmp/geographic-evaluation-points.json --source 'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/FIN/ADM0/geoBoundaries-FIN-ADM0.geojson' --layer 'gbOpen FIN ADM0 full; FIN-ADM0-59408979; revision 9469f09'
python scripts/calculate_geographic_space.py src/data/space3074-single-point-example.json /tmp/geographic-evaluation-points.json /tmp/space3074-geographic-example.json
```

Initial samples: 6,296 grid points, 351,725 national polygon-boundary samples
(source vertices retained), 360 territorial-sea outer-limit samples. Twelve
conditional sampled maxima evaluate four emission alternatives across three
groups. Original single-point result is unchanged. Limits/margins remain null.
Actual-path terrestrial field strengths and land-border validation are unresolved.

## Generic MDB preparation and browser import

Requires Python 3, openpyxl and mdbtools (`mdb-export`, `mdb-tables`). Keep outputs
outside the repository. The same commands accept other compatible IFIC issues;
future schema changes require review. AP30/AP30A/AP30B/non-GSO calculations are
not comprehensively implemented.

```sh
python scripts/run_preparation.py --excel /path/to/finland.xlsx --space /path/to/ific3074.mdb --space-issue 3074 --terrestrial /path/to/brific3076.mdb --previous-terrestrial /path/to/brific3075.mdb --output /tmp/review-run
```

Inventory checks prevent wrong MDB type. Terrestrial circular metadata is read;
the supplied Space issue must occur in notice metadata. Historical groups remain
retained, not newly modified. Outputs: `review-queue.json`, separate
`ificNNNN-review-results.csv`, raw exported tables, audits and optional comparison.
No automatic RF calculation occurs. Import `review-queue.json` into the website.

Browser limits: 30 MB and 100,000 rows. Required top-level fields: `scope`, `rows`.
Each row has `id`, `issue`, `kind` (space/terrestrial), `name`, `administration`,
finite-or-null `lowerMHz`/`upperMHz`, `frequencyRows`, `groupCount`, `matchedRows`
(Excel row numbers), `status`, `classifications`, `actionRaw`, `source`
(file/table/csvRow), `groupIds`, `blockers`, `calculationScope`.
Imported source/regulatory claims remain unverified. This generic `scope/rows` import is a transient offline workspace. The separate `/publications` inbox persists accepted Space/Terrestrial originals and evidence in Cloud before Scan, and Oma reads those stored uploads. Drafts are expert-approved and never sent. No measured time-saving or independently validated recognition accuracy is claimed.