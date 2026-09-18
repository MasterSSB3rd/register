// If a still-valid session already exists, skip straight to the dashboard.
if (sessionStorage.getItem("admin_token")) {
  window.location.href = "dashboard.html";
}

const form = document.getElementById("login-form");
const loginBtn = document.getElementById("login-btn");
const errorBox = document.getElementById("login-error");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorBox.style.display = "none";

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  if (!username || !password) {
    errorBox.textContent = "Nom d'utilisateur et mot de passe requis.";
    errorBox.style.display = "block";
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = "Connexion…";

  try {
    const data = await callApi("adminLogin", { username, password });

    if (data.error) {
      errorBox.textContent = data.error;
      errorBox.style.display = "block";
      return;
    }

    sessionStorage.setItem("admin_token", data.token);
    window.location.href = "dashboard.html";
  } catch (err) {
    errorBox.textContent = "Impossible de contacter le serveur.";
    errorBox.style.display = "block";
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Se connecter";
  }
});
