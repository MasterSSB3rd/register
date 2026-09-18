/**
 * Registration & Attendance backend.
 *
 * Deploy this as a Web App (Deploy > New deployment > Web app):
 *   - Execute as: Me
 *   - Who has access: Anyone
 * Then paste the resulting /exec URL into assets/js/config.js as
 * APPS_SCRIPT_URL.
 *
 * Required Script Properties (Project Settings > Script Properties):
 *   ADMIN_USERNAME         e.g. "admin"
 *   ADMIN_PASSWORD_HASH    SHA-256 hex hash of the admin password
 *                          (use the "Generate admin password hash" menu
 *                          item added to this project, or run
 *                          hashPasswordForSetup() from the editor once)
 *   SHEET_ID               the spreadsheet's ID (from its URL). Optional
 *                          if this script is bound to the sheet itself.
 *   PREVENT_DUPLICATES     "true" or "false" (defaults to true if unset)
 */

const SHEET_NAME = "Registrations";
const HEADERS = [
  "Time",
  "First Name",
  "Family Name",
  "E-mail",
  "Niveau d'étude",
  "Filière",
  "CNE",
  "Presence",
];
const SESSION_SECONDS = 6 * 60 * 60; // 6 hours — CacheService's maximum

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonResponse({ error: "Requête invalide." });
  }

  switch (data.action) {
    case "register":
      return handleRegister(data);
    case "adminLogin":
      return handleAdminLogin(data);
    case "listStudents":
      return handleListStudents(data);
    case "markPresent":
      return handleMarkPresent(data);
    case "logout":
      return handleLogout(data);
    default:
      return jsonResponse({ error: "Action inconnue." });
  }
}

function doGet() {
  return jsonResponse({ ok: true, message: "Registration API is running." });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

// ---------------------------------------------------------------------------
// Sheet helpers
// ---------------------------------------------------------------------------

function getSheet() {
  const sheetId = PropertiesService.getScriptProperties().getProperty("SHEET_ID");
  const ss = sheetId ? SpreadsheetApp.openById(sheetId) : SpreadsheetApp.getActiveSpreadsheet();

  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(SHEET_NAME);

  const firstRow = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const hasHeader = firstRow.some((v) => String(v).trim() !== "");
  if (!hasHeader) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }

  return sheet;
}

function readAllStudents(sheet) {
  const range = sheet.getDataRange().getValues();
  const students = [];
  for (let i = 1; i < range.length; i++) {
    const r = range[i];
    if (!r[1] && !r[2] && !r[3] && !r[6]) continue; // skip blank rows
    students.push({
      rowNumber: i + 1,
      time: r[0],
      firstName: r[1],
      familyName: r[2],
      email: r[3],
      niveau: r[4],
      filiere: r[5],
      cne: r[6],
      presence: r[7] || "No",
    });
  }
  return students;
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

function handleRegister(data) {
  const firstName = String(data.firstName || "").trim();
  const familyName = String(data.familyName || "").trim();
  const email = String(data.email || "").trim();
  const niveau = String(data.niveau || "").trim();
  const filiere = String(data.filiere || "").trim();
  const cne = String(data.cne || "").trim();

  if (!firstName) return jsonResponse({ field: "firstName", error: "Veuillez entrer votre prénom." });
  if (!familyName) return jsonResponse({ field: "familyName", error: "Veuillez entrer votre nom." });
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ field: "email", error: "Veuillez entrer une adresse e-mail valide." });
  }
  if (!niveau) return jsonResponse({ field: "niveau", error: "Veuillez sélectionner votre niveau d'étude." });
  if (!filiere) return jsonResponse({ field: "filiere", error: "Veuillez sélectionner votre filière." });
  if (!cne) return jsonResponse({ field: "cne", error: "Veuillez entrer votre CNE." });

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    return jsonResponse({
      error: "Une erreur est survenue lors de l'enregistrement. Veuillez réessayer.",
    });
  }

  try {
    const sheet = getSheet();
    const preventDuplicates =
      PropertiesService.getScriptProperties().getProperty("PREVENT_DUPLICATES") !== "false";

    if (preventDuplicates) {
      const students = readAllStudents(sheet);
      const cneLower = cne.toLowerCase();
      const emailLower = email.toLowerCase();
      const dupCne = students.find((s) => String(s.cne).trim().toLowerCase() === cneLower);
      if (dupCne) {
        return jsonResponse({ field: "cne", error: "Une inscription avec ce CNE existe déjà." });
      }
      const dupEmail = students.find((s) => String(s.email).trim().toLowerCase() === emailLower);
      if (dupEmail) {
        return jsonResponse({
          field: "email",
          error: "Une inscription avec cette adresse e-mail existe déjà.",
        });
      }
    }

    const time = Utilities.formatDate(new Date(), "Africa/Casablanca", "dd/MM/yyyy HH:mm:ss");
    // Presence is always written as "No" here — this is the only place a
    // row is created, and nothing in `data` can override it.
    sheet.appendRow([time, firstName, familyName, email, niveau, filiere, cne, "No"]);

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({
      error: "Une erreur est survenue lors de l'enregistrement. Veuillez réessayer.",
    });
  } finally {
    lock.releaseLock();
  }
}

// ---------------------------------------------------------------------------
// Admin authentication
// ---------------------------------------------------------------------------

function sha256Hex(text) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return bytes
    .map((b) => {
      const v = b < 0 ? b + 256 : b;
      return v.toString(16).padStart(2, "0");
    })
    .join("");
}

// Run this once from the Apps Script editor (Run > hashPasswordForSetup)
// to get a hash to paste into the ADMIN_PASSWORD_HASH script property.
// Edit the password below first, then check the execution log for the
// output — don't leave your real password sitting in this function.
function hashPasswordForSetup() {
  const password = "change-me";
  Logger.log(sha256Hex(password));
}

function handleAdminLogin(data) {
  const username = String(data.username || "").trim();
  const password = String(data.password || "");

  const props = PropertiesService.getScriptProperties();
  const expectedUsername = props.getProperty("ADMIN_USERNAME");
  const expectedHash = props.getProperty("ADMIN_PASSWORD_HASH");

  if (!expectedUsername || !expectedHash) {
    return jsonResponse({ error: "Configuration administrateur manquante côté serveur." });
  }

  if (username !== expectedUsername || sha256Hex(password) !== expectedHash) {
    Utilities.sleep(800); // slow down brute-force attempts
    return jsonResponse({ error: "Identifiants incorrects." });
  }

  const token = Utilities.getUuid();
  CacheService.getScriptCache().put("session_" + token, username, SESSION_SECONDS);
  return jsonResponse({ ok: true, token: token });
}

function isValidSession(token) {
  if (!token) return false;
  return !!CacheService.getScriptCache().get("session_" + token);
}

function handleLogout(data) {
  if (data.token) {
    CacheService.getScriptCache().remove("session_" + data.token);
  }
  return jsonResponse({ ok: true });
}

// ---------------------------------------------------------------------------
// Admin data
// ---------------------------------------------------------------------------

function handleListStudents(data) {
  if (!isValidSession(data.token)) {
    return jsonResponse({ error: "Session expirée. Veuillez vous reconnecter.", authError: true });
  }

  const sheet = getSheet();
  const students = readAllStudents(sheet).map((s) => ({
    time: s.time,
    firstName: s.firstName,
    familyName: s.familyName,
    email: s.email,
    niveau: s.niveau,
    filiere: s.filiere,
    cne: s.cne,
    presence: s.presence,
  }));

  const total = students.length;
  const present = students.filter((s) => s.presence === "Yes").length;
  const absent = total - present;
  const rate = total > 0 ? Math.round((present / total) * 1000) / 10 : 0;

  return jsonResponse({ students: students, stats: { total, present, absent, rate } });
}

function handleMarkPresent(data) {
  if (!isValidSession(data.token)) {
    return jsonResponse({ error: "Session expirée. Veuillez vous reconnecter.", authError: true });
  }

  const cne = String(data.cne || "").trim().toLowerCase();
  if (!cne) return jsonResponse({ error: "CNE manquant." });

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    return jsonResponse({ error: "Impossible de mettre à jour la présence. Réessayez." });
  }

  try {
    const sheet = getSheet();
    const students = readAllStudents(sheet);
    const target = students.find((s) => String(s.cne).trim().toLowerCase() === cne);

    if (!target) {
      return jsonResponse({ error: "Étudiant introuvable." });
    }

    sheet.getRange(target.rowNumber, 8).setValue("Yes"); // column H = Presence
    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: "Impossible de mettre à jour la présence. Réessayez." });
  } finally {
    lock.releaseLock();
  }
}
