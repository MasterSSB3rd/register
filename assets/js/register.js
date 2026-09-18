function populateSelect(select, options) {
  for (const opt of options) {
    const el = document.createElement("option");
    el.value = opt;
    el.textContent = opt;
    select.appendChild(el);
  }
}

populateSelect(document.getElementById("niveau"), NIVEAU_OPTIONS);
populateSelect(document.getElementById("filiere"), FILIERE_OPTIONS);

const FIELDS = ["firstName", "familyName", "email", "niveau", "filiere", "cne"];

function clearErrors() {
  for (const f of FIELDS) {
    document.getElementById(`field-${f}`).classList.remove("has-error");
    document.getElementById(`error-${f}`).textContent = "";
  }
  const serverError = document.getElementById("server-error");
  serverError.style.display = "none";
  serverError.textContent = "";
}

function setFieldError(field, message) {
  const fieldEl = document.getElementById(`field-${field}`);
  const errorEl = document.getElementById(`error-${field}`);
  if (!fieldEl || !errorEl) return;
  fieldEl.classList.add("has-error");
  errorEl.textContent = message;
}

function getValues() {
  return {
    firstName: document.getElementById("firstName").value.trim(),
    familyName: document.getElementById("familyName").value.trim(),
    email: document.getElementById("email").value.trim(),
    niveau: document.getElementById("niveau").value,
    filiere: document.getElementById("filiere").value,
    cne: document.getElementById("cne").value.trim(),
  };
}

function validate(values) {
  const errors = {};
  if (!values.firstName) errors.firstName = "Veuillez entrer votre prénom.";
  if (!values.familyName) errors.familyName = "Veuillez entrer votre nom.";
  if (!values.email) {
    errors.email = "Veuillez entrer votre adresse e-mail.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "Adresse e-mail invalide.";
  }
  if (!values.niveau) errors.niveau = "Veuillez sélectionner votre niveau d'étude.";
  if (!values.filiere) errors.filiere = "Veuillez sélectionner votre filière.";
  if (!values.cne) errors.cne = "Veuillez entrer votre CNE.";
  return errors;
}

const form = document.getElementById("registration-form");
const submitBtn = document.getElementById("submit-btn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors();

  const values = getValues();
  const errors = validate(values);
  if (Object.keys(errors).length > 0) {
    for (const [field, message] of Object.entries(errors)) {
      setFieldError(field, message);
    }
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = "Envoi en cours…";

  try {
    const data = await callApi("register", values);

    if (data.error && data.field) {
      setFieldError(data.field, data.error);
    } else if (data.error) {
      const banner = document.getElementById("server-error");
      banner.textContent = data.error;
      banner.style.display = "block";
    } else if (data.ok) {
      document.getElementById("form-view").style.display = "none";
      document.getElementById("success-view").style.display = "block";
    }
  } catch (err) {
    const banner = document.getElementById("server-error");
    banner.textContent =
      "Une erreur est survenue lors de l'enregistrement. Veuillez réessayer.";
    banner.style.display = "block";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "S'inscrire";
  }
});

document.getElementById("restart-btn").addEventListener("click", () => {
  form.reset();
  clearErrors();
  document.getElementById("success-view").style.display = "none";
  document.getElementById("form-view").style.display = "block";
});
