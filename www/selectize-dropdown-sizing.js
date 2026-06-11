(() => {
  const ENHANCED_ATTR = "data-selectize-dropdown-sizing";
  const PANEL_GAP = 0;

  const sidebarPanelFor = (element) => (
    element.closest(".sidebar > .html-fill-container, .sidebar > .html-fill-item")
    || element.closest(".sidebar-content, .sidebar")
  );

  const dropdownContentFor = (selectize) => (
    selectize.$dropdown_content && selectize.$dropdown_content[0]
  ) || (
    selectize.$dropdown && selectize.$dropdown[0]
  );

  const applyDropdownHeight = (selectize) => {
    if (!selectize || !selectize.$control || !selectize.$control[0]) {
      return;
    }

    const control = selectize.$control[0];
    const dropdown = selectize.$dropdown && selectize.$dropdown[0];
    const dropdownContent = dropdownContentFor(selectize);
    const panel = sidebarPanelFor(control);

    if (!dropdown || !dropdownContent || !panel) {
      return;
    }

    const panelRect = panel.getBoundingClientRect();
    const dropdownRect = dropdown.getBoundingClientRect();
    const availableHeight = Math.floor(panelRect.bottom - dropdownRect.top - PANEL_GAP);
    const maxHeight = Math.max(0, availableHeight);

    dropdown.style.setProperty("--selectize-dropdown-max-height", `${maxHeight}px`);
    dropdownContent.style.maxHeight = `${maxHeight}px`;
  };

  const applySoon = (selectize) => {
    window.requestAnimationFrame(() => {
      applyDropdownHeight(selectize);
      window.requestAnimationFrame(() => applyDropdownHeight(selectize));
    });
  };

  const enhanceSelect = (select) => {
    if (!select || select.hasAttribute(ENHANCED_ATTR) || !select.selectize) {
      return false;
    }

    const selectize = select.selectize;
    if (!selectize.$control || !selectize.$control.length) {
      return false;
    }

    select.setAttribute(ENHANCED_ATTR, "true");

    if (selectize.on) {
      selectize.on("dropdown_open", () => applySoon(selectize));
      selectize.on("type", () => applySoon(selectize));
      selectize.on("refresh_options", () => applySoon(selectize));
    }

    const panel = sidebarPanelFor(selectize.$control[0]);
    if (panel) {
      panel.addEventListener("scroll", () => applyDropdownHeight(selectize), { passive: true });
    }

    window.addEventListener("resize", () => applyDropdownHeight(selectize), { passive: true });
    applySoon(selectize);
    return true;
  };

  const enhanceAllSelects = () => {
    document.querySelectorAll("select.shiny-input-select").forEach((select) => {
      enhanceSelect(select);
    });
  };

  const startEnhancementRetries = () => {
    let attempts = 0;
    const intervalId = window.setInterval(() => {
      attempts += 1;
      enhanceAllSelects();
      if (attempts >= 40) {
        window.clearInterval(intervalId);
      }
    }, 150);
  };

  document.addEventListener("DOMContentLoaded", () => {
    enhanceAllSelects();
    startEnhancementRetries();
  });

  document.addEventListener("shiny:connected", () => {
    enhanceAllSelects();
    startEnhancementRetries();
  });
})();
