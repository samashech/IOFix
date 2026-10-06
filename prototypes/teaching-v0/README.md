# FixLens

A robotics-club teaching companion: compare a build with a reference, record
observations, learn why a check matters, and hand a mentor the troubleshooting history.

## Run

Requires Node.js 22 or later. No dependencies or API keys.

```sh
cd /home/samashech/Documents/FixLens
npm run dev
```

Open http://127.0.0.1:5175. Run `npm test` for the domain checks.

## First working slice

One Arduino Uno lab: an external LED on D8 with a 220–330 ohm series resistor.
Students record yes/no/unknown observations, request hints, review structured
issues, add notes, report a physical retest, and export a Markdown mentor handoff.
Sessions persist in this browser. Starting a new session replaces that browser's
current session; download the handoff to retain it. Use one tab per session.

The schematic is a logical reference, not a breadboard placement diagram.
Findings are based on student input. The app does not inspect images, measure
voltage, communicate with the board, verify correctness, or diagnose arbitrary circuits.
No account, remote storage, or AI service is involved.

## Product direction

The founder works in a student-led robotics club teaching IoT. The first users
are beginners and their mentors. The product's hypothesis is that a structured,
teaching-oriented lab workflow helps learners and mentor handoffs more than an
unstructured conversation alone. This has not yet been validated.

Next validation: run one real club lab, observe where students get stuck, collect
permissioned reference/circuit photos and confirmed faults, and compare completion
time and understanding against the current teaching process. Do not claim accuracy
or time savings before measurement.

Next implementation, after selecting actual club hardware: add a verified breadboard
layout and photo capture with student-confirmed connection annotations. Introduce
automatic connection detection only against a labelled dataset and a measured
baseline. Keep uncertain connections explicit. Mentor accounts and a live dashboard
should wait until a workshop demonstrates the need.

## Acceptance for this slice

- A mismatch or uncertainty produces a relevant issue and follow-up check.
- Correcting an answer clears the current issue and preserves history.
- Positive answers do not automatically claim a working circuit.
- Reload preserves the session; malformed storage recovers safely.
- A mentor handoff includes observations, notes, history and the reported outcome.

Saved separate project idea: [game story debugger](../project-ideas/game-story-debugger.md).
