const t = (key) => SiteI18n.t(key);

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

// Validation errors are stored as translation keys so they can be re-rendered
// in the other language when the visitor switches EN/FR.
let localErrors = {};
let genericBannerShown = false;

function renderLocalErrors() {
  for (const [field, key] of Object.entries(localErrors)) {
    const errorEl = document.getElementById(`error-${field}`);
    if (errorEl) errorEl.textContent = t(key);
  }
  if (genericBannerShown) {
    document.getElementById("server-error").textContent = t("errServerGeneric");
  }
}

SiteI18n.onChange(renderLocalErrors);

function clearErrors() {
  localErrors = {};
  genericBannerShown = false;
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

// Returns { field: translationKey }
function validate(values) {
  const errors = {};
  if (!values.firstName) errors.firstName = "errFirstName";
  if (!values.familyName) errors.familyName = "errFamilyName";
  if (!values.email) {
    errors.email = "errEmailEmpty";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    errors.email = "errEmailInvalid";
  }
  if (!values.niveau) errors.niveau = "errNiveau";
  if (!values.filiere) errors.filiere = "errFiliere";
  if (!values.cne) errors.cne = "errCne";
  return errors;
}

const form = document.getElementById("registration-form");
const submitBtn = document.getElementById("submit-btn");
const submitLabel = document.getElementById("submit-label");

function setSubmitting(isSubmitting) {
  submitBtn.disabled = isSubmitting;
  // While sending, take the label out of the auto-translation so it isn't
  // reset to "Register" if the visitor toggles the language mid-request.
  if (isSubmitting) {
    submitLabel.removeAttribute("data-i18n");
    submitLabel.textContent = t("sending");
  } else {
    submitLabel.setAttribute("data-i18n", "submit");
    submitLabel.textContent = t("submit");
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearErrors();

  const values = getValues();
  const errors = validate(values);
  if (Object.keys(errors).length > 0) {
    localErrors = errors;
    for (const field of Object.keys(errors)) {
      setFieldError(field, "");
    }
    renderLocalErrors();
    return;
  }

  setSubmitting(true);

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
    genericBannerShown = true;
    banner.textContent = t("errServerGeneric");
    banner.style.display = "block";
  } finally {
    setSubmitting(false);
  }
});

document.getElementById("restart-btn").addEventListener("click", () => {
  form.reset();
  clearErrors();
  document.getElementById("success-view").style.display = "none";
  document.getElementById("form-view").style.display = "block";
});
