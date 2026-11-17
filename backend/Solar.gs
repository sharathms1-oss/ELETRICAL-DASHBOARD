/** Reads the workbook (Store Registry, Master Sheet, Vendor Estimate) and returns the dashboard JSON. */
var SHEETS = { stores: 'Store Registry', master: 'Master Sheet', vendor: 'Vendor Estimate' };

function norm_(v) { return String(v == null ? '' : v).toLowerCase().replace(/[^a-z0-9]/g, ''); }
function tz_() { return Session.getScriptTimeZone(); }
function ym_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), 'yyyy-MM');
  var s = String(v == null ? '' : v).trim();
  var m = s.match(/^(\d{4})-(\d{2})/);
  return m ? m[1] + '-' + m[2] : null;
}
function ymd_(v) { return v instanceof Date ? Utilities.formatDate(v, tz_(), 'yyyy-MM-dd') : null; }
function numOrNull_(v) { return (typeof v === 'number' && isFinite(v)) ? v : null; }
function title_(s) { return String(s || '').trim().toLowerCase().replace(/\b[a-z]/g, function (c) { return c.toUpperCase(); }); }

/** Find header row (first row containing all wanted headers) and map normalised header -> column index. */
function table_(values, mustHave, from, to) {
  for (var r = 0; r < values.length; r++) {
    var map = {};
    for (var c = (from || 0); c < Math.min(values[r].length, to == null ? 999 : to); c++) {
      var k = norm_(values[r][c]); if (k && !(k in map)) map[k] = c;
    }
    if (mustHave.every(function (h) { return h in map; })) return { row: r, col: map };
  }
  return null;
}
function need_(t, name, sheet) { if (!t) throw new Error('Could not find the expected headings on sheet "' + sheet + '" (' + name + ').'); return t; }

function buildSolarData_() {
  var id = props_().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Server is not configured (SPREADSHEET_ID missing).');
  var ss = SpreadsheetApp.openById(id);
  var get = function (n) { var sh = ss.getSheetByName(n); if (!sh) throw new Error('Sheet not found: ' + n); return sh.getDataRange().getValues(); };

  // Store Registry
  var sv = get(SHEETS.stores);
  var st = need_(table_(sv, ['propertyname', 'installedcapacitykwp']), 'Store Registry', SHEETS.stores);
  var C = st.col, stores = [], byName = {};
  var idx = function (c, keys) { for (var i = 0; i < keys.length; i++) if (keys[i] in c) return c[keys[i]]; return -1; };
  var iId = idx(C, ['storeid']), iLoc = idx(C, ['location']), iCap = C['installedcapacitykwp'],
      iCd = idx(C, ['contractdemandkva']), iVen = idx(C, ['vendorname']), iSt = idx(C, ['installationstatus']), iDt = idx(C, ['installationdate']);
  for (var r = st.row + 1; r < sv.length; r++) {
    var row = sv[r], name = String(row[C['propertyname']] || '').trim();
    if (!name) continue;
    var s = { id: iId >= 0 ? row[iId] : '', name: name, location: iLoc >= 0 ? title_(row[iLoc]) : '',
      capacity: numOrNull_(row[iCap]), contractDemand: iCd >= 0 ? numOrNull_(row[iCd]) : null,
      vendor: iVen >= 0 ? (String(row[iVen] || '').trim() || null) : null, status: iSt >= 0 ? String(row[iSt] || '').trim() : '',
      installDate: iDt >= 0 ? ymd_(row[iDt]) : null, yearOneStart: null, estimates: {} };
    stores.push(s); byName[name] = s;
  }

  // Vendor Estimate: left table (first bill month) and right table (year-wise estimates)
  var vv = get(SHEETS.vendor);
  var L = table_(vv, ['propertyname', 'firstbillmonth']);
  if (L) for (r = L.row + 1; r < vv.length; r++) {
    var nm = String(vv[r][L.col['propertyname']] || '').trim(); if (!byName[nm]) continue;
    var ov = idx(L.col, ['startoverride']), y1 = idx(L.col, ['year1starts']);
    byName[nm].yearOneStart = (ov >= 0 && ym_(vv[r][ov])) || (y1 >= 0 && ym_(vv[r][y1])) || ym_(vv[r][L.col['firstbillmonth']]);
  }
  var R = need_(table_(vv, ['propertyname', 'operatingyear', 'estimatedkwh', 'assuredkwh'], 8), 'estimate table', SHEETS.vendor);
  for (r = R.row + 1; r < vv.length; r++) {
    var n2 = String(vv[r][R.col['propertyname']] || '').trim(), yr = vv[r][R.col['operatingyear']];
    var est = numOrNull_(vv[r][R.col['estimatedkwh']]), asr = numOrNull_(vv[r][R.col['assuredkwh']]);
    if (byName[n2] && typeof yr === 'number' && est !== null && asr !== null) byName[n2].estimates[String(yr)] = { est: est, assured: asr };
  }

  // Master Sheet
  var mv = get(SHEETS.master);
  var M = need_(table_(mv, ['propertyname', 'billmonth']), 'Master Sheet', SHEETS.master);
  var c = M.col, f = function (keys) { return idx(c, keys); };
  var iA = f(['solarunitgeneratedkwh']), iD = f(['deemedunitgeneratedkwh']), iP = f(['unitpricekwh', 'unitpricerskwh']),
      iI = f(['invoiceamount', 'invoiceamountrs']), iPr = f(['projectedvalue', 'projectedvaluers']),
      iSv = f(['savingsagainstprojection', 'savingsagainstprojectionrs']), iRs = f(['recordstatus']);
  var records = [];
  for (r = M.row + 1; r < mv.length; r++) {
    var mr = mv[r], pn = String(mr[c['propertyname']] || '').trim(), m = ym_(mr[c['billmonth']]);
    if (!pn || !m) continue;
    var g = function (i) { return i >= 0 ? numOrNull_(mr[i]) : null; };
    records.push({ s: pn, m: m, a: g(iA), d: g(iD), p: g(iP), i: g(iI), proj: g(iPr), sv: g(iSv), st: iRs >= 0 ? String(mr[iRs] || '') : '' });
  }
  return { generatedFrom: 'Google Sheet', generatedAt: new Date().toISOString(), stores: stores, records: records };
}

/**
 * LOCAL DEVELOPMENT ONLY. Run once from the Apps Script editor (as yourself).
 * Saves dev-data.json in your Drive; download it into the project's public/ folder
 * (git-ignored). Do not share that file.
 */
function exportDevJsonToDrive() {
  var f = DriveApp.createFile('dev-data.json', JSON.stringify(buildSolarData_()), MimeType.PLAIN_TEXT);
  Logger.log('Saved to your Drive: ' + f.getUrl());
}
