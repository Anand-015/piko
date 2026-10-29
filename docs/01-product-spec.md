# Piko Product Specification (MVP)

**Document ID:** `SPEC-PIKO-001`  
**Current Phase:** Step 2 — Requirements, Privacy Rules, and Data Contracts Freeze  
**Status:** Frozen for Review (Implementation Deferred to Step 3)  
**Author:** Senior Systems Architect  

---

## 1. Problem Statement

Filling web forms is repetitive, error-prone, and a frequent source of friction. Users encounter dense administrative portals, job application forms, multi-step checkout processes, and internal dashboards that repeatedly ask for common information or require manual transcription from notes.

Existing solutions present significant trade-offs:
1. **Cloud-based AI assistants** exfiltrate sensitive personal data, spoken audio, and complete webpage DOMs to third-party cloud infrastructure, violating strict privacy boundaries and enterprise security policies.
2. **Traditional browser autofill** is rigid, fails on non-standard form layouts or dynamic fields, lacks conversational context, and cannot disambiguate or synthesize unstructured spoken input into structured multi-field updates.
3. **Sequential voice assistants** dictate fields one by one, creating cognitive fatigue, slow interaction loops, and awkward error correction.

**Piko** solves this by providing a **local-first, voice-enabled Chrome form assistant**. It operates entirely within the user's local machine, parses complex spoken answers into structured form fields, presents a private preview for explicit approval, and fills forms deterministically without any data leaving the device.

---

## 2. Goals and Non-Goals

### 2.1 Primary Goals

- **G1 — Local-First Execution:** 100% of speech recognition (whisper.cpp), language modeling (Ollama with local Qwen), and speech synthesis (Piper) must execute on the local host. Zero cloud inference, zero telemetry, and zero external network calls.
- **G2 — Privacy-First Approval Gate:** No field value may ever be written to a webpage DOM without prior explicit user review and approval in an isolated extension UI.
- **G3 — Multi-Field Spoken Synthesis:** A single spoken utterance (e.g., *"My name is Jane Doe, my email is jane@example.com, and I prefer phone calls"*) must be accurately mapped across multiple distinct form fields.
- **G4 — Conversational Disambiguation:** When an answer is ambiguous, incomplete, or maps poorly to constrained controls (such as dropdowns), the assistant must ask targeted clarifying questions rather than guessing or hallucinating.
- **G5 — Dynamic Adaptation:** Support client-side form mutations and conditional disclosures (e.g., selecting "Other" revealing an explanation field) through sequential, isolated approval batches.
- **G6 — Manual Final Submission:** The user retains sole authority over form submission. Piko must never automatically trigger form submit actions.

### 2.2 Non-Goals (Out of Scope for MVP)

- **NG1 — Persistent User Profiles:** The MVP does not store personal profiles across browser restarts. All state is held in ephemeral session memory.
- **NG2 — Cloud Fallbacks or Hybrid Modes:** No fallback to remote LLM or STT APIs under degraded local performance. If local models are unavailable or underperforming, the assistant fails safely.
- **NG3 — Autonomous Form Submission:** Piko will not click "Submit", "Place Order", or navigate through multi-page wizard transitions automatically.
- **NG4 — Universal Website Compatibility:** The MVP does not claim compatibility with arbitrary canvas-based forms, proprietary shadow DOM frameworks, or heavily obfuscated anti-bot UIs.
- **NG5 — Real-Time Voice Streaming:** The MVP uses discrete push-to-talk turn-taking rather than full-duplex conversational streaming.
- **NG6 — Cross-Origin Iframe Manipulation:** Forms embedded inside cross-origin `<iframe>` elements are strictly excluded.
- **NG7 — CAPTCHA and Anti-Bot Solving:** Piko will never attempt to bypass, solve, or interact with CAPTCHA or proof-of-work challenges.

---

## 3. User Personas

### 3.1 Persona A: The Privacy-Conscious Professional ("Elena")
- **Role:** Regulatory compliance officer handling sensitive internal audit forms.
- **Needs:** Efficiently complete repetitive multi-page compliance forms without transmitting internal employee data or proprietary identifiers across external networks.
- **Pain Points:** Strict organizational bans on cloud AI tools (ChatGPT, cloud Copilots); browser autofill fails on custom enterprise web forms.

### 3.2 Persona B: The Multitasking Power User ("Marcus")
- **Role:** Operations specialist processing order dispute forms and vendor onboarding questionnaires.
- **Needs:** Dictate facts naturally while consulting separate physical or digital documents; review parsed proposals quickly and batch-apply them.
- **Pain Points:** Frustration with one-field-at-a-time voice dictation tools that require saying "tab, next field, type Jane...".

### 3.3 Persona C: The Assistive-Tech User ("David")
- **Role:** Individual with motor impairment requiring voice-first interaction for computer tasks.
- **Needs:** High-accuracy conversational guidance that minimizes manual keyboard navigation, clearly states what was understood, and allows voice or simple one-click confirmation.
- **Pain Points:** Inflexible voice software that inserts erratic text directly into active inputs without a confirmation buffer.

---

## 4. User Stories

| ID | User Role | Action / Need | Business / Functional Value |
|---|---|---|---|
| **US-01** | User | Activate Piko on an open web page with a form | The assistant inspects eligible visible fields and presents a form summary in the side panel. |
| **US-02** | User | Speak an answer containing multiple details using push-to-talk | The assistant maps spoken facts to distinct fields in a single processing turn. |
| **US-03** | User | Review proposed values in the side panel before any DOM insertion | The user inspects proposed values, edits text, or deselects individual fields. |
| **US-04** | User | Approve the staged batch with an explicit click | The extension fills only the approved fields, triggering native browser events (`input`, `change`). |
| **US-05** | User | Provide an ambiguous answer (e.g., "Yes" to a multi-option question) | The assistant detects ambiguity and asks a targeted clarification question via Piper TTS. |
| **US-06** | User | Navigate away or refresh the page while a batch is pending | Any existing permission token is instantly invalidated, preventing stale or cross-page insertion. |
| **US-07** | User | Encounter a form with a password or credit card field | Piko completely ignores sensitive fields, leaving them untouched for manual entry. |
| **US-08** | User | Interact with a form that reveals conditional fields after filling a dropdown | Piko detects new eligible fields and initiates a second review-and-approval cycle. |
| **US-09** | User | Review filled fields and verify completion | The extension reports any validation failures; the user clicks the website's native submit button manually. |

---

## 5. End-to-End Workflow (10-Step Lifecycle)

The system strictly executes according to the following 10-step sequence:

```
[1. User Activates]
       │
       ▼
[2. Discover Visible Fields] ──(Exclude passwords, OTPs, hidden, cross-origin iframes)
       │
       ▼
[3. Match Session Facts] ──────(Check ephemeral session memory for previously confirmed facts)
       │
       ▼
[4. Voice Assistant Disambiguates] ◄──(Push-to-talk speech input / Piper TTS clarification)
       │
       ▼
[5. User Reviews Proposals] ───(Staging area in Side Panel: edit, deselect, verify)
       │
       ▼
[6. Explicit Batch Approval] ──(Generates signed ApprovedFillBatch token in memory)
       │
       ▼
[7. Deterministic Filling] ────(Content script inserts ONLY approved values via native setters)
       │
       ▼
[8. Verification & Reporting] ─(Dispatch input/change events, verify DOM value & validity)
       │
       ▼
[9. Conditional Field Discovery] ──► [If new fields revealed: loop back to Step 3]
       │
       ▼ [No new fields]
[10. Manual User Submission] ──(User clicks website's native Submit button)
```

### Detailed Lifecycle Steps:

1. **Step 1: User Activates Extension**  
   The user opens the Chrome Side Panel on an active tab. Piko initializes a local session bound to `(tabId, origin, timestamp)`.
2. **Step 2: Field Discovery & Opaque ID Assignment**  
   The Content Script scans the active document DOM for visible, enabled, supported form fields. It generates opaque identifiers (`field_1`, `field_2`) and records a structural DOM hash (`domPathHash`). Raw DOM nodes and CSS selectors remain strictly inside the Content Script.
3. **Step 3: Fact Matching & Gap Analysis**  
   The system compares discovered fields against temporary session facts. Fields with confident, existing session data are staged; missing or incomplete fields are flagged for the conversational turn.
4. **Step 4: Voice Assistant Disambiguation & Push-to-Talk**  
   Piper synthesizes a concise question about missing fields. The user holds push-to-talk to speak. Audio is recorded locally, transcribed via whisper.cpp, and passed with the opaque field schemas to the companion service.
5. **Step 5: Review & Staging in Side Panel**  
   The LLM proposes updates conforming to `contracts/interpret-response.schema.json`. Proposed values are displayed in the Side Panel with checkboxes (default: checked) and editable text boxes.
6. **Step 6: Explicit User Approval**  
   The user clicks "Approve & Fill". This action generates an `ApprovedFillBatch` object in extension memory containing exclusively the checked, user-verified field-value pairs.
7. **Step 7: Deterministic Batch Filling**  
   The Content Script receives the batch, validates that the `formInstanceId` and `domPathHash` match the current live DOM, and sets values using native prototype setters (`HTMLInputElement.prototype.value`).
8. **Step 8: Verification & Failure Reporting**  
   The Content Script dispatches `input`, `change`, and `blur` events. It checks `element.value` and HTML5 `checkValidity()`. Any field that fails to accept the value is flagged in the Side Panel UI.
9. **Step 9: Dynamic & Conditional Field Handling**  
   A `MutationObserver` watches for newly revealed form controls triggered by earlier changes (e.g., dependent inputs). If detected, Piko assigns new opaque IDs and initiates a subsequent review cycle (Steps 3–8).
10. **Step 10: Manual Form Submission**  
    Once all desired fields are verified, Piko displays a "Ready for Submission" message. The user inspects the completed form and manually clicks the website's native "Submit" or "Continue" button.

---

## 6. Supported Form Fields & Controls

The MVP strictly supports standard HTML form controls that conform to predictable browser input semantics:

| Control Type | HTML Representation | Extraction Rules | Value Type | Insertion Semantics |
|---|---|---|---|---|
| **Text** | `<input type="text">` | Label from `<label>`, `aria-label`, placeholder | `string` (bounded) | `HTMLInputElement.prototype.value` |
| **Email** | `<input type="email">` | Validate email syntax | `string` | Native value setter + event dispatch |
| **Telephone** | `<input type="tel">` | Standardize phone formatting | `string` | Native value setter + event dispatch |
| **Number** | `<input type="number">` | Observe `min`, `max`, `step` | `string` or `number` | Native value setter + event dispatch |
| **Textarea** | `<textarea>` | Multi-line text inputs | `string` | `HTMLTextAreaElement.prototype.value` |
| **Select (Dropdown)** | `<select>` | Extract valid `<option>` values and text | `string` (must match option) | Match option `value` or label; set `selectedIndex` |
| **Radio Group** | `<input type="radio" name="x">` | Group by `name`, extract options | `string` (must match value) | Set `checked = true` on matched radio element |
| **Single Checkbox** | `<input type="checkbox">` | Extract label / affirmative intent | `boolean` | Set `checked = true | false` |
| **Date** | `<input type="date">` | Format as standard `YYYY-MM-DD` | `string` (ISO date) | Native value setter + event dispatch |

---

## 7. Excluded Fields and Boundaries

The following field categories are **strictly excluded** from automated discovery, extraction, staging, and filling:

1. **Passwords & Authentication Credentials:** `<input type="password">`, autocomplete `current-password`, `new-password`.
2. **One-Time Passcodes & MFA:** Autocomplete `one-time-code`, inputs with name/id matching `/otp|mfa|2fa|passcode|token/i`.
3. **Payment & Banking Data:** Credit card numbers (`cc-number`), CVV/CVC (`cc-csc`), expiration dates (`cc-exp`), bank account numbers (`iban`, `routing-number`).
4. **Government & Identity Identifiers:** SSN, Tax ID, National Insurance, Aadhaar, Passport numbers.
5. **CAPTCHA and Anti-Bot Challenges:** reCAPTCHA, hCaptcha, Cloudflare Turnstile, Arkose Labs frames.
6. **File Uploads:** `<input type="file">`.
7. **Hidden or Inaccessible Elements:** `<input type="hidden">`, `display: none`, `visibility: hidden`, `aria-hidden="true"`.
8. **Cross-Origin Iframes:** Form elements rendered inside `<iframe>` tags originating from a different origin than the top-level document.
9. **Disabled or Read-Only Inputs:** `<input disabled>`, `<input readonly>`.

When an excluded element is present on a page, Piko logs that the field is ignored due to security boundaries and displays a visual indicator reminding the user to complete it manually.

---

## 8. System Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CHROME BROWSER ENVIRONMENT                      │
│                                                                        │
│   ┌────────────────────────┐         ┌──────────────────────────────┐  │
│   │     CONTENT SCRIPT     │         │      EXTENSION SIDE PANEL    │  │
│   │                        │         │                              │  │
│   │  - DOM Discovery       │         │  - Push-to-Talk Recording    │  │
│   │  - Opaque ID Map       │         │  - Staging & Proposal UI     │  │
│   │  - MutationObserver    │         │  - Explicit Approval Gate    │  │
│   │  - Deterministic Fill  │         │  - Session Fact Memory       │  │
│   └───────────▲────────────┘         └──────────────▲───────────────┘  │
│               │ (chrome.runtime messaging)          │                  │
│               └──────────────────┬──────────────────┘                  │
│                                  │                                     │
│                     ┌────────────▼──────────────┐                      │
│                     │ BACKGROUND SERVICE WORKER │                      │
│                     │ - Tab lifecycle tracking  │                      │
│                     │ - Pairing token manager   │                      │
│                     └────────────┬──────────────┘                      │
└──────────────────────────────────┼─────────────────────────────────────┘
                                   │ Loopback HTTP (127.0.0.1:port)
                                   │ Headers: X-Piko-Token, Origin: chrome-extension://
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   LOCAL COMPANION SERVICE (Python / FastAPI)           │
│                                                                        │
│  - Endpoint: POST /api/v1/transcribe  ──► whisper.cpp                  │
│  - Endpoint: POST /api/v1/interpret   ──► Ollama (local Qwen)          │
│  - Endpoint: POST /api/v1/synthesize  ──► Piper TTS                    │
│  - Validation: Pydantic v2 Models & JSON Schema Middleware             │
│  - Privacy: Zero-log policy for audio and form payloads                │
└────────────────────────────────────────────────────────────────────────┘
```

### 8.1 Component Responsibilities

1. **Content Script:**
   - Evaluates form DOM nodes and produces sanitized `FormField` objects with opaque IDs (`f_1`, `f_2`).
   - Keeps private weak-map references from opaque IDs to live DOM nodes.
   - Monitors DOM additions/removals via `MutationObserver`.
   - Executes deterministic value insertions only upon receiving a validated `ApprovedFillBatch`.
2. **Side Panel (React + TypeScript + Vite + shadcn/ui):**
   - Coordinates user interaction: audio recording via `MediaRecorder` API, push-to-talk button.
   - Renders proposed updates with interactive checkboxes, input override boxes, and clear attribution.
   - Manages the ephemeral session facts in memory.
   - Renders status, error alerts, and manual completion reminders.
3. **Background Service Worker:**
   - Manages pairing credentials (`X-Piko-Token`).
   - Monitors tab navigation, origin switches, and tab destruction to invalidate active permissions.
4. **Local Companion Service (Python / FastAPI):**
   - Listens exclusively on `127.0.0.1` on a configurable non-standard port.
   - Enforces per-installation pairing authentication and Origin validation.
   - Interfaces directly with local CLI / HTTP wrappers:
     * `whisper.cpp` for fast CPU/GPU audio transcription.
     * `Ollama` running verified local Qwen model checkpoints.
     * `Piper` for neural text-to-speech WAV generation.
   - Validates all LLM inputs and outputs against strict Pydantic schemas.

---

## 9. Data Privacy Model

1. **Local-Only Boundary:** All data, speech recordings, and model weights reside on the user's physical machine. No network requests egress to public IP addresses or third-party cloud infrastructure.
2. **Ephemeral Session Memory:** Reusable personal facts (e.g., name, phone) collected during a form-filling session are held strictly in memory in the extension's side panel state. Closing the side panel, reloading the tab, or switching origins immediately purges all stored facts.
3. **No Persistent Profiles in MVP:** To eliminate the risk of local database compromise or unencrypted profile leaks, the MVP implements zero persistent data storage for personal details.
4. **Log Sanitization:** Application logs generated by FastAPI and the extension runtime must never contain raw audio, transcripts, field values, or personal identifiers. Logs record solely timestamped operation codes, execution latencies, and sanitized error classes.
5. **Pre-Insertion Approval Invariant:** Under no circumstance may any value be inserted into a web page before the user explicitly views the proposal in the side panel and confirms approval.

---

## 10. Error Handling & Recovery

| Failure Mode | Detection Mechanism | System Response | User Experience |
|---|---|---|---|
| **Companion service offline** | Health check fails (`GET /health`) | Extension disables voice input; displays connection error banner | Visual guidance to start local service: `piko-companion start`. |
| **Model returns malformed JSON** | Pydantic validation failure in companion service | Retries once with temperature 0.0; if failing again, returns HTTP 422 | Notifies user that interpretation failed; preserves draft facts; prompts for manual entry. |
| **Ambiguous spoken answer** | Model emits items in `clarifications` array | Piper synthesizes the clarification question; halts filling | User hears question (e.g., *"Did you mean your personal or work email?"*) and responds via push-to-talk. |
| **Element mutated / removed from DOM** | `domPathHash` or live node check fails prior to insertion | Insertion skipped for that specific field; marked as `stale_element` | Warning badge shown next to field in side panel: *"Field was modified by the page. Please fill manually."* |
| **Select / Radio value mismatch** | Proposed value does not match allowed options in schema | Value proposal rejected by schema validator | Field is listed with a dropdown selection prompt rather than inserting an invalid token. |
| **Navigation during active session** | Tab URL or Origin change detected by Service Worker | Active session cancelled; all permissions and staged batches revoked | Side panel resets to initial idle state; user must reactivate on the new page. |

---

## 11. MVP Boundaries vs. Post-MVP Roadmap

| Capability | In Scope for MVP | Deferred to Post-MVP |
|---|---|---|
| Local Speech-to-Text | whisper.cpp (push-to-talk) | Real-time streaming voice activity detection (VAD) |
| Local LLM Interpretation | Ollama + Qwen (quantized) | Multi-turn complex reasoning, fine-tuned agent models |
| Local Text-to-Speech | Piper (concise prompts) | Multi-voice emotion synthesis, interruption handling |
| Form Filling Scope | Standard visible single-page forms | Dynamic multi-page multi-step wizard navigation |
| Profile Storage | Ephemeral in-memory session | Encrypted local vault (AES-GCM-256) with password lock |
| Multi-Language Support | English only (verified models) | Multilingual STT/LLM/TTS verification |
| Field Types | Text, email, tel, number, select, radio, checkbox, textarea, date | Complex date-range pickers, custom canvas widgets |
| Final Action | Manual user submission | Optional user-confirmed automated submit |

---

## 12. Measurable Acceptance Criteria

To be considered complete and validated, the MVP implementation must satisfy the following empirical metrics:

1. **Zero Unapproved Insertions (Security Gate):** Across 100% of test runs, zero field values reach the target DOM without a prior explicit approval event recorded in the extension audit trail.
2. **Zero Network Egress (Privacy Gate):** Network inspection during end-to-end operation confirms 0 outbound bytes to non-loopback addresses (`127.0.0.1` / `::1`).
3. **Structured Mapping Accuracy:** Over a suite of 40 standardized form test cases, at least 95% of accurately transcribed spoken entities are correctly mapped to their corresponding target field IDs.
4. **Invalid Option Rejection Rate:** 100% of model proposals containing invalid dropdown or radio options are rejected at the schema validation boundary without reaching the DOM.
5. **Pipeline Latency Threshold (Hardware-Dependent Benchmark):**
   - *Target:* Push-to-talk release to staged proposal display under 5.0 seconds median on the reference benchmark machine.
   - *Note:* Performance metrics will be empirically recorded on the target hardware before publication. No real-time performance claims are made in this specification without physical measurement.

