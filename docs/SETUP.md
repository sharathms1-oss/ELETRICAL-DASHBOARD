# Setup: connect Google Sheet, host with Git

How it works: the React app is built into ONE `index.html`, which is served by a Google Apps Script web app. The script reads the workbook with the deployer's access and returns data only to signed-in company users. Managers never get access to the workbook. Git holds the code only, never company data.

## 1. Create the Apps Script project (once)
1. Go to script.google.com, then New project. Name it `Electrical Intelligence`.
2. Project Settings: tick "Show appsscript.json", then copy the Script ID.
3. Project Settings > Script properties, add:
   - `SPREADSHEET_ID` = id of the Solar Dashboard workbook (the long text in its URL)
   - `ALLOWED_DOMAIN` = your company domain, e.g. `bigbasket.com`
   - `ALLOWED_USERS` = optional, comma-separated emails. If set, only these people get in.
4. The Google account used to deploy must have at least view access to the workbook.

## 2. Push the code with clasp
```bash
npm install -g @google/clasp
clasp login
cp .clasp.json.example .clasp.json     # paste your Script ID inside
npm install
npm run deploy                          # builds the single file, then clasp push
```
`.clasp.json` is git-ignored.

## 3. Deploy the web app
Apps Script editor: Deploy > New deployment > Web app.
- Execute as: **Me**
- Who has access: **Anyone within your organisation** (domain)
First run asks you to authorise (spreadsheets read-only, email). Share the web app URL with managers. After later code changes run `npm run deploy`, then Deploy > Manage deployments > Edit > New version (the URL stays the same).

## 4. Check
Open the URL. You should see the dashboard and "Last refreshed". Data is cached 5 minutes; Refresh bypasses the cache. An outside account sees "Access denied".

## 5. Put the code on GitHub (private)
```bash
git init
git add .
git status                  # confirm: no dev-data.json, .clasp.json, node_modules, dist
git commit -m "Electrical Intelligence: live Google Sheet connection"
git branch -M main
git remote add origin https://github.com/<org>/electrical-intelligence.git
git push -u origin main
```
Create the repository as **Private** first. Add teammates under Settings > Collaborators.

## 6. Local development (optional)
The local site has no Google login, so it reads a git-ignored file.
1. In the Apps Script editor run `exportDevJsonToDrive` once. Authorise Drive when asked (add the Drive scope temporarily, or run the same code from a scratch script).
2. Download `dev-data.json` from your Drive and put it in `public/`.
3. `npm run dev` and open http://localhost:5173. Never commit or share that file.

## Please confirm with company IT
- Domain-restricted Apps Script web apps are allowed in your Workspace.
- The sheet's real headings match: Master Sheet, Store Registry, Vendor Estimate (names are set at the top of `backend/Solar.gs`). A missing heading gives a clear error message.
- `Session.getActiveUser()` returns the manager's email for same-domain users. If it returns blank, the app shows an access error and the setting must be reviewed.
