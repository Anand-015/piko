# Step 5 — Deterministic read-only form scanner

The extension now inspects a webpage after explicit user activation and displays
bounded form metadata. It does not collect existing answers, call AI or the
Python service, fill fields, submit forms, capture audio, or grant approval.
The Step 4 synthetic conversation demo remains separate from scanned fields.

## Try the local fixture

From the repository root, in one terminal:

```bash
npm ci
npm --prefix apps/extension ci
npm run build
```

Load or reload `apps/extension/dist` in `chrome://extensions`. In a second terminal
at the repository root, serve only the synthetic fixtures on loopback:

```bash
python3 -m http.server 8787 --bind 127.0.0.1 --directory tests/fixtures
```

Windows PowerShell can use `py` instead of `python3`.

1. Open `http://127.0.0.1:8787/form-fixture.html` in Chrome.
2. Click Piko's toolbar action **on that tab**. This grants temporary `activeTab`
   access and opens the side panel. Merely opening an extension page or leaving
   the panel open while switching tabs does not grant access to a new page.
3. Choose **Inspect this page**. Verify the destination origin, two form groups,
   the field labels/types, required flags, options, constraints, and exclusions.
4. Confirm the inventory contains no prefilled names, email addresses, telephone
   numbers, textarea text, selected answers, or checkbox states. Option labels
   are public metadata; raw option values are never returned.
5. Click **Reveal conditional field** on the fixture. The inventory must become
   stale. Choose **Inspect again** to discover Additional details.
6. Click **Replace full name**. The old scan must become stale; a fresh inventory
   assigns new opaque IDs after replacement. None of the existing answers change.
7. Navigate to `empty-fixture.html` or switch tabs. The old inventory becomes
   stale. Inspection of the empty page shows an empty state.
8. **Clear scan** removes panel metadata and releases the observer/registry.
   Starting the synthetic demo also unmounts and clears the scanner panel.

The independent health API on ports 8765/8766 is not needed for scanning. For
extension hot reload use `npm run dev:extension`; the existing loopback-only Vite
setup remains intact. Production works without Vite.

## Permissions and packaged injection

Production requests exactly `sidePanel`, `activeTab`, and `scripting`. There are
no persistent host permissions, external-message declarations, or automatically
registered content scripts. Browser-internal pages, extension pages, file/data
URLs, and the Chrome Web Store are unsupported. Unavailable URLs or revoked
access produce instructions to activate the toolbar action on a normal HTTP(S)
page. Raw Chrome errors and page metadata are not logged.

`background/service-worker.ts` checks the active tab, imports the scanner via
CRXJS's `?script&iife`, and calls `chrome.scripting.executeScript` in the isolated
world, targeting only frame 0. The production build currently emits
`dist/src/content/form-scanner.js`; the worker uses the imported generated asset
path rather than assuming a hashed bundle filename. Its Chrome document ID pins
subsequent messages to the exact document. The standalone asset has no dynamic
imports or network dependency. CRXJS also declares this single packaged file as
web-accessible on HTTP(S) pages; this declaration grants no host access and does
not execute it automatically.

CRXJS's IIFE build prints a non-blocking warning that `inlineDynamicImports` is
ignored when code splitting is disabled. The existing Vite HMR deprecation
warning may also appear in development. Installed dependency files are not patched.

## Metadata contract and Step 2 compatibility

The original `form-field.schema.json` allows `currentValue`, original names,
and raw `options[].value`, because it predates the scanner privacy boundary.
Changing that entire shape would break the frozen interpretation fixtures.
Step 5 therefore adds only `definitions.scannerField` and a new
`form-scan.schema.json` that references it. Existing Step 2 schemas and fixtures
continue to validate, while scanner messages are validated against the new,
strict, `additionalProperties: false` contract.

The scanner result contains a scan ID, document ID, origin (no URL path/query),
form groups, field IDs, labels and label source/uncertainty, types, required,
visible/enabled/read-only/eligible flags, exclusion reasons, opaque option IDs,
disabled-option flags, bounded constraints, exclusion counts, and limitations.
It contains no current values, checked state, selected state, raw option values,
DOM selectors, HTML, page title, form action, or submission payload.

The extension generates a standalone Ajv validator before development, builds,
and type checks. The generator and declarations are tracked; generated JS is
ignored. The runtime validator performs no `eval` or dynamic function creation,
which keeps it compatible with Manifest V3's CSP. Both worker and side panel
validate metadata and reject duplicate IDs, incompatible eligibility, invalid
origins, unexpected properties, and oversized payloads.

## Eligibility, labels, and limits

Supported controls are text, email, tel, number, date, textarea, single select,
logical radio groups, and individual checkboxes. Radio grouping follows form
owner plus name, with separate groups for unnamed controls. Radio group labels
prefer the enclosing radiogroup/fieldset question; individual options retain
associated labels and separate opaque IDs, even when labels repeat.

For ordinary controls the label priority is associated labels, ARIA labelled-by,
ARIA label, fieldset legend, placeholder, then humanized name/id. Placeholder
and name/id fallbacks are explicitly uncertain and ineligible for automatic
processing. Text extraction stays inside those declared labeling nodes and
skips descendant inputs, textareas, selects, scripts, and hidden subtrees.
Labels are untrusted webpage strings rendered as text, never interpreted as code.

Hidden and sensitive controls return exclusion counts only, without labels or
IDs. Password, one-time-code, payment autocomplete tokens, and explicit identifier
patterns are excluded. Visible disabled/read-only fields, consent/terms/privacy/
marketing checkboxes, and uncertain labels may appear as metadata but are
ineligible. These metadata-only diagnostic records are not Step 2 AI proposal
inputs. Exclusion counts may overlap; skipped controls and logical radio groups
are not counted identically.

Visibility is approximate: connected document, nonzero layout boxes, computed
styles and ancestor hidden/ARIA-hidden/inert state. Native disabled fieldsets,
ARIA-disabled ancestors, readonly, and ARIA-readonly are considered separately.
Shadow DOM, iframe contents, custom widgets, and multi-select controls are out of
scope. CSS-only state changes without a relevant DOM mutation may require a
manual fresh scan.

Bounds: 5,000 candidate controls, 100 returned fields, 50 form groups, 50 options
per field, 256-character labels, 128-character option labels, and a 128 KB
validated payload limit. Field metadata has a smaller construction budget.
Truncated option sets are ineligible and the result reports a partial inventory.
Overlong labels are conservatively uncertain. Patterns are reported by presence
only, rather than copying arbitrary regex text.

## Scope, messaging, and lifecycle

The content script keeps element associations in weak maps and current-session
registries. Unchanged elements can keep IDs across explicit rescans, but a new
scan ID supersedes the previous scope. Relevant mutations invalidate registries
immediately; a debounced notice (150 ms) marks the UI stale. The observer then
stops until another explicit scan. It never repeatedly rescans on every mutation.
Replaced controls receive new IDs. Option IDs refer internally to DOM nodes;
actual option values remain on the page and are not read by this scanner.

Duplicate injection registers no extra listeners or observers. The service
worker validates caller URL, extension identity, message shape, sender frame,
and document scope. Navigation, tab closure, tab switches, and worker restarts
are handled conservatively. Newer requests supersede older requests without an
older rejection invalidating the newer result. Stale field IDs grant no rights.
The scanner exposes no write, fill, or approve messages.

## Validation and remaining manual checks

```bash
npm run build
npm run typecheck
npm run lint
npm test
npm run test:browser
```

The suite retains the Step 2 contract and Step 4 reducer/UI tests. Scanner unit
checks cover the strict contract, forbidden answer properties, raw option values,
ID uniqueness/scope, registry invalidation, message guards, restricted URLs,
sanitized failures, request races, and lifecycle events after worker-map loss.

Browser tests use the real packaged asset with a loopback HTTP fixture. Privacy
tripwires throw if isolated scanner code reads value/checked/selected properties,
writes answers, submits forms, accesses storage, or calls fetch. Tests assert
unchanged fixture markup and no input/change/submit events. They verify label
priority, all nine supported types, radio grouping, disabled options, exclusions,
opaque IDs, duplicate injection, empty/error/stale states, conditional sections,
replacement, label/option mutations, navigation, tab switches, metadata limits,
and layouts at 280/360/480 pixels. Screenshots are visually reviewed.

Headless Chromium cannot click its native toolbar action. The production build
is tested without a grant to verify denial; injection tests use an isolated copy
of the build with **only loopback host access** added for the fixture. The real
manifest remains free of host permissions. The native toolbar-grant-and-panel
sequence must still be tested manually in Chrome using the instructions above.
No real personal-data websites are needed for initial testing.

Stop at Step 5: form filling, AI mapping, voice, service authentication, profiles,
and real approval permissions remain unimplemented.
