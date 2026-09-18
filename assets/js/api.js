// Calls the Apps Script Web App. Uses "text/plain" as the content type on
// purpose: browsers only send a CORS preflight (OPTIONS request) for
// "non-simple" requests, and Apps Script Web Apps don't implement OPTIONS.
// text/plain keeps this a "simple" request, so it works cross-origin
// straight from GitHub Pages with no extra configuration. The body is
// still JSON — Code.gs parses it with JSON.parse regardless of the
// declared content type.
async function callApi(action, payload = {}) {
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("PASTE_YOUR")) {
    throw new Error(
      "APPS_SCRIPT_URL is not configured yet. Edit assets/js/config.js."
    );
  }

  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...payload }),
  });

  if (!res.ok) {
    throw new Error("Le serveur n'a pas répondu correctement.");
  }

  return res.json();
}
