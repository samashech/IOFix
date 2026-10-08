# IOfix

Photo-first circuit diagnostics for robotics builders. Primary users are the
founder and senior members of a student-led robotics club. Teaching is secondary.
The first evaluation target is robot controllers combining MCUs, motor drivers,
sensors, and multiple power rails; the product is not restricted to an Uno LED lab.

## Run

Node.js 22 or later; no npm dependencies.

```sh
npm run dev
```

Open http://127.0.0.1:5175. `npm test` runs the API and report-contract tests

## Current implementation

- Upload 1–4 circuit photos (PNG/JPEG/WebP, up to 4 MB each), including optional
  schematic images. No teaching checklist or prescribed circuit.
- Optionally provide intended behavior, symptoms, exact modules, power rails,
  reference text, logs, and measured values. Photo-only requests are supported.
- Discover locally installed LM Studio models that advertise vision support.
- Send the images to the selected model with a structured report schema.
- Validate responses, including evidence/photo references, before displaying them.
- Show observations, prioritized suspected faults, evidence, mechanisms, proposed
  fixes, verification steps, and limitations. No findings is a valid result.
- Cancel requests, reject stale results after input changes, and download report JSON.

This is an inference integration and diagnostic interface, **not a validated
advanced-circuit diagnostic model**. No model has been fine-tuned. A schema-valid
answer may still contain visual or electrical mistakes. No confidence score or
verified-fault badge is fabricated. Automated API/browser tests use an explicitly simulated model response and do
not measure real diagnostic accuracy.

## Local inference

The current target is the user's installed `prism-ml/bonsai-27b`,
`Bonsai-27B-Q1_0.gguf`, with `mmproj-Bonsai-27B-BF16.gguf`.
LM Studio reports architecture `qwen35`, vision capability, and 4.73 GB combined
files. This is the 1-bit 27B model, not a 6B or ternary model.

Start LM Studio's localhost server and load the model:

```sh
lms server start --bind 127.0.0.1 --port 1234
lms load prism-ml/bonsai-27b --context-length 8192 --ttl 1800
```

Refresh models in IOfix. The adapter discovers vision models through
`/api/v1/models` and sends image inputs and a JSON schema to
`/v1/chat/completions`. No weights are automatically downloaded. Invalid responses
are rejected rather than replaced with canned findings.

`IOFIX_MODEL_URL` can select another loopback HTTP port (default
`http://127.0.0.1:1234`). The current adapter requires LM Studio's model-discovery API
and an unauthenticated loopback server; remote endpoints are not enabled.
IOfix binds to loopback, restricts request origins, caps request sizes, allows
one analysis at a time, and uses a three-minute timeout. A large model on slow
hardware may require smaller inputs or a later timeout adjustment.

This model is an inference baseline, not yet adapted to circuit diagnosis.
See [model plan](docs/model-plan.md) for data collection and fine-tuning criteria.

## Data handling

Photos and context live in browser memory for this session. On Analyze they are
sent to the local model service. IOfix does not persist uploads or log bodies;
the model service has its own behavior. Report exports contain the case text and
photo filenames, but not image data. Refresh clears the current case.

## Next milestone

Evaluate real robot-controller cases from the club, including working controls,
ambiguous/occluded photos, known faults, and confirmed repairs. Benchmark Bonsai against another general
vision baseline before deciding whether or where fine-tuning helps.
Build retrieval from verified module documentation and deterministic electrical
checks after component identification and connection evidence are available.

[Product and evaluation plan](docs/model-plan.md).
The earlier teaching prototype is preserved in `prototypes/teaching-v0` and is not
served by the main app. The [game-story debugger](../project-ideas/game-story-debugger.md)
remains a separate saved idea.

## Browser checks

With the server running and Playwright available, run
`node scripts/check-browser.mjs`. `IOFIX_PLAYWRIGHT_MODULE` may point to an existing
Playwright module and `IOFIX_BROWSER` to a Chromium-compatible executable.
The script uses explicitly simulated model output and verifies uploads, report
rendering/export, stale-result rejection, failure states, and mobile layouts.

[Validation results](docs/validation.md): six API/contract tests and browser checks passed. A real Bonsai image request returned a valid no-fault report for a non-circuit image in 147.746 seconds. This is a compatibility check, not circuit-accuracy evidence.
