import test from 'node:test';
import assert from 'node:assert/strict';
import { newSession, answerCheck, issuesFor, restoreSession, mentorReport, lab } from '../src/lab.js';

test('uncertainty is not presented as a confirmed fault; correction preserves history', () => {
  let session = answerCheck(newSession(), 'pin', 'unknown');
  assert.equal(issuesFor(session)[0].status, 'Needs verification');
  session = answerCheck(session, 'pin', 'no');
  assert.equal(issuesFor(session)[0].status, 'Student-reported mismatch');
  session = answerCheck(session, 'pin', 'yes');
  assert.equal(issuesFor(session).length, 0);
  assert.deepEqual(session.history.map(e => e.answer), ['unknown', 'no', 'yes']);
  assert.match(mentorReport(session), /Mismatch reported/);
});

test('positive checks never automatically claim the circuit works', () => {
  let session = newSession();
  for (const check of lab.checks) session = answerCheck(session, check.id, 'yes');
  assert.equal(session.outcome, null);
  assert.match(mentorReport(session), /Not retested yet/);
  session.outcome = 'working';
  session = answerCheck(session, 'nodes', 'unknown');
  assert.equal(session.outcome, null);
});

test('session survives reload and invalid stored data recovers safely', () => {
  const session = answerCheck(newSession(), 'nodes', 'no');
  session.notes = '<script>example student note</script>';
  assert.deepEqual(restoreSession(JSON.stringify(session)), session);
  for (const raw of ['{', 'null', JSON.stringify({ ...session, history: [null] }), JSON.stringify({ ...session, answers: { bogus: 'yes' } })]) {
    assert.equal(restoreSession(raw).history.length, 0);
  }
});

test('rejects observations outside the lab schema', () => {
  assert.throws(() => answerCheck(newSession(), 'unknown-check', 'yes'));
  assert.throws(() => answerCheck(newSession(), 'pin', 'probably'));
});
