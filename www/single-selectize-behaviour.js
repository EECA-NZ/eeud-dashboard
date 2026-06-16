(() => {
  const ENHANCED_ATTR = "data-single-selectize-enhanced";
  const HOVER_FIX_ATTR = "data-selectize-hover-fix";
  const KEYBOARD_ACTIVE_CLASS = "selectize-keyboard-active";
  const NAVIGATION_KEYS = new Set([
    "ArrowDown",
    "ArrowUp",
    "End",
    "Home",
    "PageDown",
    "PageUp",
  ]);
  const TYPEAHEAD_RESET_MS = 700;

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

  const enhanceSingleSelect = (select) => {
    if (!select || select.multiple || select.hasAttribute(ENHANCED_ATTR)) {
      return false;
    }

    const selectize = select.selectize;
    if (!selectize || !selectize.$control || !selectize.$control.length) {
      return false;
    }

    const control = selectize.$control[0];
    select.setAttribute(ENHANCED_ATTR, "true");
    let pendingMouseRelease = false;
    let suppressUntil = 0;
    let typeahead = "";
    let typeaheadTimer = null;
    let lastTypeaheadAt = 0;

    const syncInputState = () => {
      const input = control.querySelector("input");
      if (!input) {
        return;
      }

      input.readOnly = false;
      input.removeAttribute("aria-readonly");
      input.setAttribute("autocomplete", "off");
      input.setAttribute("spellcheck", "false");
      input.style.cursor = "pointer";
    };

    control.style.cursor = "pointer";
    syncInputState();
    keepActiveStateHoverBound(selectize);

    const isDropdownOpen = () => (
      selectize.isOpen ||
      control.classList.contains("dropdown-active") ||
      Boolean(selectize.$dropdown && selectize.$dropdown.is(":visible"))
    );

    const suppressEvent = (event) => {
      if (event.target.closest(".selectize-dropdown")) {
        return false;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      return true;
    };

    const closeDropdown = () => {
      suppressUntil = window.performance.now() + 350;
      selectize.close();
      selectize.blur();

      const input = control.querySelector("input");
      if (input) {
        input.blur();
      }
    };

    const shouldSuppressFollowUp = () => window.performance.now() < suppressUntil;

    const clearTypeaheadLater = () => {
      window.clearTimeout(typeaheadTimer);
      typeaheadTimer = window.setTimeout(() => {
        typeahead = "";
      }, TYPEAHEAD_RESET_MS);
    };

    const optionText = (option) => {
      const text = option && (option.label || option.text || option.value);
      return String(text || "").toLowerCase();
    };

    const matchingOptionValues = (query) => (
      Object.keys(selectize.options).filter((value) => (
        optionText(selectize.options[value]).startsWith(query)
      ))
    );

    const activeOptionValue = () => {
      const dropdown = dropdownElement(selectize);
      const activeOption = dropdown && dropdown.querySelector(
        "[data-selectable].active, [data-value].active"
      );

      return (activeOption && activeOption.getAttribute("data-value")) || selectize.getValue();
    };

    const activateOption = (value) => {
      const option = selectize.getOption(value);
      if (!option || !option.length) {
        return;
      }

      selectize.setActiveOption(option);
      option[0].scrollIntoView({ block: "nearest" });
    };

    const selectTypeaheadMatch = (key) => {
      const now = window.performance.now();
      const isRecent = now - lastTypeaheadAt <= TYPEAHEAD_RESET_MS;
      const isCycling = isRecent && typeahead.length === 1 && typeahead === key;
      let query = isRecent && !isCycling ? typeahead + key : key;
      let matches = matchingOptionValues(query);

      if (!matches.length && query.length > 1) {
        query = key;
        matches = matchingOptionValues(query);
      }

      if (!matches.length) {
        return;
      }

      typeahead = query;
      lastTypeaheadAt = now;
      clearTypeaheadLater();

      if (isCycling && matches.length > 1) {
        const currentIndex = matches.indexOf(activeOptionValue());
        activateOption(matches[(currentIndex + 1) % matches.length]);
      } else {
        activateOption(matches[0]);
      }
    };

    control.addEventListener(
      "mousedown",
      (event) => {
        pendingMouseRelease = suppressEvent(event);
      },
      true
    );

    control.addEventListener(
      "mouseup",
      (event) => {
        if (!pendingMouseRelease || !suppressEvent(event)) {
          pendingMouseRelease = false;
          return;
        }

        pendingMouseRelease = false;

        if (isDropdownOpen()) {
          closeDropdown();
        } else {
          suppressUntil = window.performance.now() + 350;
          selectize.focus();
          selectize.open();
          disableKeyboardActiveState(selectize);
          clearUnhoveredActiveOptionsSoon(selectize);
        }

        window.requestAnimationFrame(syncInputState);
      },
      true
    );

    control.addEventListener("keydown", (event) => {
      if (event.key === "Backspace" || event.key === "Delete") {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      if (!isDropdownOpen() || event.ctrlKey || event.metaKey || event.altKey) {
        return;
      }

      if (NAVIGATION_KEYS.has(event.key)) {
        enableKeyboardActiveState(selectize);
        return;
      }

      if (event.key.length !== 1) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      enableKeyboardActiveState(selectize);
      selectTypeaheadMatch(event.key.toLowerCase());
    }, true);

    ["click", "focusin"].forEach((eventName) => {
      control.addEventListener(
        eventName,
        (event) => {
          if (shouldSuppressFollowUp() && suppressEvent(event)) {
            window.requestAnimationFrame(syncInputState);
          }
        },
        true
      );
    });

    return true;
  };

  const enhanceAllSingleSelects = () => {
    const selects = document.querySelectorAll("select.shiny-input-select");
    let enhancedAny = false;

    selects.forEach((select) => {
      if (enhanceSingleSelect(select)) {
        enhancedAny = true;
      }
    });

    return enhancedAny;
  };

  const startEnhancementRetries = () => {
    let attempts = 0;
    const intervalId = window.setInterval(() => {
      attempts += 1;
      enhanceAllSingleSelects();
      if (attempts >= 40) {
        window.clearInterval(intervalId);
      }
    }, 150);
  };

  document.addEventListener("DOMContentLoaded", () => {
    enhanceAllSingleSelects();
    startEnhancementRetries();
  });

  document.addEventListener("shiny:connected", () => {
    enhanceAllSingleSelects();
    startEnhancementRetries();
  });
})();
