# Validation — 2026-10-06

## Automated checks

- `node --test tests/diagnosis.test.js`: 6 tests passed. Covers image request shape,
  input bounds/types, evidence references, empty findings, local API integration,
  text-only model rejection, malformed output, offline service, origins and timeout.
- `scripts/check-browser.mjs`: passed with explicitly simulated model output.
  Photo selection/preview/removal, photo-only submission, model selection, report
  rendering/export, HTML-safe output, stale-result rejection and request failure
  were exercised. Desktop, 768px and 390px widths had no horizontal overflow.
- Desktop and mobile screenshots were inspected. No browser runtime errors.

## Real local Bonsai smoke test

LM Studio loaded `prism-ml/bonsai-27b` (Q1_0, architecture reported as qwen35), with
its BF16 vision projector, an 8192-token context, and a 30-minute idle TTL.
Combined model/projector files: 4,734,598,464 bytes (LM Studio API separately reports
4,734,614,604 bytes; the small accounting difference was not investigated).

A screenshot of the IOfix interface was sent through the actual `/api/analyze`
route with empty circuit context. The filename explicitly identified it as an
application screenshot, so this is not a blind visual-recognition benchmark.
The model returned HTTP 200 and a schema-valid report with no findings, stating
that the image did not show an electronic assembly. End-to-end latency was
147.746 seconds. The report remains an unverified model assessment.

This establishes runtime/image/schema compatibility, not fault-detection accuracy.
It was a negative-control smoke test, not a robot-circuit benchmark. The model also
used the supplied filename in an observation, reinforcing the need to evaluate
whether each future evidence claim is truly grounded in the image.

## Outstanding

- Real robot-controller photos with senior-confirmed fault and retest labels.
- Per-fault precision/recall, healthy-circuit false alarms, evidence grounding.
- Latency profiling: the first image request approached the three-minute timeout.
- Multi-image and larger real-circuit model evaluation (API shape supports 1–4).
- No model fine-tuning or automatic datasheet/netlist verification implemented.
