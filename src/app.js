const $ = selector => document.querySelector(selector);
const fields = ['purpose', 'symptoms', 'components', 'reference'];
let photos = [], modelsReady = false, controller = null, result = null, revision = 0;
const initialReport = $('#report').cloneNode(true);
function node(tag, text, className) {
  const el = document.createElement(tag); if (text !== undefined) el.textContent = text; if (className) el.className = className; return el;
}
function updateButton() { $('#analyze').disabled = Boolean(controller) || !modelsReady || !$('#model').value || !photos.length; }
function invalidate() {
  revision++; result = null;
  $('#report-actions').hidden = true;
  $('#report').replaceChildren(...Array.from(initialReport.childNodes, n => n.cloneNode(true)));
  $('#report-badge').textContent = photos.length ? 'READY FOR ANALYSIS' : 'AWAITING PHOTOS';
  $('#request-status').textContent = ''; updateButton();
}
async function refreshModels() {
  modelsReady = false; updateButton(); $('#refresh-models').disabled = true;
  $('#model-status').textContent = 'Checking the local model service…';
  try {
    const response = await fetch('/api/models', { signal: AbortSignal.timeout(15000) });
    const data = await response.json();
    $('#model').replaceChildren(new Option('Select a vision model', ''));
    if (!response.ok) throw new Error(data.error);
    for (const name of data.models) $('#model').add(new Option(name, name));
    if (data.models.length === 1) $('#model').value = data.models[0];
    modelsReady = data.models.length > 0; $('#model-status').textContent = data.message;
  } catch (error) { $('#model-status').textContent = error.name === 'TimeoutError' ? 'The model service did not respond. Start LM Studio’s local server and refresh.' : error.message; }
  finally { $('#refresh-models').disabled = false; updateButton(); }
}
function showPhotos() {
  $('#photo-list').replaceChildren();
  photos.forEach((photo, index) => {
    const item = node('figure'); const image = node('img'); image.src = photo.data; image.alt = `Photo ${index + 1}: ${photo.name}`;
    const caption = node('figcaption'); caption.append(node('span', `${index + 1} / ${photo.name}`));
    const remove = node('button', 'Remove'); remove.type = 'button'; remove.setAttribute('aria-label', `Remove photo ${index + 1}`);
    remove.addEventListener('click', () => { photos.splice(index, 1); invalidate(); showPhotos(); }); caption.append(remove); item.append(image, caption); $('#photo-list').append(item);
  });
  updateButton();
}
$('#photos').addEventListener('change', async event => {
  const files = [...event.target.files]; event.target.value = ''; $('#photo-error').textContent = '';
  if (photos.length + files.length > 4) { $('#photo-error').textContent = 'Use at most four images. Remove a photo before adding another.'; return; }
  const currentRevision = revision;
  try {
    const additions = await Promise.all(files.map(async file => {
      if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 4 * 1024 * 1024) throw new Error('Choose JPEG, PNG or WebP images under 4 MB each.');
      const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.onerror = () => reject(new Error('Could not read the image.')); reader.readAsDataURL(file); });
      await new Promise((resolve, reject) => { const image = new Image(); image.onload = resolve; image.onerror = () => reject(new Error('This file could not be decoded as an image.')); image.src = data; });
      return { name: file.name, data };
    }));
    if (currentRevision !== revision) { $('#photo-error').textContent = 'The case changed while loading photos. Please select them again.'; return; }
    photos.push(...additions); invalidate(); showPhotos();
  } catch (error) { $('#photo-error').textContent = error.message; }
});
for (const field of fields) $(`#${field}`).addEventListener('input', invalidate);
$('#model').addEventListener('change', invalidate);
$('#refresh-models').addEventListener('click', () => { invalidate(); refreshModels(); });
function section(title, text) { const block = node('div', undefined, 'finding-section'); block.append(node('h4', title), node('p', text)); return block; }
function listSection(title, values) {
  if (!values.length) return null;
  const block = node('section', undefined, 'list-section'); const list = node('ul');
  for (const value of values) list.append(node('li', value)); block.append(node('h3', title), list); return block;
}
function renderReport(data) {
  const report = data.report; const container = $('#report'); container.replaceChildren();
  container.append(node('p', report.summary, 'report-summary'));
  container.append(node('p', `${data.model} · ${new Date(data.generatedAt).toLocaleString()} · Not independently verified`, 'small'));
  const observations = listSection('Visible observations reported by the model', report.observations); if (observations) container.append(observations);
  if (!report.findings.length) container.append(node('p', 'No supported fault was identified. This does not establish that the circuit is correct.', 'no-findings'));
  for (const [index, finding] of report.findings.entries()) {
    const card = node('article', undefined, 'finding');
    card.append(node('p', `${String(index + 1).padStart(2, '0')} / ${finding.severity.toUpperCase()} PRIORITY · ${finding.basis === 'visible_evidence' ? 'PHOTO-BASED SUSPICION' : 'HYPOTHESIS'}`, 'finding-meta'), node('h3', finding.title));
    for (const evidence of finding.evidence) card.append(section(`Photo ${evidence.photo}`, evidence.detail));
    card.append(section('Why it may be wrong', finding.explanation), section('Proposed fix', finding.proposedFix), section('How to verify', finding.verification));
    const unknowns = listSection('Still unknown', finding.unknowns); if (unknowns) card.append(unknowns); container.append(card);
  }
  for (const [title, values] of [['Limitations', report.limitations], ['Next checks', report.nextChecks]]) { const block = listSection(title, values); if (block) container.append(block); }
  $('#report-badge').textContent = 'REVIEW REQUIRED'; $('#report-actions').hidden = false;
}
$('#case-form').addEventListener('submit', async event => {
  event.preventDefault(); if (controller || !photos.length || !$('#model').value) return;
  invalidate(); const submittedRevision = revision;
  const input = { photos: photos.map(p => ({ ...p })), model: $('#model').value, ...Object.fromEntries(fields.map(id => [id, $(`#${id}`).value])) };
  controller = new AbortController(); $('#cancel').hidden = false; updateButton();
  $('#request-status').textContent = 'Inspecting the photos with your local model. This can take up to three minutes.'; $('#report-badge').textContent = 'ANALYZING';
  try {
    const response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: controller.signal });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Analysis failed.');
    if (submittedRevision !== revision) { $('#request-status').textContent = 'The case changed during analysis. Run it again to inspect the updated circuit.'; return; }
    result = { ...data, input: { ...input, photos: input.photos.map(({ name }, index) => ({ photo: index + 1, name })) } };
    renderReport(data); $('#request-status').textContent = 'Report ready. Check the evidence before applying a proposed change.';
  } catch (error) {
    $('#request-status').textContent = error.name === 'AbortError' ? 'Analysis cancelled. No report was accepted.' : error.message;
    $('#report-badge').textContent = 'NO REPORT';
  } finally { controller = null; $('#cancel').hidden = true; updateButton(); }
});
$('#cancel').addEventListener('click', () => controller?.abort());
$('#download').addEventListener('click', () => {
  if (!result) return;
  const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' }));
  const link = node('a'); link.href = url; link.download = 'iofix-diagnostic-report.json'; document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
refreshModels();
