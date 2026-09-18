// ---------------------------------------------------------------------------
// Site configuration — edit this file to point at your own Apps Script
// deployment and to change the dropdown options shown on the form.
// ---------------------------------------------------------------------------

// Paste the Web App URL you get after deploying apps-script/Code.gs
// (Deploy > New deployment > Web app). It looks like:
// https://script.google.com/macros/s/AKfycb.../exec
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxi4fk9f4yD5UuAXzbWvk12ugwP0V3YGE5nOewG3JHWpjh_Sc2t0ZN26jhF6i3V3FG6/exec";

// "Niveau d'étude" dropdown options, in the order they appear.
const NIVEAU_OPTIONS = [
  "Licence 1",
  "Licence 2",
  "Licence 3",
  "Master 1",
  "Master 2",
  "Doctorat",
];

// "Filière" dropdown options, in the order they appear.
const FILIERE_OPTIONS = [
  "Biologie",
  "Sciences Biomédicales et Qualité (SBQ)",
  "Evironnement Marin et Gestion des Bio-Ressources (EMGBR)",
  "Biologie et Technologie",
  "Bio-Analyses Médicales",
  "Biotechnologie et Environnement",
  "Pharmacologie et Développement Molécules (PDM)",
  "Other",
];
const MASTER_WEBSITE_URL = "https://masterssb3rd.github.io/master-ssb-test/";