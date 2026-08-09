const WORDPRESS_AJAX_URL = "https://israelmoveis.com.br/wp-admin/admin-ajax.php";
const WORDPRESS_ACTION = "[NOME_DA_ACTION_AQUI]";

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

  const activateWood = (tab) => {
    tabs.forEach((item) => {
      const selected = item === tab;
      item.classList.toggle("is-active", selected);
      item.setAttribute("aria-selected", String(selected));
    });

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
    tab.addEventListener("click", () => activateWood(tab));
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      const direction = ["ArrowUp", "ArrowLeft"].includes(event.key) ? -1 : 1;
      const next = tabs[(index + direction + tabs.length) % tabs.length];
      next.focus();
      activateWood(next);
    });
  });
}

function formatPhone(value) {
  const numbers = value.replace(/\D/g, "").slice(0, 11);
  if (numbers.length < 3) return numbers;
  if (numbers.length < 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length < 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
}

function setupPhoneMasks() {
  document.querySelectorAll("[data-phone]").forEach((input) => {
    input.addEventListener("input", () => {
      input.value = formatPhone(input.value);
    });
  });
}

function formatCpf(value) {
  const numbers = value.replace(/\D/g, "").slice(0, 11);
  return numbers
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function setupCpfMasks() {
  document.querySelectorAll("[data-cpf]").forEach((input) => {
    input.addEventListener("input", () => {
      input.value = formatCpf(input.value);
    });
  });
}

function getResponseMessage(response, payload) {
  if (!response.ok || payload?.success === false) {
    return payload?.data?.message || payload?.message || "Não foi possível enviar sua mensagem. Tente novamente.";
  }
  return payload?.data?.message || payload?.message || "Mensagem enviada com sucesso. Obrigado pelo contato!";
}

function setupAjaxForms() {
  document.querySelectorAll("[data-ajax-form]").forEach((form) => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const feedback = form.querySelector("[data-form-feedback]");
      const submitButton = form.querySelector('button[type="submit"]');
      const formData = new FormData(form);
      formData.append("action", WORDPRESS_ACTION);

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      feedback.textContent = "Enviando mensagem…";
      feedback.className = "form-feedback is-pending";
      submitButton.disabled = true;

      try {
        const response = await fetch(WORDPRESS_AJAX_URL, {
          method: "POST",
          body: formData,
          headers: { Accept: "application/json" },
        });
        const contentType = response.headers.get("content-type") || "";
        const payload = contentType.includes("application/json") ? await response.json() : null;
        const message = getResponseMessage(response, payload);

        if (!response.ok || payload?.success === false) throw new Error(message);

        feedback.textContent = message;
        feedback.className = "form-feedback is-success";
        form.reset();
      } catch (error) {
        feedback.textContent = error.message || "Ocorreu um erro ao enviar. Tente novamente em instantes.";
        feedback.className = "form-feedback is-error";
      } finally {
        submitButton.disabled = false;
      }
    });
  });
}

function setupModals() {
  const openers = document.querySelectorAll("[data-open-modal]");
  const closers = document.querySelectorAll("[data-close-modal]");

  openers.forEach((opener) => {
    opener.addEventListener("click", () => document.getElementById(opener.dataset.openModal)?.showModal());
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
setupPhoneMasks();
setupCpfMasks();
setupAjaxForms();
setupModals();
