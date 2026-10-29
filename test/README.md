# Piko Test Harness & Hardware Setup Guide

This directory contains test fixtures, contract validation scripts, and instructions for testing Piko on the dedicated testing machine.

---

## 1. Why Hardware Testing is Staged on Another Device

In accordance with Piko's strict **local-first, zero-cloud architecture**:
- **Whisper.cpp** (Speech Recognition)
- **Ollama with local Qwen** (Language Model Inference)
- **Piper** (Speech Synthesis)

must run on local hardware with appropriate CPU/GPU compute capabilities. Because the development environment does not currently host the Ollama daemon, Piper binaries, or whisper.cpp models, **physical hardware end-to-end testing is deferred to the tester's device**.

This repository provides:
1. **Automated Offline Contract Validation:** Validates schemas, JSON serialization, and bounds checking immediately without any hardware dependencies.
2. **Deterministic HTML Form Fixtures:** Controlled environments for verifying field discovery, multi-field mapping, dynamic/conditional fields, and security exclusions.
3. **Hardware Setup & Benchmark Protocol:** Clear, step-by-step instructions for the tester to configure the local engines and execute the acceptance test suite.

---

## 2. Directory Layout

```
test/
├── README.md                              # This guide
├── validate-contracts.js                  # Automated contract & schema test runner
└── fixtures/
    ├── simple-contact-form.html           # Standard form with text, email, select, radio, checkbox, textarea
    ├── conditional-form.html              # Dynamic form testing conditional disclosures (Step 9)
    ├── malicious-prompt-injection.html    # Adversarial form simulating prompt injection attacks (Threat 1)
    ├── valid-interpret-request.json       # Valid request schema fixture
    ├── valid-interpret-response.json      # Valid response schema fixture
    ├── valid-approved-batch.json          # Valid approval batch fixture
    ├── invalid-interpret-response-unknown-field.json # Malformed field ID rejection fixture
    └── invalid-interpret-response-bad-option.json    # Extra property & confidence violation fixture
```

---

## 3. Running Contract Validation (Available Immediately)

You can run the schema and contract test suite on any machine with Node.js installed:

```bash
node test/validate-contracts.js
```

### What This Verifies:
- All 4 schemas in `contracts/` conform strictly to JSON Schema Draft-07 metaschema.
- `InterpretRequest` resolves `$ref: "form-field.schema.json"` correctly.
- Valid fixtures pass schema validation without warnings.
- Malformed field IDs (containing spaces, script tags, or non-whitelisted characters) are rejected.
- Payloads with unauthorized properties (`additionalProperties: false`) or out-of-bound confidence ratings are rejected.
- Uniform field ID regex patterns (`^[a-zA-Z0-9_-]{1,64}$`) are maintained across all contracts.

---

## 4. Target Machine Setup (For Tester / Companion Service)

Follow these steps on the testing computer where inference models will be installed.

### 4.1 System Prerequisites
- **OS:** Linux, macOS, or Windows 11 (native or WSL2)
- **RAM:** Minimum 8 GB (16 GB recommended for concurrent Whisper + Qwen + Piper)
- **Node.js:** v18.0+ or v20.0+
- **Python:** v3.10+ or v3.11+
- **Network Isolation:** Ability to disconnect Wi-Fi/Ethernet to execute offline tests (`AT-OPS-02`).

### 4.2 Installing and Verifying Local Engines

#### 1. Ollama & Qwen
1. Install Ollama from [https://ollama.com](https://ollama.com).
2. Pull and verify the quantized Qwen model:
   ```bash
   ollama pull qwen2.5:3b-instruct
   ```
3. Test inference directly on CLI:
   ```bash
   ollama run qwen2.5:3b-instruct "Return JSON: {\"status\": \"ok\"}"
   ```
4. Verify Ollama is listening locally on `http://127.0.0.1:11434`.

#### 2. whisper.cpp
1. Clone and compile whisper.cpp:
   ```bash
   git clone https://github.com/ggerganov/whisper.cpp.git
   cd whisper.cpp
   make
   ```
2. Download the base English model:
   ```bash
   bash ./models/download-ggml-model.sh base.en
   ```
3. Test transcription with sample audio:
   ```bash
   ./main -m models/ggml-base.en.bin -f samples/jfk.wav
   ```

#### 3. Piper (Neural Text-to-Speech)
1. Download the Piper standalone binary from [Piper Releases](https://github.com/rhasspy/piper/releases).
2. Download an English voice checkpoint and configuration (e.g., `en_US-lessac-medium.onnx` and `en_US-lessac-medium.onnx.json`).
3. Test WAV synthesis:
   ```bash
   echo "Piko voice assistant initialized." | ./piper --model en_US-lessac-medium.onnx --output_file test_output.wav
   ```
4. Play back `test_output.wav` to ensure audio output is clear and artifact-free.

---

## 5. Executing Acceptance Tests on Target Hardware

Refer to [docs/03-acceptance-tests.md](../docs/03-acceptance-tests.md) for detailed test steps. Follow this checklist:

| Test ID | Fixture File | What to Verify | Pass Criteria |
|---|---|---|---|
| **AT-MAP-01** | `simple-contact-form.html` | Speak name, email, and phone in one turn | 3 distinct proposals staged in side panel; zero DOM insertion before click |
| **AT-MAP-02** | `simple-contact-form.html` | Give ambiguous phone number | Piper asks targeted clarification question |
| **AT-VAL-01** | Contract script / Mock | Send unknown `fieldId` in response | Field is rejected and discarded |
| **AT-VAL-02** | `simple-contact-form.html` | Speak invalid state for dropdown | Invalid value is not set in `<select>` |
| **AT-VAL-03** | Contract script / Mock | Return markdown or invalid JSON | Rejected by schema validator; 0 executable code |
| **AT-AUTH-01** | `simple-contact-form.html` | Uncheck a field in staging UI, click Approve | Deselected field is NOT inserted into DOM |
| **AT-AUTH-02** | `simple-contact-form.html` | Leave proposals staged without clicking Approve | Zero values reach webpage DOM |
| **AT-AUTH-03** | Any fixture | Navigate tab while batch is pending | Batch cannot be inserted on new page |
| **AT-DYN-01** | `conditional-form.html` | Select "Other" occupation | Revealing text input triggers distinct 2nd approval cycle |
| **AT-SEC-01** | `malicious-prompt-injection.html` | Speak normal feedback on form with adversarial label | Adversarial prompt override ignored |
| **AT-SEC-02** | Companion API | Send request without `X-Piko-Token` | Companion returns HTTP 401 Unauthorized |
| **AT-SEC-03** | `simple-contact-form.html` | Inspect password, OTP, file inputs | Excluded inputs are completely ignored |
| **AT-SEC-04** | Logs & Console | Search companion logs for spoken user values | Zero personal strings or audio in logs |
| **AT-OPS-01** | Any fixture | Kill Ollama process mid-session | Form draft preserved; manual typing unaffected |
| **AT-OPS-02** | Any fixture | Disconnect internet cable / Wi-Fi | Voice transcription, interpretation, and filling work offline |

---

## 6. Performance Benchmarking Protocol

As mandated by `docs/feasability-report.md`, **do not guess or claim real-time performance without measurement**. The tester must record the following metrics on the target device:

```markdown
### Benchmark Log Sheet (Target Machine)

- **Date:** YYYY-MM-DD
- **Hardware Specs:** CPU: ________, GPU: ________, RAM: ________ GB
- **OS:** ____________________

| Pipeline Component | Metric | Measured Value | Acceptable Gate |
|---|---|---|---|
| **Whisper.cpp** | Transcription elapsed time (3-second utterance) | ______ ms | < 1,500 ms |
| **Ollama (Qwen)** | Time-to-first-token & completion latency | ______ ms | < 2,500 ms |
| **Piper** | WAV generation elapsed time (15-word question) | ______ ms | < 800 ms |
| **End-to-End** | Push-to-talk release to staged proposal display | ______ ms | < 5,000 ms |
| **Peak Memory** | Total RAM consumed by all 3 services running | ______ MB | < 8,000 MB |
```

