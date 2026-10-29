# Step 6 — Manual review and deterministic form filling

Step 6 extends the existing scanner and registry. No AI-generated values, local
service communication, audio, persistent profiles, submission, or navigation
are connected to filling. The earlier synthetic demo still simulates approval.

## Try it

From the repository root:

```powershell
npm ci
npm --prefix apps/extension ci
npm run build
py -m http.server 8787 --bind 127.0.0.1 --directory tests/fixtures
```

Reload `apps/extension/dist` in `chrome://extensions`. Open
`http://127.0.0.1:8787/form-fixture.html`, click the extension toolbar icon on
that tab, and choose **Inspect this page**. Under **Prepare manual answers**:

1. Include specific fields and enter synthetic values. Checkboxes require an
   explicit Checked or Unchecked choice; selects/radios use registered option IDs.
2. Choose **Review selected values**. This performs preflight without changing
   the page. Native constraints and existing-answer conflicts appear per field.
3. For an existing conflicting answer, separately select **Allow overwrite**
   for that field. Review again. Existing answers never appear in the panel.
4. Inspect the exact origin, tab, form, field, value, and overwrite decision.
   Check **I approve this exact batch and destination**, then approve and fill.
5. Read each result. Completed means every operation was retained or already
   matched. Partial means some changes may have occurred and some outcomes failed
   or could not be verified. Check the page before preparing another batch.

Deselecting or editing any proposal clears the UI review. A new successful
review invalidates older worker reviews for that tab. Clear scan, navigation,
tab switching, DOM staleness, and unmounting the scanner release scan context.

## Permission boundary

The worker accepts requests only from its own exact side-panel extension URL.
The panel supplies a tab/scan reference, never a trusted origin, document ID,
form ID, or execution grant. The worker resolves those from its current scan,
checks the actual tab URL and Chrome document, and binds each field to its form.
Unknown, excluded, mismatched, and unavailable options fail closed.

Successful preflight creates a memory-only review ID with a **60-second** expiry.
The final Approve message carries only this review ID. It cannot substitute new
values. The worker consumes the review before checking and issuing a new random
batch grant. The grant has a **10-second** lifetime, is delivered once to the
scan's Chrome document, and is never retried. Losing worker context requires a
new scan. Approval is not stored in localStorage, IndexedDB, or Chrome storage.

The content script accepts filling messages only from the worker URL declared
in its manifest. It checks origin, tab context established by worker preflight,
scan/document IDs, form owner node, registered DOM references, type, attributes,
eligibility, option identity, visibility, enabled state, native constraints, and
existing-value conflicts. Its replay set consumes valid grants before validation
and preserves failed attempts too. After 1,000 grants in one scan, it fails closed
until rescanned rather than evicting replay protection.

`contracts/approved-fill-batch.schema.json` now describes the actual runtime
grant (replacing Step 2's illustrative grant). Strict runtime guards also check
duplicates, expiry intervals, exact result IDs, and context. DOM references and
raw option values remain within the isolated registry. Existing answers are
read locally only during explicit preflight/commit and are not returned or logged.

## Mutation and verification

The complete batch passes preflight before any setter or page event runs.
Detached native control clones validate values; explicit length checks cover
the browser's programmatic minlength/maxlength behavior. Sanitized/normalized
values are rejected when they would differ from the approved string.

Commit rechecks each operation, uses native prototype property setters, and
dispatches bubbling input/change events. Radio approval covers the whole group;
select verification compares the selected option node, including duplicate raw
option values. No clicks, trusted-event simulation, debugger control, form submit,
requestSubmit, or deliberate navigation occur.

State is checked immediately and again after **100 ms**, including earlier fields
that later handlers may change. DOM replacement produces an unverified result;
page restoration produces a rejected result and a partial batch if writes occurred.
Unexpected website side effects cannot reliably be undone. Verification is a
bounded observation, not a guarantee against changes occurring after 100 ms.
Sites that ignore synthetic events and unsupported widgets require manual entry.
Framework updates to text-input defaultValue and textarea answer text do not
invalidate metadata; live answer/constraint checks still apply. Option/radio
values, labels, types, constraints, structure, and eligibility remain watched.
Attribute changes restored within one synchronous mutation batch are coalesced
against the final value, supporting React's temporary input-name resets.

Passwords, OTPs, payment credentials, detected identity fields, CAPTCHA, file
inputs, consent checkboxes, hidden/disabled/read-only/uncertain controls, custom
widgets, shadow DOM, and iframe contents remain excluded. No extension permissions
were added. No approved values go to a model or the Python service.

## Automated verification

```powershell
npm run typecheck
npm run build
npm run lint
npm test
npx playwright install chromium
npm run test:browser
```

If the bundled browser cannot start, use a compatible installed Chromium browser:

```powershell
$env:PIKO_CHROMIUM_PATH = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
npm run test:browser
```

Browser tests use a disposable copy of the production extension with **loopback
host access only** because headless tests cannot grant activeTab via the native
toolbar. The production manifest still has only sidePanel, activeTab, scripting.
The real React fixture is bundled locally for tests; no CDN is used.

The tests cover nine control kinds, all-or-nothing preflight, native constraints,
unknown/stale IDs and options, overwrite conflicts, exact/deselected approvals,
origin/tab/document/form binding, expired/replayed approvals, direct panel-to-
content rejection, worker context loss, React state retention/reversion, DOM
replacement, partial outcomes, untouched excluded/unapproved fields, zero submit
events, no outbound HTTP requests, and narrow panel layouts. Unit tests exercise
expiry with a clock rather than waiting for real time. The native toolbar grant
and site-specific behavior outside the synthetic fixtures still need manual QA.

Verified on Windows on 2026-10-30: production build, explicit TypeScript check,
lint, contract suite, 33 unit tests, and all 16 browser tests passed. Browser tests
ran against installed Edge 156 using PIKO_CHROMIUM_PATH; downloaded Chromium
could not start because Windows reported an invalid side-by-side configuration.
These are automated fixture results; the native toolbar grant and unrelated
websites were not manually certified.
