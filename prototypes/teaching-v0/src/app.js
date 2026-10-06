import { lab, sketch, newSession, answerCheck, issuesFor, restoreSession, mentorReport } from './lab.js';

const key = 'iofix.session.v1';
let session;
try { session = restoreSession(localStorage.getItem(key)); } catch { session = newSession(); }
const $ = selector => document.querySelector(selector);
const checks = $('#checks');
$('#sketch').textContent = sketch;
$('#notes').value = session.notes;

function save() {
  try { localStorage.setItem(key, JSON.stringify(session)); $('#save-status').textContent = 'Observations are saved in this browser.'; }
  catch { $('#save-status').textContent = 'Browser storage is unavailable. Download your mentor handoff before leaving.'; }
}

for (const [index, check] of lab.checks.entries()) {
  const field = document.createElement('fieldset');
  field.innerHTML = `<legend><span class="check-number">${String(index + 1).padStart(2, '0')}</span>${check.title}</legend><div class="choices">${[['yes', 'Yes'], ['no', 'No'], ['unknown', 'Not sure']].map(([value, label]) => `<label><input type="radio" name="${check.id}" value="${value}"><span>${label}</span></label>`).join('')}</div><details class="hint"><summary>Give me a hint</summary><p>${check.hint}</p></details>`;
  field.addEventListener('change', event => { session = answerCheck(session, check.id, event.target.value); save(); render(); });
  checks.append(field);
}

function render() {
  for (const radio of checks.querySelectorAll('input')) radio.checked = session.answers[radio.name] === radio.value;
  const count = Object.keys(session.answers).length;
  $('#progress').textContent = `${count} / ${lab.checks.length}`;
  $('#progress-bar').style.width = `${100 * count / lab.checks.length}%`;
  const issues = issuesFor(session);
  $('#issues').replaceChildren();
  if (!issues.length) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    const title = document.createElement('h3');
    title.textContent = count === lab.checks.length ? 'Your checks agree with the reference.' : 'Your observations lead the way.';
    const description = document.createElement('p');
    description.textContent = count === lab.checks.length ? 'Retest the actual circuit below. A checklist cannot rule out loose connections or faulty components.' : 'Answer a check to record a mismatch or something that needs verification.';
    empty.append(title, description); $('#issues').append(empty);
  }
  for (const issue of issues) {
    const card = document.createElement('article'); card.className = 'issue';
    card.innerHTML = `<span class="issue-status">${issue.status}</span><h3>${issue.issue}</h3><p>${issue.explanation}</p><details><summary>Show the next check</summary><p>${issue.action}</p></details>`;
    $('#issues').append(card);
  }
  $('#outcome').textContent = session.outcome === 'working' ? 'You reported a working LED. Your observations and earlier checks remain in the handoff.' : session.outcome === 'blocked' ? 'Ask a mentor to review the circuit. Download the handoff so they can see what you have already checked.' : '';
  $('#working').setAttribute('aria-pressed', String(session.outcome === 'working'));
  $('#blocked').setAttribute('aria-pressed', String(session.outcome === 'blocked'));
}

$('#notes').addEventListener('input', event => { session.notes = event.target.value; save(); });
for (const outcome of ['working', 'blocked']) {
  $(`#${outcome}`).addEventListener('click', () => { session = { ...session, outcome }; save(); render(); });
}
$('#export').addEventListener('click', () => {
  const url = URL.createObjectURL(new Blob([mentorReport(session)], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a'); link.href = url; link.download = 'iofix-mentor-handoff.md';
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('#reset').addEventListener('click', () => {
  if (!confirm('Start a new session? Download your mentor handoff first if you want to keep this session.')) return;
  session = newSession(); $('#notes').value = ''; save(); render();
});
render();
save();
