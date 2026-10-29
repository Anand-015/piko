# Step 4 — Functional extension UI

This document records the synthetic Step 4 baseline. Step 5 adds a separate
[read-only scanner](06-form-scanner.md), with user-initiated `activeTab`/`scripting`
access. The demo workflow below remains disconnected from inspected metadata.

The Chrome side panel now demonstrates preparation, conversation, review, and
approval with synthetic data. The Python service remains the health-only API
from Step 3 and is not required to use this interface.

## Run and explore

From the repository root:

```bash
npm ci
npm --prefix apps/extension ci
npm run dev:extension
```

Load or reload `apps/extension/dist` in `chrome://extensions`, then open the
extension's toolbar action. Vite uses port 5173. Keep it running during
development. For a standalone production extension, use `npm run build` and
reload the same unpacked directory; no development server is needed.

1. **Idle:** see the application identity, runtime status, and workflow progress.
   The runtime label describes the lack of a UI connection, not the health of a
   separately running Python process.
2. **Load demo form:** a short mock inspection shows a skeleton, then loads five
   field definitions from the built-in fixture. It does not inspect the active tab.
3. **Start conversation:** read the scripted assistant question. The microphone
   button is disabled. Choose **Use sample answer** to create four proposed
   values from one predefined synthetic response.
4. **Missing information:** organization is required and remains unknown. The
   assistant explicitly asks for it. Use fictional details in the typed fallback,
   or leave it missing for manual completion.
5. **Typed fallback:** select a field, type its answer, and choose **Add typed
   answer**. This assigns text only to that field, with no language-model parsing.
   Choice answers use a dropdown with the allowed options.
6. **Review proposed values:** edit answers independently, inspect their source,
   and deselect anything to exclude. Sources distinguish demo data from values
   typed or edited by the user. Missing answers display “Not provided” and cannot
   be included until supplied. After supplying a missing value in review, select
   its inclusion checkbox explicitly.
   Clearing a previously selected answer automatically excludes it.
7. **Approval preview:** the summary contains only selected, supplied answers and
   their fictional destination. Empty selections disable approval. Invalid
   selected values show validation errors and prevent simulated approval.
8. **Simulate approval:** the result shows the exact selected values and says
   “0 values inserted.” Editing is locked until reset. This creates no real fill
   permissions and does not interact with a webpage.
9. **Reset session:** returns to idle and clears the active form, messages,
   draft, proposals, errors, and simulated approval. Reloading also starts idle.

Idle's **Demo scenarios → Show demo error** opens a clearly labeled synthetic
failure state, with a reset action. Reset is also available during mock inspection;
cleanup cancels the timer and the reducer rejects stale completion actions.

## Centralized state and components

`src/features/assistant/assistant.types.ts` defines the state, field types, and
proposal sources. `assistant.actions.ts` defines the allowed events and
`assistant.reducer.ts` guards transitions and validates selected answers.
`mock-data.ts` owns the five-field form, reserved test origin, fictional contact
details, and scripted response. Organization has no fabricated sample value.

| State | Permitted forward interaction |
| --- | --- |
| `idle` | Load the demo; show a simulated error |
| `inspecting-demo` | Finish mock inspection; reset |
| `ready` | Start conversation; reset |
| `conversation` | Add a sample or targeted text answer; open review; reset |
| `review` | Edit and select proposals; return to conversation; simulate approval; reset |
| `approval-simulated` | Inspect the frozen simulated batch; reset |
| `error` | Read the error; reset |

`RESET_SESSION` is accepted from every stage. Invalid forward transitions are
ignored. Approval while idle or conversing is impossible. Unknown field IDs do
not create proposals. Replaying the predefined answer cannot overwrite an
already supplied answer. Returning to conversation preserves edits and
exclusions. Required-but-missing values remain excluded from partial simulated
batches; they are never represented as complete.

The top-level `src/App.tsx` uses one reducer and passes state and callbacks to:

- `components/layout/`: `AppHeader`, `AppShell`, `WorkflowProgress`.
- `components/assistant/`: `RuntimeStatus`, `ConversationPanel`, `MessageBubble`,
  and `VoiceControls`.
- `components/review/`: `ProposedValueCard`, `ProposedValuesList`, and
  `ApprovalSummary`.
- `components/ui/`: the original button, card, badge, separator plus the newly
  generated input, textarea, checkbox, alert, and skeleton.

The CRXJS HTML entry and bootstrap remain under `src/sidepanel/`, alongside the
existing Tailwind/shadcn stylesheet. This preserves manifest and Vite paths while
putting the application and reusable components in the requested structure.
No second framework or routing dependency is introduced.

## Privacy and capability boundaries

All state lives only in React memory. No localStorage, IndexedDB, persistent
profile, telemetry, or network integration is added. There is no form scanner,
content script, browser-tab read, service request, AI call, audio capture,
playback, real approval token, insertion, or form submission. React modifies
only its own extension interface.

Production permissions remain exactly `sidePanel`. Development-only localhost
permissions and CSP exceptions remain those required by the existing CRXJS/Vite
hot-reload setup. The Step 2 contracts and companion service are unchanged.

## Verification

```bash
npm run build
npm run typecheck
npm run lint
npm test
npm run test:browser
```

Install Chromium once with `npx playwright install chromium` if needed. The
browser suite uses an isolated profile and the production extension. It checks
loading and keyboard activation, the conversation and typed fallback, every demo
field editor, exclusion from summaries, missing information, validation errors,
an empty selection, simulated approval, reset, reload, and the synthetic error.

The browser checks also verify the unchanged `sidePanel` permission, stored
toolbar behavior, no HTTP requests, no attempted microphone/speech/storage
capabilities, and no value changes or submission on a separate synthetic target
page. Review layouts are checked at 280, 360, and 480 pixels. Screenshots are
written to ignored `test-results/` for visual inspection.

`npm test` retains the existing contract and extension checks and adds eleven
reducer tests for invalid transitions, unknown fields, missing data, independent
edits, targeted typed answers, selection boundaries, final-state locking,
validation, error cleanup, and complete session reset.

Native Chrome toolbar clicking remains a manual platform check; the UI itself
is exercised automatically in Chromium. Live form scanning belongs to Step 5.
