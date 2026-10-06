export const lab = {
  id: 'uno-led-v1',
  title: 'Make your first LED blink',
  checks: [
    { id: 'upload', title: 'Did the Blink sketch upload successfully?', hint: 'The upload result tells you whether to start with software or wiring.', action: 'Select your Arduino Uno and its port, upload the sketch shown in the reference, and read the upload result.', issue: 'Sketch upload needs attention', explanation: 'A circuit cannot follow the intended program until that program reaches the board.' },
    { id: 'pin', title: 'Does the signal wire connect to digital pin 8?', hint: 'A correct connection to a different pin still will not match this sketch.', action: 'Disconnect USB power. Trace the wire from D8 to the resistor. Compare the board label with the reference.', issue: 'Signal pin needs checking', explanation: 'This exercise toggles D8. A wire on another pin will not receive that signal.' },
    { id: 'resistor', title: 'Is a 220–330 Ω resistor in series with the LED?', hint: 'Current must pass through the resistor and the LED in the same path.', action: 'With USB disconnected, verify the resistor value and trace D8 → resistor → LED → GND. Do not power the LED without its series resistor.', issue: 'Series resistor needs checking', explanation: 'The series resistor limits LED current. Both resistor leads in the same connected strip bypass the resistor.' },
    { id: 'polarity', title: 'Does the LED anode face the resistor and its cathode face GND?', hint: 'An LED allows current primarily in one direction.', action: 'With USB disconnected, check the LED markings. The flat side usually identifies the cathode; an untrimmed longer lead usually identifies the anode. Consult the component specification if unclear.', issue: 'LED orientation needs checking', explanation: 'A reversed LED can prevent current from flowing through the intended path.' },
    { id: 'nodes', title: 'Are the LED legs in separate, correctly connected breadboard strips?', hint: 'Nearby holes are not always connected, and some holes already share a conductor.', action: 'With USB disconnected, check your breadboard’s connection pattern. Place LED legs on separate nodes; connect the resistor to the anode node and GND to the cathode node. Check for split power rails.', issue: 'Breadboard connectivity needs checking', explanation: 'LED legs on the same electrical node have no intended voltage difference across them. Missing ground also breaks the current path.' },
  ],
};

export const sketch = `const int LED_PIN = 8;

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  delay(1000);
  digitalWrite(LED_PIN, LOW);
  delay(1000);
}`;

export function newSession() {
  return { version: 1, labId: lab.id, startedAt: new Date().toISOString(), answers: {}, history: [], notes: '', outcome: null };
}

export function answerCheck(session, id, answer) {
  if (!lab.checks.some(check => check.id === id) || !['yes', 'no', 'unknown'].includes(answer)) throw new Error('Invalid observation');
  return { ...session, answers: { ...session.answers, [id]: answer }, outcome: null,
    history: [...session.history, { at: new Date().toISOString(), check: id, answer }] };
}

export function issuesFor(session) {
  return lab.checks.filter(check => ['no', 'unknown'].includes(session.answers[check.id])).map(check => ({
    ...check, status: session.answers[check.id] === 'no' ? 'Student-reported mismatch' : 'Needs verification',
  }));
}

export function restoreSession(raw) {
  try {
    const value = JSON.parse(raw);
    if (value?.version !== 1 || value.labId !== lab.id || typeof value.startedAt !== 'string' ||
      !value.answers || typeof value.answers !== 'object' || Array.isArray(value.answers) ||
      !Array.isArray(value.history) || typeof value.notes !== 'string' ||
      ![null, 'working', 'blocked'].includes(value.outcome)) return newSession();
    for (const [id, answer] of Object.entries(value.answers)) {
      if (!lab.checks.some(c => c.id === id) || !['yes', 'no', 'unknown'].includes(answer)) return newSession();
    }
    if (!value.history.every(event => event && typeof event.at === 'string' && lab.checks.some(c => c.id === event.check) && ['yes', 'no', 'unknown'].includes(event.answer))) return newSession();
    return { version: 1, labId: lab.id, startedAt: value.startedAt, answers: value.answers, history: value.history, notes: value.notes, outcome: value.outcome };
  } catch { return newSession(); }
}

export function mentorReport(session) {
  const labels = { yes: 'Confirmed by student', no: 'Mismatch reported', unknown: 'Not sure' };
  return `# IOfix mentor handoff\n\nLab: ${lab.title}\nStarted: ${session.startedAt}\nOutcome: ${session.outcome === 'working' ? 'Student reports LED blinking' : session.outcome === 'blocked' ? 'Student requests mentor help' : 'Not retested yet'}\n\nEvidence source: student observations; no automated visual or electrical verification.\n\n## Current checks\n${lab.checks.map(c => `- ${c.title} ${labels[session.answers[c.id]] || 'Not checked'}`).join('\n')}\n\n## Student notes\n${session.notes || 'No notes added.'}\n\n## Observation history\n${session.history.map(e => `- ${e.at} — ${lab.checks.find(c => c.id === e.check).title} ${labels[e.answer]}`).join('\n') || 'No observations yet.'}\n`;
}
