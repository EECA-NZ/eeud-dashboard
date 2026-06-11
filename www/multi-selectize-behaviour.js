(() => {
  const ENHANCED_ATTR = "data-multi-selectize-enhanced";
  const HOVER_FIX_ATTR = "data-selectize-hover-fix";
  const KEYBOARD_ACTIVE_CLASS = "selectize-keyboard-active";
  const DROPDOWN_CLASS = "multi-selectize-group-actions";
  const HEADER_CLASS = "multi-selectize-group-header";
  const BUTTON_CLASS = "multi-selectize-add-group";
  const NAVIGATION_KEYS = new Set([
    "ArrowDown",
    "ArrowUp",
    "End",
    "Home",
    "PageDown",
    "PageUp",
  ]);

  const dropdownElement = (selectize) => (
    selectize.$dropdown && selectize.$dropdown[0]
  );

  const enableKeyboardActiveState = (selectize) => {
    const dropdown = dropdownElement(selectize);
    if (dropdown) {
      dropdown.classList.add(KEYBOARD_ACTIVE_CLASS);
    }
  };

  const disableKeyboardActiveState = (selectize) => {
    const dropdown = dropdownElement(selectize);
    if (dropdown) {
      dropdown.classList.remove(KEYBOARD_ACTIVE_CLASS);
    }
  };

  const clearUnhoveredActiveOptions = (selectize) => {
    const dropdown = dropdownElement(selectize);
    if (!dropdown) {
      return;
    }

    dropdown.querySelectorAll("[data-selectable].active, .option.active").forEach((option) => {
      if (!option.matches(":hover")) {
        option.classList.remove("active");
      }
    });
  };

  const keepActiveStateHoverBound = (selectize) => {
    const dropdown = dropdownElement(selectize);
    if (!dropdown || dropdown.hasAttribute(HOVER_FIX_ATTR)) {
      return;
    }

    dropdown.setAttribute(HOVER_FIX_ATTR, "true");

    dropdown.addEventListener("mouseleave", () => {
      disableKeyboardActiveState(selectize);
      clearUnhoveredActiveOptions(selectize);
    });

    dropdown.addEventListener("mousemove", (event) => {
      disableKeyboardActiveState(selectize);

      if (!event.target.closest("[data-selectable], .option")) {
        clearUnhoveredActiveOptions(selectize);
      }
    });
  };

  const clearUnhoveredActiveOptionsSoon = (selectize) => {
    window.requestAnimationFrame(() => {
      clearUnhoveredActiveOptions(selectize);
      window.requestAnimationFrame(() => clearUnhoveredActiveOptions(selectize));
    });
  };

  const asArray = (value) => {
    if (Array.isArray(value)) {
      return value.map(String);
    }

    if (value === null || value === undefined || value === "") {
      return [];
    }

    return [String(value)];
  };

  const optionBelongsToGroup = (option, groupValue, groupLabel, optgroupField) => {
    const optionGroup = option && option[optgroupField];

    if (Array.isArray(optionGroup)) {
      return optionGroup.some((value) => (
        String(value) === groupValue || String(value) === groupLabel
      ));
    }

    return String(optionGroup) === groupValue || String(optionGroup) === groupLabel;
  };

  const optionValuesForGroup = (selectize, groupEl, groupLabel) => {
    const groupValue = String(groupEl.getAttribute("data-group") || groupLabel);
    const optgroupField = selectize.settings.optgroupField || "optgroup";
    const values = Object.keys(selectize.options || {}).filter((value) => (
      optionBelongsToGroup(selectize.options[value], groupValue, groupLabel, optgroupField)
    ));

    if (values.length) {
      return values;
    }

    return Array.from(groupEl.querySelectorAll("[data-selectable][data-value], .option[data-value]"))
      .map((optionEl) => optionEl.getAttribute("data-value"))
      .filter(Boolean);
  };

  const syncShinyInput = (selectize) => {
    selectize.refreshItems();
    selectize.refreshOptions(false);

    if (selectize.$input && selectize.$input.trigger) {
      selectize.$input.trigger("change");
    }
  };

  const addGroupOptions = (selectize, groupEl, groupLabel) => {
    const selected = new Set(asArray(selectize.getValue()));
    const values = optionValuesForGroup(selectize, groupEl, groupLabel)
      .filter((value) => !selected.has(String(value)));

    if (!values.length) {
      return;
    }

    values.forEach((value) => {
      selectize.addItem(value, true);
    });

    syncShinyInput(selectize);
  };

  const decorateGroupHeaders = (selectize) => {
    const dropdown = selectize.$dropdown && selectize.$dropdown[0];
    if (!dropdown) {
      return;
    }

    dropdown.classList.add(DROPDOWN_CLASS);

    dropdown.querySelectorAll(".optgroup").forEach((groupEl) => {
      const header = groupEl.querySelector(".optgroup-header");
      if (!header || header.querySelector(`.${BUTTON_CLASS}`)) {
        return;
      }

      const groupLabel = header.textContent.trim();
      header.classList.add(HEADER_CLASS);

      const button = document.createElement("button");
      button.type = "button";
      button.className = BUTTON_CLASS;
      button.textContent = "+";
      button.title = `Add all ${groupLabel}`;
      button.setAttribute("aria-label", `Add all ${groupLabel}`);

      ["mousedown", "mouseup", "click"].forEach((eventName) => {
        button.addEventListener(eventName, (event) => {
          event.preventDefault();
          event.stopPropagation();

          if (eventName === "click") {
            addGroupOptions(selectize, groupEl, groupLabel);
          }
        });
      });

      header.appendChild(button);
    });
  };

  const resetDropdownScroll = (selectize) => {
    const dropdownContent = (
      selectize.$dropdown_content && selectize.$dropdown_content[0]
    ) || (
      selectize.$dropdown && selectize.$dropdown[0]
    );

    if (dropdownContent) {
      dropdownContent.scrollTop = 0;
    }
  };

  const observeDropdown = (selectize) => {
    const dropdownContent = (
      selectize.$dropdown_content && selectize.$dropdown_content[0]
    ) || (
      selectize.$dropdown && selectize.$dropdown[0]
    );

    if (!dropdownContent) {
      return;
    }

    let pending = false;
    const observer = new MutationObserver(() => {
      if (pending) {
        return;
      }

      pending = true;
      window.requestAnimationFrame(() => {
        pending = false;
        decorateGroupHeaders(selectize);
      });
    });

    observer.observe(dropdownContent, { childList: true, subtree: true });
  };

  const enhanceMultiSelect = (select) => {
    if (!select || !select.multiple || select.hasAttribute(ENHANCED_ATTR)) {
      return false;
    }

    const selectize = select.selectize;
    if (!selectize || !selectize.$dropdown || !selectize.$dropdown.length) {
      return false;
    }

    select.setAttribute(ENHANCED_ATTR, "true");
    decorateGroupHeaders(selectize);
    observeDropdown(selectize);
    keepActiveStateHoverBound(selectize);

    if (selectize.$control && selectize.$control[0]) {
      selectize.$control[0].addEventListener("keydown", (event) => {
        if (
          NAVIGATION_KEYS.has(event.key) &&
          !event.ctrlKey &&
          !event.metaKey &&
          !event.altKey
        ) {
          enableKeyboardActiveState(selectize);
        }
      }, true);
    }

    if (selectize.on) {
      selectize.on("dropdown_open", () => {
        disableKeyboardActiveState(selectize);
        window.requestAnimationFrame(() => {
          decorateGroupHeaders(selectize);
          resetDropdownScroll(selectize);
        });
        clearUnhoveredActiveOptionsSoon(selectize);
      });
      selectize.on("type", () => {
        window.requestAnimationFrame(() => decorateGroupHeaders(selectize));
      });
    }

    return true;
  };

  const enhanceAllMultiSelects = () => {
    document.querySelectorAll("select.shiny-input-select[multiple]").forEach((select) => {
      enhanceMultiSelect(select);
    });
  };

  const startEnhancementRetries = () => {
    let attempts = 0;
    const intervalId = window.setInterval(() => {
      attempts += 1;
      enhanceAllMultiSelects();
      if (attempts >= 40) {
        window.clearInterval(intervalId);
      }
    }, 150);
  };

  document.addEventListener("DOMContentLoaded", () => {
    enhanceAllMultiSelects();
    startEnhancementRetries();
  });

  document.addEventListener("shiny:connected", () => {
    enhanceAllMultiSelects();
    startEnhancementRetries();
  });
})();
