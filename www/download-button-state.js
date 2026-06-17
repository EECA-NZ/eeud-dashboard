(() => {
  const DISABLED_CLASS = "download-button-disabled";
  const DISABLED_HREF_ATTR = "data-download-disabled-href";
  const STATE_BY_ID = new Map();

  const setDownloadButtonState = (id, disabled) => {
    const button = document.getElementById(id);
    if (!button) {
      return;
    }

    if (disabled) {
      const currentHref = button.getAttribute("href");
      if (currentHref !== null) {
        button.setAttribute(DISABLED_HREF_ATTR, currentHref);
        button.removeAttribute("href");
      }
    } else {
      const storedHref = button.getAttribute(DISABLED_HREF_ATTR);
      if (!button.hasAttribute("href") && storedHref) {
        button.setAttribute("href", storedHref);
      }
      if (storedHref !== null) {
        button.removeAttribute(DISABLED_HREF_ATTR);
      }
    }

    if (button.classList.contains(DISABLED_CLASS) !== disabled) {
      button.classList.toggle(DISABLED_CLASS, disabled);
    }

    if (disabled) {
      if (!button.classList.contains("disabled")) {
        button.classList.add("disabled");
      }
      if (!button.hasAttribute("data-download-disabled")) {
        button.setAttribute("data-download-disabled", "");
      }
      if (button.getAttribute("aria-disabled") !== "true") {
        button.setAttribute("aria-disabled", "true");
      }
      if (button.getAttribute("tabindex") !== "-1") {
        button.setAttribute("tabindex", "-1");
      }
    } else {
      if (button.classList.contains("disabled")) {
        button.classList.remove("disabled");
      }
      if (button.hasAttribute("data-download-disabled")) {
        button.removeAttribute("data-download-disabled");
      }
      if (button.hasAttribute("aria-disabled")) {
        button.removeAttribute("aria-disabled");
      }
      if (button.hasAttribute("tabindex")) {
        button.removeAttribute("tabindex");
      }
    }
  };

  const applyStoredStates = () => {
    STATE_BY_ID.forEach((disabled, id) => {
      setDownloadButtonState(id, disabled);
    });
  };

  const handleStateMessage = (message) => {
    if (!message || !message.id) {
      return;
    }

    const disabled = Boolean(message.disabled);
    STATE_BY_ID.set(message.id, disabled);
    setDownloadButtonState(message.id, disabled);
  };

  const registerHandler = () => {
    if (!window.Shiny || !window.Shiny.addCustomMessageHandler) {
      window.setTimeout(registerHandler, 50);
      return;
    }

    window.Shiny.addCustomMessageHandler(
      "download-button-state",
      handleStateMessage
    );
    applyStoredStates();
  };

  document.addEventListener(
    "click",
    (event) => {
      const target = event.target instanceof Element ? event.target : null;
      const button = target ? target.closest("a[data-download-disabled]") : null;
      if (!button) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
    },
    true
  );

  document.addEventListener("DOMContentLoaded", () => {
    registerHandler();

    const observer = new MutationObserver(applyStoredStates);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["href", "class", "aria-disabled", "tabindex"],
      subtree: true,
    });
  });
})();
