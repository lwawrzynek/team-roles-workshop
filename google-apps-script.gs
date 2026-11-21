// Team Roles Workshop – live results (Google Apps Script)
// Paste into: Google Sheet → Extensions → Apps Script. Then Deploy → New deployment → Web app
// (Execute as: Me · Who has access: Anyone) and paste the /exec address into the app.
const SHEET = 'Responses';
function sheet_() {
  const ss = SpreadsheetApp.getActive();
  let s = ss.getSheetByName(SHEET);
  if (!s) { s = ss.insertSheet(SHEET); s.appendRow(['updated', 'class', 'device', 'name', 'team', 'code']); s.setFrozenRows(1); }
  return s;
}
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function safe_(v, n) { v = String(v || '').slice(0, n); return /^[=+\-@]/.test(v) ? "'" + v : v; }
function doGet(e) {
  const p = (e && e.parameter) || {};
  const props = PropertiesService.getScriptProperties();
  if (p.action === 'init') {
    const cur = props.getProperty('KEY');
    if (cur && cur !== p.key) return out_({ ok: false, error: 'already-initialized' });
    if (!p.key || String(p.key).length < 12) return out_({ ok: false, error: 'bad-key' });
    props.setProperty('KEY', String(p.key)); sheet_();
    return out_({ ok: true });
  }
  if (p.action === 'list') {
    if (!p.key || p.key !== props.getProperty('KEY')) return out_({ ok: false, error: 'bad-key' });
    const v = sheet_().getDataRange().getValues(), rows = [];
    for (let i = 1; i < v.length; i++) {
      if (!p.k || String(v[i][1]) === p.k) rows.push({ at: String(v[i][0]), k: String(v[i][1]), d: String(v[i][2]), code: String(v[i][5]) });
    }
    return out_({ ok: true, rows: rows });
  }
  if (p.action === 'delete') {
    if (!p.key || p.key !== props.getProperty('KEY') || !p.k) return out_({ ok: false, error: 'bad-key' });
    const lock = LockService.getScriptLock(); lock.waitLock(25000);
    let deleted = 0;
    try {
      const s = sheet_(), v = s.getDataRange().getValues();
      for (let i = v.length - 1; i >= 1; i--) if (String(v[i][1]) === p.k) { s.deleteRow(i + 1); deleted++; }
    } finally { lock.releaseLock(); }
    return out_({ ok: true, deleted: deleted });
  }
  return out_({ ok: true, app: 'team-roles-workshop', initialized: !!props.getProperty('KEY') });
}
function doPost(e) {
  let b = {};
  try { b = JSON.parse(e.postData.contents); } catch (x) { return out_({ ok: false, error: 'bad-json' }); }
  if (!b.k || !b.d || !b.code || String(b.code).indexOf('HK1:') !== 0 || String(b.code).length > 45000) return out_({ ok: false, error: 'bad-request' });
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const s = sheet_(), n = s.getLastRow();
    let row = 0;
    if (n > 1) {
      const ids = s.getRange(2, 2, n - 1, 2).getValues();
      for (let i = 0; i < ids.length; i++) if (String(ids[i][0]) === String(b.k) && String(ids[i][1]) === String(b.d)) { row = i + 2; break; }
    }
    const vals = [[new Date().toISOString(), safe_(b.k, 40), safe_(b.d, 40), safe_(b.n, 60), safe_(b.t, 60), String(b.code)]];
    s.getRange(row || n + 1, 1, 1, 6).setValues(vals);
  } finally { lock.releaseLock(); }
  return out_({ ok: true });
}
