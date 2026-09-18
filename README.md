# Registration & Attendance System — static site + Google Apps Script

A registration form (styled like Google Forms but running on your own
GitHub Pages site) that writes every submission to a Google Sheet, plus a
password-protected admin dashboard for checking students in at the door.

This version has **no server of its own** — GitHub Pages only serves static
files. The backend (talking to Google Sheets, checking the admin password,
issuing sessions) runs as a **Google Apps Script Web App**, which is free,
hosted by Google, and keeps your Sheet access and admin password out of the
browser.

- Students never see Google Sheets or any backend detail.
- Every new registration is written with **Presence = No**. Students cannot
  set or change this — the Apps Script only ever writes "No" when it
  creates a row.
- Only someone who logs in with the admin password can flip a student's
  Presence to **Yes**.

---

## 1. Project structure

```
├── index.html                  # Student registration form
├── admin/
│   ├── index.html               # Admin login  (admin/)
│   └── dashboard.html           # Admin dashboard (admin/dashboard.html)
├── assets/
│   ├── css/style.css
│   └── js/
│       ├── config.js            # ← your Apps Script URL + dropdown options
│       ├── api.js                # fetch wrapper for calling Apps Script
│       ├── register.js
│       ├── admin-login.js
│       └── admin-dashboard.js
├── apps-script/
│   └── Code.gs                   # Paste this into the Apps Script editor
└── .nojekyll                     # tells GitHub Pages not to run Jekyll
```

---

## 2. Set up the Google Sheet

1. Create a new Google Sheet (or reuse one). You don't need to type a
   header row — the script creates it automatically the first time it
   runs, in this exact order:

   `Time | First Name | Family Name | E-mail | Niveau d'étude | Filière | CNE | Presence`

2. Copy the Sheet ID from its URL:
   `https://docs.google.com/spreadsheets/d/THIS_PART/edit`

---

## 3. Create the Apps Script backend

1. From the Sheet, go to **Extensions > Apps Script**. This creates a
   script that's automatically bound to that spreadsheet (so you can skip
   step 4 below if you use this route).
   - Alternatively, go to https://script.google.com/ and create a
     standalone project — in that case you must set the `SHEET_ID`
     property in step 5.
2. Delete the default `Code.gs` contents and paste in the contents of
   `apps-script/Code.gs` from this project.
3. Save the project (give it a name, e.g. "Registration Backend").
4. *(Only if you created a standalone script)* you'll set `SHEET_ID` as a
   script property in the next step so it knows which spreadsheet to use.

### Configure script properties (your "environment variables")

In the Apps Script editor: **Project Settings** (gear icon) → **Script
Properties** → **Add script property**. Add:

| Property | Value |
|---|---|
| `ADMIN_USERNAME` | whatever admin username you want, e.g. `admin` |
| `ADMIN_PASSWORD_HASH` | see below — a SHA-256 hash of your admin password |
| `SHEET_ID` | the Sheet ID from step 2 (skip if the script is bound to the sheet) |
| `PREVENT_DUPLICATES` | `true` or `false` (optional — defaults to `true`) |

**To generate the password hash:**
1. In `Code.gs`, find `hashPasswordForSetup()` near the bottom and edit the
   `password` variable to your real admin password.
2. In the Apps Script editor toolbar, select the function
   `hashPasswordForSetup` from the dropdown and click **Run**. The first
   run will ask you to authorize the script — accept it.
3. Open **View > Logs** (or `Ctrl+Enter`) to see the hash it printed.
4. Copy that hash into the `ADMIN_PASSWORD_HASH` script property above.
5. Change the `password` variable in `hashPasswordForSetup()` back to
   something like `"change-me"` so your real password isn't left sitting
   in the script source, and save.

### Deploy it as a Web App

1. Click **Deploy > New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy**, authorize again if asked, and copy the **Web app
   URL** it gives you (ends in `/exec`).

That URL is your entire backend. Anyone can reach it (that's required —
it's what your public registration form calls), but every admin action
requires the password you set above.

---

## 4. Point the site at your deployment

Open `assets/js/config.js` and paste your Web App URL:

```js
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycb.../exec";
```

Same file lets you edit the `NIVEAU_OPTIONS` and `FILIERE_OPTIONS`
dropdowns.

---

## 5. Test it locally before publishing

You can't just double-click `index.html` (some browsers block `fetch` from
`file://` pages) — serve the folder locally instead, e.g.:

```bash
npx serve .
# or: python3 -m http.server 8080
```

Then open the printed local URL and:
1. Submit a test registration — check the Google Sheet for a new row with
   `Presence = No`.
2. Go to `/admin/`, log in with your admin username/password.
3. Search for the test student, click **Mark as Present**, confirm.
4. Check the Sheet again — `Presence` should now read `Yes`.

---

## 6. Publish on GitHub Pages

1. Create a new GitHub repository and push this whole folder to it:
   ```bash
   git init
   git add .
   git commit -m "Registration and attendance site"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```
2. On GitHub, go to the repo's **Settings > Pages**.
3. Under **Build and deployment**, set **Source** to "Deploy from a
   branch", branch **main**, folder **/ (root)**. Save.
4. GitHub gives you a URL like
   `https://YOUR_USERNAME.github.io/YOUR_REPO/` — that's your live
   registration form. The admin dashboard is at
   `https://YOUR_USERNAME.github.io/YOUR_REPO/admin/`.

Any time you edit a file, `git push` again and Pages updates automatically
within a minute or two.

---

## 7. Security notes and trade-offs

Being honest about what this architecture can and can't do, compared to a
real backend server:

- **The Apps Script URL is effectively public.** Anyone who has it can hit
  every action, including `adminLogin`. There's a short forced delay after
  a failed login to slow down guessing, but there's no real rate limiting
  or lockout — Apps Script doesn't give you the caller's IP to key that on.
  Use a genuinely strong admin password, and don't publish the Apps Script
  URL anywhere besides this codebase.
- **Sessions are simple tokens**, not signed JWTs — they're random UUIDs
  stored server-side in `CacheService` for up to 6 hours (Apps Script's
  cache limit), which is why an admin is logged out automatically after
  that long, even without clicking Logout.
- **Sessions live in `sessionStorage`** in the admin's browser tab, so
  they're cleared when the tab closes — normal for this kind of tool, but
  worth knowing if an admin expects to stay logged in across a full day.
- Google Sheets itself has API rate limits (roughly 100 requests per 100
  seconds per user by default) — plenty for a single event's check-in
  desk, but keep it in mind if several admins are hammering "Refresh" at
  once.

If you outgrow these limits — a bigger event, multiple admins, tighter
security requirements — the Node.js/Next.js version of this project (with
real server-side sessions and no publicly-guessable admin endpoint) is a
better fit; ask and it can be provided.

---

## 8. Editing dropdown options or the CNE format

- Dropdown options: edit `NIVEAU_OPTIONS` / `FILIERE_OPTIONS` in
  `assets/js/config.js`.
- CNE format: the form currently just checks the field isn't empty. To
  enforce a stricter format, add a regex check next to the other
  validation in `assets/js/register.js` (client side) and
  `apps-script/Code.gs`'s `handleRegister` function (server side — always
  keep both in sync, since the client-side check alone can be bypassed).
