

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
    if (!image) return;

    let currentIndex = 0;
    let autoPlay;

    const showProject = (index) => {
      const project = projects[index];
      currentIndex = index;
      image.style.opacity = "0";
      window.setTimeout(() => {
        image.src = project.image;
        image.alt = project.alt || "Projeto de marcenaria CAP";
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

function setupPortfolioGallery() {
  const gallery = document.querySelector("[data-gallery]");
  const dialog = document.querySelector("[data-gallery-dialog]");
  if (!gallery || !dialog) return;

  const items = [...gallery.querySelectorAll("[data-gallery-item]")];
  const filters = [...document.querySelectorAll("[data-gallery-filter]")];
  const moreButton = document.querySelector("[data-gallery-more]");
  const status = document.querySelector("[data-gallery-status]");
  const modalImage = dialog.querySelector("[data-gallery-modal-image]");
  const modalCategory = dialog.querySelector("[data-gallery-modal-category]");
  const modalTitle = dialog.querySelector("[data-gallery-modal-title]");
  const modalDescription = dialog.querySelector("[data-gallery-modal-description]");
  const counter = dialog.querySelector("[data-gallery-counter]");
  const previousButton = dialog.querySelector("[data-gallery-previous]");
  const nextButton = dialog.querySelector("[data-gallery-next]");

  if (
    !items.length ||
    !modalImage ||
    !modalCategory ||
    !modalTitle ||
    !modalDescription ||
    !counter ||
    !previousButton ||
    !nextButton
  ) return;

  const categoryLabels = {
    cozinhas: "Cozinhas",
    ambientes: "Salas e painéis",
    detalhes: "Detalhes que mudam tudo",
  };
  let activeCategory = "todos";
  let expanded = false;
  let currentItem;

  const getVisibleItems = () => items.filter((item) => !item.hidden);

  const updateDialog = (item) => {
    const image = item.querySelector("img");
    if (!image) return;

    currentItem = item;
    const visibleItems = getVisibleItems();
    const index = visibleItems.indexOf(item);

    modalImage.src = image.currentSrc || image.src;
    modalImage.alt = image.alt;
    modalCategory.textContent = categoryLabels[item.dataset.galleryCategory] || "Acervo CAP";
    modalTitle.textContent = item.dataset.galleryTitle || "Trabalho CAP";
    modalDescription.textContent = item.dataset.galleryDescription || "";
    counter.textContent = index >= 0 ? String(index + 1) + " de " + String(visibleItems.length) : "";
    previousButton.disabled = index <= 0;
    nextButton.disabled = index < 0 || index >= visibleItems.length - 1;
  };

  const openItem = (item) => {
    updateDialog(item);
    if (!dialog.open) dialog.showModal();
  };

  const render = () => {
    let matchingItems = 0;
    let displayedItems = 0;
    const showPreview = activeCategory === "todos" && !expanded;

    items.forEach((item, index) => {
      const matches = activeCategory === "todos" || item.dataset.galleryCategory === activeCategory;
      const visible = matches && (!showPreview || index < 6);
      item.hidden = !visible;

      if (matches) matchingItems += 1;
      if (visible) displayedItems += 1;
    });

    filters.forEach((filter) => {
      const selected = filter.dataset.galleryFilter === activeCategory;
      filter.classList.toggle("is-active", selected);
      filter.setAttribute("aria-pressed", String(selected));
    });

    if (moreButton) moreButton.hidden = activeCategory !== "todos" || expanded;
    if (status) {
      status.textContent = displayedItems === matchingItems
        ? String(matchingItems) + (matchingItems === 1 ? " trabalho em exibição." : " trabalhos em exibição.")
        : "Mostrando " + String(displayedItems) + " de " + String(matchingItems) + " trabalhos.";
    }
  };

  filters.forEach((filter) => {
    filter.addEventListener("click", () => {
      activeCategory = filter.dataset.galleryFilter || "todos";
      expanded = activeCategory !== "todos";
      render();
    });
  });

  moreButton?.addEventListener("click", () => {
    expanded = true;
    render();
  });

  items.forEach((item) => item.addEventListener("click", () => openItem(item)));

  const moveDialog = (direction) => {
    const visibleItems = getVisibleItems();
    const index = visibleItems.indexOf(currentItem);
    const nextIndex = index + direction;

    if (nextIndex >= 0 && nextIndex < visibleItems.length) {
      updateDialog(visibleItems[nextIndex]);
    }
  };

  previousButton.addEventListener("click", () => moveDialog(-1));
  nextButton.addEventListener("click", () => moveDialog(1));
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") moveDialog(-1);
    if (event.key === "ArrowRight") moveDialog(1);
  });

  render();
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

// Demonstração estática: valida os campos sem enviar ou armazenar os dados.
function setupDemoForms() {
  document.querySelectorAll("[data-demo-form]").forEach((form) => {
    const feedback = form.querySelector("[data-form-feedback]");
    const button = form.querySelector("[data-demo-submit]");
    if (!feedback || !button) return;

    const demonstrate = (event) => {
      event.preventDefault();
      feedback.textContent = "";
      form.querySelectorAll("[data-phone]").forEach(validatePhoneInput);
      form.querySelectorAll("[data-cpf]").forEach(validateCpfInput);

      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }

      feedback.textContent = "Simulação concluída. Nenhuma mensagem foi enviada. Esta página é apenas uma demonstração de portfólio.";
      feedback.className = "form-feedback is-success";
      form.reset();
      form.querySelectorAll("[data-phone], [data-cpf]").forEach((input) => {
        input.setCustomValidity("");
        input.removeAttribute("aria-invalid");
      });
    };

    form.addEventListener("submit", demonstrate);
    button.addEventListener("click", demonstrate);
    form.addEventListener("input", () => { feedback.textContent = ""; });
    button.disabled = false;
  });
}

function setupHorizontalDragScroll() {
  document.querySelectorAll("[data-horizontal-scroll]").forEach((track) => {
    let pointerId;
    let startX;
    let startScrollLeft;

    track.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startScrollLeft = track.scrollLeft;
      track.setPointerCapture(pointerId);
    });

    track.addEventListener("pointermove", (event) => {
      if (event.pointerId !== pointerId) return;
      const distance = event.clientX - startX;
      if (Math.abs(distance) > 3) track.classList.add("is-dragging");
      track.scrollLeft = startScrollLeft - distance;
    });

    const stopDrag = (event) => {
      if (event.pointerId !== pointerId) return;
      if (track.hasPointerCapture(pointerId)) track.releasePointerCapture(pointerId);
      pointerId = undefined;
      track.classList.remove("is-dragging");
    };

    track.addEventListener("pointerup", stopDrag);
    track.addEventListener("pointercancel", stopDrag);
    track.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      event.preventDefault();
      track.scrollBy({ left: event.key === "ArrowLeft" ? -300 : 300, behavior: "smooth" });
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
setupPortfolioGallery();
setupPhoneMasks();
setupCpfMasks();
setupDemoForms();
setupHorizontalDragScroll();
setupModals();
