const CAP_FORMS_CONFIG = window.CAP_FORMS_CONFIG || {};
const WORDPRESS_AJAX_URL =
  typeof CAP_FORMS_CONFIG.ajaxUrl === "string" && CAP_FORMS_CONFIG.ajaxUrl
    ? CAP_FORMS_CONFIG.ajaxUrl
    : new URL("/wp-admin/admin-ajax.php", window.location.origin).href;
const WORDPRESS_CONFIG_ACTION = "cap_forms_get_config";
const WORDPRESS_ACTIONS = Object.freeze({
  contact: "cap_submit_contact",
  dpo: "cap_submit_dpo",
});

let formNonce = typeof CAP_FORMS_CONFIG.nonce === "string" ? CAP_FORMS_CONFIG.nonce : "";
let formConfigPromise;

function setupMenu() {
  const button = document.querySelector("[data-menu-toggle]");
  const menu = document.querySelector("[data-menu]");
  if (!button || !menu) return;

  const closeMenu = () => {
    button.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-is-open");
  };

  button.addEventListener("click", () => {
    const isOpen = button.getAttribute("aria-expanded") === "true";
    button.setAttribute("aria-expanded", String(!isOpen));
    document.body.classList.toggle("menu-is-open", !isOpen);
  });

  menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
}

function setupHeader() {
  const header = document.querySelector("[data-header]");
  if (!header) return;

  const updateHeader = () => header.classList.toggle("is-scrolled", window.scrollY > 20);
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });
}

function setupWoodSelector() {
  const selector = document.querySelector("[data-wood-selector]");
  if (!selector) return;

  const featureImage = selector.querySelector("[data-wood-image]");
  const featureName = selector.querySelector("[data-wood-name]");
  const featureDescription = selector.querySelector("[data-wood-description]");
  const tabs = [...selector.querySelectorAll("[data-wood-tab]")];

  if (!featureImage || !featureName || !featureDescription || !tabs.length) return;
  let currentIndex = tabs.findIndex((tab) =>
    tab.classList.contains("is-active")
  );
  if (currentIndex < 0) currentIndex = 0;
  let autoPlay;
  const activateWood = (tab) => {
    tabs.forEach((item) => {
      const selected = item === tab;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-selected", String(selected));
    });
    currentIndex = tabs.indexOf(tab);
    featureImage.style.opacity = "0";
    window.setTimeout(() => {
      featureImage.src = tab.dataset.image;
      featureImage.alt = `Textura de madeira ${tab.dataset.name}`;
      featureName.textContent = tab.dataset.name;
      featureDescription.textContent = tab.dataset.description;
      selector.style.setProperty("--active-wood", tab.dataset.color);
      featureImage.style.opacity = "1";
    }, 150);
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      activateWood(tab);
      startAutoPlay();
    });
    tab.addEventListener("keydown", (event) => {
      if (
        !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)
      ) return;
      event.preventDefault();
      const direction =
        ["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 : 1;
      const next =
        tabs[(index + direction + tabs.length) % tabs.length];
      next.focus();
      activateWood(next);
      startAutoPlay();
    });
  });

  function startAutoPlay() {
    clearInterval(autoPlay);
    autoPlay = window.setInterval(() => {
      let nextIndex = currentIndex + 1;
      if (nextIndex >= tabs.length) {
        nextIndex = 0;
      }
      activateWood(tabs[nextIndex]);
    }, 3000);
  }
  startAutoPlay();
}

function setupProjectSelector() {
  const cards = document.querySelectorAll("[data-project-card]");
  if (!cards.length) return;

  cards.forEach((card) => {
    let projects;
    try {
      projects = JSON.parse(card.dataset.projects);
    } catch {
      return;
    }
    if (!Array.isArray(projects) || projects.length < 2) return;

    const image = card.querySelector("[data-project-image]");
    const title = card.querySelector("[data-project-title]");
    const eyebrow = card.querySelector("[data-project-eyebrow]");
    if (!image || !title || !eyebrow) return;

    let currentIndex = 0;
    let autoPlay;

    const showProject = (index) => {
      const project = projects[index];
      currentIndex = index;
      image.style.opacity = "0";
      window.setTimeout(() => {
        image.src = project.image;
        image.alt = project.title;
        title.textContent = project.title;
        eyebrow.textContent = project.description;
        image.style.opacity = "1";
      }, 200);
    };

    const startProjectAutoPlay = () => {
      clearInterval(autoPlay);
      autoPlay = window.setInterval(() => {
        const nextIndex = (currentIndex + 1) % projects.length;
        showProject(nextIndex);
      }, 6000);
    };

    card.addEventListener("mouseenter", () => clearInterval(autoPlay));
    card.addEventListener("mouseleave", startProjectAutoPlay);

    startProjectAutoPlay();
  });
}

function formatPhone(value) {
  const numbers = value.replace(/\D/g, "").slice(0, 11);
  if (numbers.length < 3) return numbers;
  if (numbers.length < 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length < 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
}

function formatCpf(value) {
  const numbers = value.replace(/\D/g, "").slice(0, 11);
  return numbers
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function isValidCpf(value) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

  const calculateDigit = (base, factor) => {
    const total = [...base].reduce((sum, digit) => sum + Number(digit) * factor--, 0);
    const remainder = (total * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };

  return calculateDigit(digits.slice(0, 9), 10) === Number(digits[9])
    && calculateDigit(digits.slice(0, 10), 11) === Number(digits[10]);
}

function setInputValidity(input, message) {
  input.setCustomValidity(message);
  if (message) {
    input.setAttribute("aria-invalid", "true");
  } else {
    input.removeAttribute("aria-invalid");
  }
}

function validatePhoneInput(input) {
  const digits = input.value.replace(/\D/g, "");
  setInputValidity(input, digits && ![10, 11].includes(digits.length) ? "Informe um telefone válido com DDD." : "");
}

function validateCpfInput(input) {
  const digits = input.value.replace(/\D/g, "");
  setInputValidity(input, digits && !isValidCpf(digits) ? "Informe um CPF válido." : "");
}

function setupPhoneMasks() {
  document.querySelectorAll("[data-phone]").forEach((input) => {
    input.addEventListener("input", () => {
      input.value = formatPhone(input.value);
      validatePhoneInput(input);
    });
  });
}

function setupCpfMasks() {
  document.querySelectorAll("[data-cpf]").forEach((input) => {
    input.addEventListener("input", () => {
      input.value = formatCpf(input.value);
      validateCpfInput(input);
    });
  });
}

function setFormStartedAt(form) {
  const startedAt = form.querySelector("[data-form-started-at]");
  if (startedAt) startedAt.value = String(Date.now());
}

function setupFormProtection() {
  document.querySelectorAll("[data-ajax-form]").forEach(setFormStartedAt);
}

async function getJsonPayload(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;

  try {
    return await response.json();
  } catch {
    return null;
  }
}

function getResponseMessage(response, payload) {
  if (!response.ok || payload?.success === false) {
    return payload?.data?.message || payload?.message || "Não foi possível enviar sua mensagem. Tente novamente.";
  }
  return payload?.data?.message || payload?.message || "Mensagem enviada com sucesso. Obrigado pelo contato!";
}

async function getFormNonce() {
  if (formNonce) return formNonce;
  if (formConfigPromise) return formConfigPromise;

  formConfigPromise = (async () => {
    const body = new URLSearchParams({ action: WORDPRESS_CONFIG_ACTION });
    const response = await fetch(WORDPRESS_AJAX_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      },
      credentials: "same-origin",
      body,
    });
    const payload = await getJsonPayload(response);
    const nonce = payload?.data?.nonce;

    if (!response.ok || payload?.success === false || typeof nonce !== "string" || !nonce) {
      throw new Error("Não foi possível iniciar o envio. Atualize a página e tente novamente.");
    }

    formNonce = nonce;
    return formNonce;
  })();

  try {
    return await formConfigPromise;
  } finally {
    formConfigPromise = undefined;
  }
}

function setFormFeedback(feedback, state, message) {
  if (!feedback) return;
  feedback.textContent = message;
  feedback.className = `form-feedback is-${state}`;
}

function clearMaskValidation(form) {
  form.querySelectorAll("[data-phone], [data-cpf]").forEach((input) => {
    input.setCustomValidity("");
    input.removeAttribute("aria-invalid");
  });
}

function setupAjaxForms() {
  document.querySelectorAll("[data-ajax-form]").forEach((form) => {
    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const formType = form.dataset.formType;
      const action = WORDPRESS_ACTIONS[formType];
      const feedback = form.querySelector("[data-form-feedback]");
      const submitButton = form.querySelector('button[type="submit"]');

      if (!action || form.dataset.isSubmitting === "true") return;
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      form.dataset.isSubmitting = "true";
      setFormFeedback(feedback, "pending", "Enviando mensagem…");
      if (submitButton) submitButton.disabled = true;

      try {
        const formData = new FormData(form);
        formData.append("action", action);
        formData.append("security", await getFormNonce());

        const response = await fetch(WORDPRESS_AJAX_URL, {
          method: "POST",
          body: formData,
          headers: { Accept: "application/json" },
          credentials: "same-origin",
        });
        const payload = await getJsonPayload(response);
        const message = getResponseMessage(response, payload);

        if (!response.ok || payload?.success === false) throw new Error(message);

        setFormFeedback(feedback, "success", message);
        form.reset();
        clearMaskValidation(form);
        setFormStartedAt(form);
      } catch (error) {
        const message = error instanceof TypeError
          ? "Não foi possível conectar ao servidor. Tente novamente em instantes."
          : error instanceof Error
            ? error.message
            : "Ocorreu um erro ao enviar. Tente novamente em instantes.";
        setFormFeedback(feedback, "error", message);
      } finally {
        delete form.dataset.isSubmitting;
        if (submitButton) submitButton.disabled = false;
      }
    });
  });
}

function setupModals() {
  const openers = document.querySelectorAll("[data-open-modal]");
  const closers = document.querySelectorAll("[data-close-modal]");

  openers.forEach((opener) => {
    opener.addEventListener("click", () => {
      const dialog = document.getElementById(opener.dataset.openModal);
      if (!dialog?.open) dialog?.showModal();
    });
  });
  closers.forEach((closer) => closer.addEventListener("click", () => closer.closest("dialog")?.close()));
  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) dialog.close();
    });
  });
}

setupMenu();
setupHeader();
setupWoodSelector();
setupProjectSelector();
setupPhoneMasks();
setupCpfMasks();
setupFormProtection();
setupAjaxForms();
setupModals();
