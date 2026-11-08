<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Challenge data preparation
- Keep reproducible offline input-normalization scripts in `scripts/` and small derived datasets or asset pointers in `src/data/`; externalize large outputs with lovable-assets and preserve raw values and row provenance so transformations can be audited.
- Never treat frequency preparation or overlap screening as a completed interference calculation; derived data must state its calculation and validation scope.
- Keep input-presence audits separate from regulatory-limit functions, and gate each narrow criterion on confirmed applicability; raw numeric fields alone do not establish a valid PFD case.
- Keep nominal-orbit single-point PFD estimates separate from regulatory comparisons and geographic maxima; conditional assumptions must travel with each result to prevent estimates being presented as compliance verdicts.
- Render offline calculation artifacts directly in the index evidence view and export the same artifact unchanged; the prototype must not silently recompute or upgrade a result in the browser.
- Scope terrestrial comparisons through publication history and current circular metadata; retain raw notification actions separately from presence differences because absence alone is not withdrawal evidence.
- Preserve associated transmitter locations for terrestrial RX notices and keep geographic areas distinct from point sites; Excel-only overlap must not be used as a national-relevance exclusion.
- Keep terrestrial coordination thresholds separate from propagation calculations, with explicit applicability and spectrum-conversion gates; channel spacing is not inferred from necessary bandwidth.
- Prepare propagation paths offline with explicit model-domain gates; out-of-domain paths remain unresolved and are never silently extrapolated or cleared.
- Prepare geographic samples offline from explicitly selected WGS84 layers with source hashes; keep territorial-sea limits separate from EEZ and label sample maxima rather than continuous maxima. Keep configurable review buffers separate from applicable regulatory limits so uncertainty is not silently converted into compliance.
- Use an offline review schema for browser imports and queues; preserve unresolved rows and derive correspondence from selected evidence so drafts cannot invent findings or send themselves.
- Keep MDB preparation in a CLI separate from browser artifact import; verify table inventory and issue metadata to prevent terrestrial/space file confusion.
- Use Shapely for large national-footprint inclusion tests; retain source vertices and label coastal/inland-water coverage so sampling is not presented as land-border validation.
- Publication scan UI loads immutable offline review artifacts, not live ITU detection or recalculation; shared review triage labels overlap as review-required and no-overlap as unresolved so neither is a regulatory risk verdict.
- Review-priority scores come from an offline script with editable weights in src/data/review-priority-settings.json; they order expert reading only and must never be labelled interference or compliance verdicts.
- Satellite PFD screening runs offline in scripts/screen_gso_pfd.py using limits in src/data/pfd-limits.json; the browser only displays the stored results, so every number is traceable to a script run.

## Copilot boundaries
- Keep Oma calls and evidence retrieval server-only; public guest streaming stores conversation/reviews only in the browser, while verified account streaming retains owner-scoped history/audit so guest and private activity remain isolated. Guest AI access blocks use a dedicated system-state key, never an account history row.
- UI actions use a validated allowlist and explicit tool results; completion remains an expert action and never changes technical evidence.
- Build the what-if catalog offline from immutable source artifacts with hashes; runtime interval overlap is a separate hypothetical assessment, never a PFD recalculation or full-IFIC coverage claim.
- Keep synthetic scenarios separate from real records, source counts, calculation artifacts and correspondence.
- Store validated uploads/original bytes in Cloud, scoped by account RLS or hashed guest capability; browser inbox is a cache so Oma reads fresh uploads. Desk transfer never upgrades evidence.
- Normalize validated Space publication/notices envelopes into the existing versioned demo inbox while retaining original bytes; enforce declared notice counts and service so compatibility never routes terrestrial uploads into the Space queue.
- Derive outstanding workload counters from stored evidence plus review states, showing synthetic contributions separately; browser review writes notify same-tab subscribers and storage events refresh other tabs without changing calculation artifacts.
- Persist the complete chat transcript but send only the latest six UI messages beginning on a user turn to the model, preserving embedded tool pairs; exact administration lookup uses a dedicated field rather than text search.
- Give Oma the latest user question separately in its system context; history may resolve explicit references but must not silently narrow standalone questions to earlier topics.
- Terrestrial review loads and validates the immutable screening asset in a browser-only cached queue; store versioned browser review states separately from technical evidence, and build selected-record Word drafts without satellite findings or inferred clearance.
- Space uses a paginated source-aware presentation adapter for real and transferred synthetic publications; preserve source-specific evidence and review ownership so a shared desk never merges synthetic technical findings into real artifacts.
- Geographic review tiers come from a shared editable team settings file and remain separate from calculation evidence; Oma terrestrial queries load the same validated current asset as the desk and aggregate before pagination to prevent summary-example undercounts.
- Uploaded Space `pfdScreening` is shown as stored, never recomputed.
- Preserve extra filing JSON; gate Changes on an earlier match to retain standard detail.
