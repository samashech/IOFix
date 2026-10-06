# IOfix: robot-controller diagnosis and model plan

## Product decision — 2026-10-06

Primary job: a builder photographs a circuit and receives a structured account of
suspected faults, evidence, why each matters, how to correct it, and how to verify
that correction. Audience: the founder and seniors in their robotics club.
Teaching may later explain a result; it does not drive the workflow.

First evaluation family: robot controllers combining a microcontroller, motor
drivers, sensors, batteries/regulators, and multiple power/logic rails. Photo-only
input remains allowed. Ask for additional context only when needed to resolve an
actual uncertainty. Do not force users through a tutorial or fixed LED exercise.

## Report contract

Photo identifiers and specific visible observations support each finding. Separate
photo-based suspicions from hypotheses requiring measurements. Prioritize by
consequence, explain the mechanism, provide a conditional correction and a
verification step. Allow correct circuits and insufficient-evidence cases to return
zero findings. Neither a structured response nor a model's confidence is proof.

## Model candidate: PrismML Bonsai

The user's screenshot identifies `prism-ml/bonsai-27b` with
`Bonsai-27B-Q1_0.gguf`. Local inspection confirmed the weights (3,803,452,576 bytes)
and `mmproj-Bonsai-27B-BF16.gguf` (931,145,888 bytes), totaling 4.73 GB. LM Studio's
API reports architecture `qwen35`, parameter label `27B`, and vision capability.
This is the 1-bit version, not the ternary candidate initially inferred from “6”.
The parameter count is still 27B; compression reduces storage per weight.

The local installation is the source of truth for this artifact. Do not assume
newer online model-card revisions describe this exact file or its architecture.
Benchmark the installed checkpoint and projector together. Vendor aggregate scores
do not establish advanced-circuit accuracy or equivalence to an uncompressed model.

Sources checked 2026-10-06:
- https://huggingface.co/prism-ml/Bonsai-27B-gguf
- https://lmstudio.ai/docs/developer/openai-compat/structured-output
- https://lmstudio.ai/docs/developer/rest/list

Treat Bonsai as an inference candidate. Do not assume an arbitrary low-bit GGUF
checkpoint is directly trainable using standard LoRA recipes or supported by every
runtime. First verify the checkpoint, projector, runtime, license,
training weights and supported adaptation tooling. Quantized deployment size does
not describe training memory requirements.

## Proposed architecture, in stages

1. Establish a real vision-model baseline using photographs, optional context and
   the diagnostic schema. Current code implements the local LM Studio image and JSON-schema interface.
2. Ground exact component identities and limits in verified manufacturer/module
   documentation. Record document revision and provenance. Retrieval is planned,
   not implemented; pasted URLs are not fetched by today's app.
3. Extract visible connection candidates with per-edge uncertainty. Confirm critical
   ambiguous pins before reasoning about a circuit graph. Hidden traces remain
   unknown without schematic/netlist or measurements.
4. Apply deterministic checks where facts are established: net mismatches, logic
   voltage compatibility, power limits, and required references. Missing ground is
   not established merely because a wire is absent from one view.
5. Evaluate fine-tuning against errors observed in stages 1–4. Target component/pin
   recognition and evidence-grounded diagnosis using real verified cases, rather
   than generic IoT Q&A. Prefer a supported trainable vision-language checkpoint;
   re-evaluate any quantized deployment after adaptation.

## Data and evaluation before training

Begin with an exploratory pilot of 30–50 distinct assemblies/cases if the club can
supply them; this is a proposed pilot size, not a claim that it is enough to train
or establish reliable accuracy. Include healthy circuits, multiple simultaneous
faults, hard-to-read labels, occluded wiring, and faults that are invisible in photos.
Do not create hazardous faults on powered assemblies for a dataset.

For each case retain:
- Assembly identity, board/module revisions, photos from multiple views.
- Intended behavior, schematic/netlist if available, power configuration.
- Symptoms and actual measurements with units and conditions.
- Confirmed fault, evidence supporting it, repair and physical retest result.
- What cannot be inferred from the submitted photos alone.
- Reviewer and permission to use the data for evaluation/training.

Split by assembly/project before any training, not by individual photo: images of
the same build must not leak into both train and held-out test sets. Hold out board
variants where possible. Senior review must establish labels; generated diagnoses
must not silently become ground truth.

Measure fault precision/recall by class, false alarms on healthy builds, fabricated
connections/pin identities, unsupported repair suggestions, useful abstention,
correct next measurements, latency, and memory. Compare models using identical
inputs. Track diagnosis changes with and without schematic/measurement context.

Stop before fine-tuning until a baseline has reproducible errors, reviewed data
exists, and the selected checkpoint has a feasible adaptation path. Fine-tuning is
an experiment with a held-out comparison, not a promised improvement.

## Current limits

No real-circuit accuracy claims, automatic graph extraction, datasheet retrieval,
fine-tuning, or validated circuit-diagnosis accuracy. The photo workflow and local provider
contract can be exercised independently while the model and dataset are selected.
