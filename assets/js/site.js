// ---------------------------------------------------------------------------
// Shared UI: dark/light theme + English/French language switch.
// Uses the same localStorage key ("theme") as the main Master SSB site, so a
// visitor's theme choice can carry over between the two sites (same domain).
// Exposes window.SiteI18n for other scripts (register.js).
// ---------------------------------------------------------------------------
(function () {
  var root = document.documentElement;

  var STRINGS = {
    en: {
      dark: "Dark",
      light: "Light",
      pageTitle: "Registration – Master SSB",
      select: "Select…",
      submit: "Register",
      sending: "Sending…",
      errFirstName: "Please enter your first name.",
      errFamilyName: "Please enter your family name.",
      errEmailEmpty: "Please enter your email address.",
      errEmailInvalid: "Invalid email address.",
      errNiveau: "Please select your study level.",
      errFiliere: "Please select your field of study.",
      errCne: "Please enter your CNE.",
      errServerGeneric: "Something went wrong while saving. Please try again.",
    },
    fr: {
      dark: "Sombre",
      light: "Clair",
      pageTitle: "Inscription – Master SSB",
      select: "Sélectionner…",
      submit: "S'inscrire",
      sending: "Envoi en cours…",
      errFirstName: "Veuillez entrer votre prénom.",
      errFamilyName: "Veuillez entrer votre nom.",
      errEmailEmpty: "Veuillez entrer votre adresse e-mail.",
      errEmailInvalid: "Adresse e-mail invalide.",
      errNiveau: "Veuillez sélectionner votre niveau d'étude.",
      errFiliere: "Veuillez sélectionner votre filière.",
      errCne: "Veuillez entrer votre CNE.",
      errServerGeneric:
        "Une erreur est survenue lors de l'enregistrement. Veuillez réessayer.",
    },
  };

  var listeners = [];

  function store(key, value) {
    try { localStorage.setItem(key, value); } catch (e) { /* private mode */ }
  }

  function lang() {
    return root.getAttribute("data-lang") === "fr" ? "fr" : "en";
  }

  function t(key) {
    return (STRINGS[lang()] && STRINGS[lang()][key]) || key;
  }

  // --- Theme ---------------------------------------------------------------
  function renderThemeButton() {
    var dark = root.classList.contains("dark-mode");
    var text = document.getElementById("theme-text");
    var icon = document.getElementById("theme-icon");
    if (text) text.textContent = dark ? t("light") : t("dark");
    if (icon) {
      icon.classList.toggle("fa-moon", !dark);
      icon.classList.toggle("fa-sun", dark);
    }
  }

  function toggleTheme() {
    var dark = !root.classList.contains("dark-mode");
    root.classList.toggle("dark-mode", dark);
    store("theme", dark ? "dark" : "light");
    renderThemeButton();
  }

  // --- Language ------------------------------------------------------------
  function applyLang(l) {
    root.setAttribute("data-lang", l);
    root.setAttribute("lang", l);
    document.title = t("pageTitle");

    var langText = document.getElementById("lang-text");
    if (langText) langText.textContent = l === "fr" ? "EN" : "FR";

    // Placeholder options ("Select…") and any element tagged data-i18n
    document.querySelectorAll('select option[value=""]').forEach(function (o) {
      o.textContent = t("select");
    });
    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });

    renderThemeButton();
    listeners.forEach(function (fn) { fn(l); });
  }

  function toggleLanguage() {
    var next = lang() === "en" ? "fr" : "en";
    store("lang", next);
    applyLang(next);
  }

  window.SiteI18n = {
    lang: lang,
    t: t,
    onChange: function (fn) { listeners.push(fn); },
  };

  document.addEventListener("DOMContentLoaded", function () {
    var themeBtn = document.getElementById("theme-btn");
    var langBtn = document.getElementById("lang-btn");
    if (themeBtn) themeBtn.addEventListener("click", toggleTheme);
    if (langBtn) langBtn.addEventListener("click", toggleLanguage);

    var year = document.getElementById("year");
    if (year) year.textContent = new Date().getFullYear();

    applyLang(lang());
  });
})();
