/**
 * Electrical Intelligence - backend (Google Apps Script web app).
 *
 * Script Properties (Project Settings > Script properties) - never put these in code:
 *   SPREADSHEET_ID   id of the Solar Dashboard workbook (required)
 *   ALLOWED_DOMAIN   e.g. bigbasket.com (required)
 *   ALLOWED_USERS    optional comma-separated emails; if set, ONLY these people get in
 *
 * The web app runs as the person who deployed it, so managers need no access
 * to the workbook itself. They only get what getSolarData() returns (read-only).
 */
function props_() { return PropertiesService.getScriptProperties(); }

function authorise_() {
  var email = (Session.getActiveUser().getEmail() || '').toLowerCase();
  var domain = (props_().getProperty('ALLOWED_DOMAIN') || '').toLowerCase();
  var list = (props_().getProperty('ALLOWED_USERS') || '').toLowerCase()
    .split(',').map(function (s) { return s.trim(); }).filter(String);
  if (!email) throw new Error('Could not identify your account. Sign in with your company Google account.');
  if (!domain) throw new Error('Server is not configured (ALLOWED_DOMAIN missing).');
  if (email.slice(-(domain.length + 1)) !== '@' + domain) throw new Error('Access is limited to company accounts.');
  if (list.length && list.indexOf(email) < 0) throw new Error('Your account has not been given access. Contact the dashboard administrator.');
  return email;
}

function doGet() {
  try { authorise_(); }
  catch (e) {
    return HtmlService.createHtmlOutput('<p style="font:16px sans-serif;padding:40px">Access denied. ' + e.message + '</p>')
      .setTitle('Electrical Intelligence');
  }
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('Electrical Intelligence')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
}

/** Called by the dashboard. Re-checks the user on every call. Returns a JSON string. */
function getSolarData(force) {
  authorise_();
  var cache = CacheService.getScriptCache();
  if (!force) {
    var n = Number(cache.get('solar_n'));
    if (n) {
      var parts = [];
      for (var i = 0; i < n; i++) parts.push(cache.get('solar_' + i));
      if (parts.every(function (p) { return p !== null; })) return parts.join('');
    }
  }
  var json = JSON.stringify(buildSolarData_());
  var size = 90000, chunks = [];
  for (var p = 0; p < json.length; p += size) chunks.push(json.slice(p, p + size));
  try {
    chunks.forEach(function (c, i) { cache.put('solar_' + i, c, 300); });
    cache.put('solar_n', String(chunks.length), 300);
  } catch (e) { /* cache is an optimisation only */ }
  return json;
}
