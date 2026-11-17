/**
 * Data access. The dashboard never contains company data in its code.
 *
 *  - Production (hosted inside the Apps Script web app): calls the server
 *    function getSolarData() through google.script.run. Sign-in and the
 *    allowed-user check are enforced by the backend (backend/Code.gs).
 *  - Local development (npm run dev): reads /dev-data.json from the public
 *    folder. That file is created by running exportDevJsonToDrive() in the
 *    backend and is git-ignored, so it is never committed.
 */
const inAppsScript = () =>
  typeof window !== "undefined" && window.google && window.google.script && window.google.script.run;

export function fetchSolarData(force = false) {
  if (inAppsScript()) {
    return new Promise((resolve, reject) => {
      window.google.script.run
        .withSuccessHandler((json) => {
          try {
            resolve(typeof json === "string" ? JSON.parse(json) : json);
          } catch (e) {
            reject(new Error("The server returned data the dashboard could not read."));
          }
        })
        .withFailureHandler((err) => reject(new Error((err && err.message) || String(err))))
        .getSolarData(!!force);
    });
  }
  const noSource = () => new Error("No data source. Local development needs public/dev-data.json - see docs/SETUP.md, step 6.");
  return fetch("/dev-data.json", { cache: "no-store" })
    .then((r) => { if (!r.ok) throw noSource(); return r.text(); })
    .then((t) => { try { return JSON.parse(t); } catch (e) { throw noSource(); } });
}
