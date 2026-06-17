(() => {
  const ENHANCED_ATTR = "data-multi-selectize-enhanced";
  const HOVER_FIX_ATTR = "data-selectize-hover-fix";
  const KEYBOARD_ACTIVE_CLASS = "selectize-keyboard-active";
  const DROPDOWN_CLASS = "multi-selectize-group-actions";
  const HEADER_CLASS = "multi-selectize-group-header";
  const BUTTON_CLASS = "multi-selectize-add-group";
  const CLEAR_CONTAINER_CLASS = "multi-selectize-clear-container";
  const CLEAR_BUTTON_CLASS = "multi-selectize-clear-button";
  const CLEAR_ACTIVE_CLASS = "has-multi-selectize-value";
  const ADD_PLACEHOLDER_CLASS = "multi-selectize-add-placeholder";
  const ADD_PLACEHOLDER_TEXT = "Click to add more filters";
  const GROUP_ITEM_CLASS = "multi-selectize-group-item";
  const ITEM_LABEL_CLASS = "multi-selectize-item-label";
  const GROUP_ITEM_REMOVE_CLASS = "multi-selectize-group-item-remove";
  const HIDDEN_GROUP_ITEM_CLASS = "multi-selectize-hidden-group-item";
  const CLOSE_SUPPRESSION_MS = 350;
  const NAVIGATION_KEYS = new Set([
    "ArrowDown",
    "ArrowUp",
    "End",
    "Home",
    "PageDown",
    "PageUp",
  ]);
  const FILTER_DIMENSIONS = [
    { suffix: "_end_use", dimension: "EndUse", groupDimension: "EndUseGroup" },
    { suffix: "_fuels", dimension: "Fuel", groupDimension: "FuelGroup" },
    { suffix: "_sectors", dimension: "Sector", groupDimension: "SectorGroup" },
    { suffix: "_technologies", dimension: "Technology", groupDimension: "TechnologyGroup" },
  ];

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

    updateAddMorePlaceholderSoon(selectize);
    updateCollapsedGroupItemsSoon(selectize);
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

  const labelForSelect = (select, container) => {
    if (!container) {
      return null;
    }

    return Array.from(container.querySelectorAll("label")).find((label) => (
      label.getAttribute("for") === select.id
    )) || container.querySelector("label.control-label, label");
  };

  const hasSelectedItems = (selectize) => asArray(selectize.getValue()).length > 0;

  const controlInputFor = (selectize) => (
    (selectize.$control_input && selectize.$control_input[0]) ||
    (selectize.$control && selectize.$control[0] && selectize.$control[0].querySelector("input"))
  );

  const inputHasSearchText = (input) => Boolean(input && input.value.length > 0);

  const suppressKeyboardEvent = (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  const selectDimensionsFor = (selectize) => {
    const select = selectize.$input && selectize.$input[0];
    const selectId = select && select.id;

    if (!selectId) {
      return null;
    }

    return FILTER_DIMENSIONS.find((entry) => selectId.endsWith(entry.suffix)) || null;
  };

  const paletteColourFor = (label, dimension) => {
    const palette = window.EEUD_SELECTIZE_COLOURS || {};
    const dimensionPalette = palette[dimension] || {};
    return dimensionPalette[String(label)] || null;
  };

  const relativeLuminance = (red, green, blue) => {
    const toLinear = (channel) => {
      const normalised = channel / 255;
      return normalised <= 0.04045
        ? normalised / 12.92
        : ((normalised + 0.055) / 1.055) ** 2.4;
    };

    return (
      0.2126 * toLinear(red) +
      0.7152 * toLinear(green) +
      0.0722 * toLinear(blue)
    );
  };

  const textColourForBackground = (backgroundColour) => {
    const match = String(backgroundColour || "").trim().match(/^#([0-9a-f]{6})$/i);

    if (!match) {
      return null;
    }

    const hex = match[1];
    const red = parseInt(hex.slice(0, 2), 16);
    const green = parseInt(hex.slice(2, 4), 16);
    const blue = parseInt(hex.slice(4, 6), 16);

    return relativeLuminance(red, green, blue) < 0.45 ? "#ffffff" : "#000000";
  };

  const setPriorityStyle = (element, property, value) => {
    if (!element) {
      return;
    }

    if (value) {
      element.style.setProperty(property, value, "important");
      return;
    }

    element.style.removeProperty(property);
  };

  const itemLabelForValue = (selectize, value) => {
    const option = selectize.options && selectize.options[value];
    return String((option && (option.label || option.text || option.value)) || value);
  };

  const selectedChipElements = (selectize) => {
    const control = selectize.$control && selectize.$control[0];

    if (!control) {
      return [];
    }

    return Array.from(control.querySelectorAll(".item[data-value]"));
  };

  const applySelectedItemColours = (selectize) => {
    const dimensions = selectDimensionsFor(selectize);

    if (!dimensions) {
      return;
    }

    selectedChipElements(selectize).forEach((item) => {
      const groupValue = item.getAttribute("data-multi-selectize-group");
      const label = groupValue || itemLabelForValue(selectize, item.getAttribute("data-value"));
      const dimension = groupValue ? dimensions.groupDimension : dimensions.dimension;
      const backgroundColour = paletteColourFor(label, dimension);
      const textColour = textColourForBackground(backgroundColour);

      setPriorityStyle(item, "background-color", backgroundColour);
      setPriorityStyle(item, "color", textColour);
    });
  };

  const applySelectedItemColoursSoon = (selectize) => {
    window.requestAnimationFrame(() => {
      applySelectedItemColours(selectize);
      window.requestAnimationFrame(() => applySelectedItemColours(selectize));
    });
  };

  const optionGroupValues = (option, optgroupField) => {
    const optionGroup = option && option[optgroupField];

    if (Array.isArray(optionGroup)) {
      return optionGroup.map(String);
    }

    if (optionGroup === null || optionGroup === undefined || optionGroup === "") {
      return [];
    }

    return [String(optionGroup)];
  };

  const groupLabelFor = (selectize, groupValue) => {
    const optgroup = selectize.optgroups && selectize.optgroups[groupValue];
    const label = optgroup && (optgroup.label || optgroup.text || optgroup.value);
    return String(label || groupValue);
  };

  const selectedGroupSummaries = (selectize) => {
    const optgroupField = selectize.settings.optgroupField || "optgroup";
    const selectedValues = new Set(asArray(selectize.getValue()));
    const groups = new Map();

    Object.keys(selectize.options || {}).forEach((value) => {
      const option = selectize.options[value];
      optionGroupValues(option, optgroupField).forEach((groupValue) => {
        if (!groups.has(groupValue)) {
          groups.set(groupValue, {
            label: groupLabelFor(selectize, groupValue),
            values: [],
          });
        }

        groups.get(groupValue).values.push(String(value));
      });
    });

    return Array.from(groups.entries())
      .map(([groupValue, group]) => ({
        groupValue,
        label: group.label,
        values: group.values,
      }))
      .filter((group) => (
        group.values.length > 1 &&
        group.values.every((value) => selectedValues.has(String(value)))
      ));
  };

  const selectedItemElements = (selectize) => {
    const control = selectize.$control && selectize.$control[0];

    if (!control) {
      return [];
    }

    return Array.from(control.querySelectorAll("[data-value]")).filter((item) => (
      !item.classList.contains(GROUP_ITEM_CLASS)
    ));
  };

  const selectedItemElementForValue = (selectize, value) => (
    selectedItemElements(selectize).find((item) => (
      String(item.getAttribute("data-value")) === String(value)
    ))
  );

  const removeCollapsedGroup = (selectize, values) => {
    values.forEach((value) => {
      selectize.removeItem(value, true);
    });

    syncShinyInput(selectize);
    updateCollapsedGroupItemsSoon(selectize);
  };

  const wrapSelectedItemLabels = (selectize) => {
    selectedItemElements(selectize).forEach((item) => {
      const hasLabel = Array.from(item.children).some((child) => (
        child.classList.contains(ITEM_LABEL_CLASS)
      ));

      if (hasLabel) {
        return;
      }

      const labelNodes = Array.from(item.childNodes).filter((node) => {
        if (node.nodeType === 3) {
          return node.textContent.length > 0;
        }

        return node.nodeType === 1 && !node.classList.contains("remove");
      });

      if (!labelNodes.length) {
        return;
      }

      const label = document.createElement("span");
      label.className = ITEM_LABEL_CLASS;
      item.insertBefore(label, labelNodes[0]);
      labelNodes.forEach((node) => label.appendChild(node));
    });
  };

  const wrapSelectedItemLabelsSoon = (selectize) => {
    window.requestAnimationFrame(() => {
      wrapSelectedItemLabels(selectize);
      applySelectedItemColours(selectize);
      window.requestAnimationFrame(() => {
        wrapSelectedItemLabels(selectize);
        applySelectedItemColours(selectize);
      });
    });
  };

  const buildCollapsedGroupItem = (selectize, group) => {
    const item = document.createElement("div");
    const label = document.createElement("span");
    const remove = document.createElement("a");

    item.className = `${GROUP_ITEM_CLASS} item`;
    item.setAttribute("data-value", `__group__${group.groupValue}`);
    item.setAttribute("data-multi-selectize-group", group.groupValue);
    label.className = ITEM_LABEL_CLASS;
    label.textContent = `All ${group.label}`;

    remove.className = `${GROUP_ITEM_REMOVE_CLASS} remove`;
    remove.href = "javascript:void(0)";
    remove.tabIndex = -1;
    remove.title = "Remove";
    remove.setAttribute("aria-label", `Remove all ${group.label}`);
    remove.textContent = "\u00d7";

    ["mousedown", "mouseup", "click"].forEach((eventName) => {
      remove.addEventListener(eventName, (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (eventName === "click") {
          removeCollapsedGroup(selectize, group.values);
        }
      });
    });

    item.appendChild(label);
    item.appendChild(remove);
    return item;
  };

  const updateCollapsedGroupItems = (selectize) => {
    const control = selectize.$control && selectize.$control[0];

    if (!control) {
      return;
    }

    control.querySelectorAll(`.${GROUP_ITEM_CLASS}`).forEach((item) => item.remove());
    control.querySelectorAll(`.${HIDDEN_GROUP_ITEM_CLASS}`).forEach((item) => {
      item.classList.remove(HIDDEN_GROUP_ITEM_CLASS);
    });

    selectedGroupSummaries(selectize).forEach((group) => {
      const itemElements = group.values
        .map((value) => selectedItemElementForValue(selectize, value))
        .filter(Boolean);

      if (!itemElements.length) {
        return;
      }

      const groupItem = buildCollapsedGroupItem(selectize, group);
      itemElements[0].insertAdjacentElement("beforebegin", groupItem);
      itemElements.forEach((item) => {
        item.classList.add(HIDDEN_GROUP_ITEM_CLASS);
      });
    });
  };

  const updateCollapsedGroupItemsSoon = (selectize) => {
    window.requestAnimationFrame(() => {
      updateCollapsedGroupItems(selectize);
      wrapSelectedItemLabels(selectize);
      applySelectedItemColours(selectize);
      window.requestAnimationFrame(() => {
        updateCollapsedGroupItems(selectize);
        wrapSelectedItemLabels(selectize);
        applySelectedItemColours(selectize);
      });
    });
  };

  const updateAddMorePlaceholder = (selectize) => {
    const control = selectize.$control && selectize.$control[0];
    const input = controlInputFor(selectize);

    if (!control || !input) {
      return;
    }

    const hasValue = hasSelectedItems(selectize);
    control.classList.toggle(ADD_PLACEHOLDER_CLASS, hasValue);

    if (hasValue) {
      input.setAttribute("placeholder", ADD_PLACEHOLDER_TEXT);
      return;
    }

    const emptyPlaceholder = selectize.settings && selectize.settings.placeholder;
    if (emptyPlaceholder) {
      input.setAttribute("placeholder", emptyPlaceholder);
    } else {
      input.removeAttribute("placeholder");
    }
  };

  const updateAddMorePlaceholderSoon = (selectize) => {
    window.requestAnimationFrame(() => {
      updateAddMorePlaceholder(selectize);
      window.requestAnimationFrame(() => updateAddMorePlaceholder(selectize));
    });
  };

  const addSelectedPlaceholder = (selectize) => {
    updateAddMorePlaceholderSoon(selectize);

    if (selectize.on) {
      [
        "change",
        "clear",
        "dropdown_open",
        "item_add",
        "item_remove",
        "type",
      ].forEach((eventName) => {
        selectize.on(eventName, () => updateAddMorePlaceholderSoon(selectize));
      });
    }
  };

  const addCollapsedGroupItems = (selectize) => {
    updateCollapsedGroupItemsSoon(selectize);

    if (selectize.on) {
      [
        "change",
        "clear",
        "item_add",
        "item_remove",
      ].forEach((eventName) => {
        selectize.on(eventName, () => updateCollapsedGroupItemsSoon(selectize));
      });
    }
  };

  const updateClearButton = (container, button, selectize) => {
    const hasValue = hasSelectedItems(selectize);
    container.classList.toggle(CLEAR_ACTIVE_CLASS, hasValue);
    button.hidden = !hasValue;
  };

  const addHeaderClearButton = (select, selectize) => {
    const container = select.closest(".shiny-input-container");
    const label = labelForSelect(select, container);

    if (!container || !label) {
      return;
    }

    container.classList.add(CLEAR_CONTAINER_CLASS);

    let button = Array.from(container.children).find((child) => (
      child.classList && child.classList.contains(CLEAR_BUTTON_CLASS)
    ));
    if (!button) {
      const labelText = label.textContent.trim() || "filter";
      const clearText = document.createElement("span");
      const icon = document.createElement("i");

      button = document.createElement("button");
      button.type = "button";
      button.className = CLEAR_BUTTON_CLASS;
      button.title = `Clear ${labelText}`;
      button.setAttribute("aria-label", `Clear ${labelText}`);
      clearText.className = "multi-selectize-clear-label";
      clearText.textContent = "CLEAR";
      icon.className = "fa-solid fa-xmark";
      icon.setAttribute("aria-hidden", "true");
      //button.appendChild(clearText);
      button.appendChild(icon);

      ["mousedown", "mouseup", "click"].forEach((eventName) => {
        button.addEventListener(eventName, (event) => {
          event.preventDefault();
          event.stopPropagation();

          if (eventName === "click") {
            selectize.clear(true);
            syncShinyInput(selectize);
            updateClearButton(container, button, selectize);
          }
        });
      });

      label.insertAdjacentElement("afterend", button);
    }

    updateClearButton(container, button, selectize);

    if (selectize.on) {
      selectize.on("change", () => updateClearButton(container, button, selectize));
      selectize.on("item_add", () => updateClearButton(container, button, selectize));
      selectize.on("item_remove", () => updateClearButton(container, button, selectize));
    }
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
      const icon = document.createElement("i");
      button.type = "button";
      button.className = BUTTON_CLASS;
      button.title = `Add all ${groupLabel}`;
      button.setAttribute("aria-label", `Add all ${groupLabel}`);
      icon.className = "fa-solid fa-plus";
      icon.setAttribute("aria-hidden", "true");
      button.appendChild(icon);

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

  const isDropdownOpen = (selectize, control) => (
    selectize.isOpen ||
    control.classList.contains("dropdown-active") ||
    Boolean(selectize.$dropdown && selectize.$dropdown.is(":visible"))
  );

  const setControlCursor = (selectize, control, cursor) => {
    const input = controlInputFor(selectize);
    control.style.cursor = cursor;

    if (input) {
      input.style.cursor = cursor;
    }
  };

  const updateOpenCursor = (selectize, control) => {
    setControlCursor(
      selectize,
      control,
      isDropdownOpen(selectize, control) ? "pointer" : ""
    );
  };

  const suppressControlEvent = (event) => {
    if (event.target.closest(".selectize-dropdown")) {
      return false;
    }

    if (event.target.closest(".remove, button, a, [role='button']")) {
      return false;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    return true;
  };

  const closeDropdownFromControl = (selectize, control) => {
    selectize.close();
    selectize.blur();

    const input = controlInputFor(selectize);
    if (input) {
      input.blur();
    }

    updateOpenCursor(selectize, control);
  };

  const addControlToggleBehaviour = (selectize) => {
    const control = selectize.$control && selectize.$control[0];
    if (!control) {
      return;
    }

    let pendingMouseRelease = false;
    let suppressUntil = 0;
    const shouldSuppressFollowUp = () => window.performance.now() < suppressUntil;

    updateOpenCursor(selectize, control);

    control.addEventListener(
      "mousedown",
      (event) => {
        pendingMouseRelease = suppressControlEvent(event);
      },
      true
    );

    control.addEventListener(
      "mouseup",
      (event) => {
        if (!pendingMouseRelease || !suppressControlEvent(event)) {
          pendingMouseRelease = false;
          return;
        }

        pendingMouseRelease = false;
        suppressUntil = window.performance.now() + CLOSE_SUPPRESSION_MS;

        if (isDropdownOpen(selectize, control)) {
          closeDropdownFromControl(selectize, control);
        } else {
          selectize.focus();
          selectize.open();
          disableKeyboardActiveState(selectize);
          clearUnhoveredActiveOptionsSoon(selectize);
          updateOpenCursor(selectize, control);
        }
      },
      true
    );

    ["click", "focusin"].forEach((eventName) => {
      control.addEventListener(
        eventName,
        (event) => {
          if (shouldSuppressFollowUp()) {
            suppressControlEvent(event);
          }
        },
        true
      );
    });

    if (selectize.on) {
      selectize.on("dropdown_open", () => updateOpenCursor(selectize, control));
      selectize.on("dropdown_close", () => updateOpenCursor(selectize, control));
      selectize.on("blur", () => updateOpenCursor(selectize, control));
    }
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
    addSelectedPlaceholder(selectize);
    addCollapsedGroupItems(selectize);
    wrapSelectedItemLabelsSoon(selectize);
    addControlToggleBehaviour(selectize);
    addHeaderClearButton(select, selectize);

    if (selectize.$control && selectize.$control[0]) {
      selectize.$control[0].addEventListener("keydown", (event) => {
        const input = controlInputFor(selectize);
        const isSelectAll = (
          event.key.toLowerCase() === "a" &&
          (event.ctrlKey || event.metaKey) &&
          !event.altKey
        );
        const isRemovalKey = event.key === "Backspace" || event.key === "Delete";

        if (isSelectAll) {
          suppressKeyboardEvent(event);

          if (inputHasSearchText(input) && input.select) {
            input.select();
          }

          return;
        }

        if (isRemovalKey && !inputHasSearchText(input)) {
          suppressKeyboardEvent(event);
          return;
        }

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
      ["change", "item_add", "item_remove"].forEach((eventName) => {
        selectize.on(eventName, () => wrapSelectedItemLabelsSoon(selectize));
      });
    }

    return true;
  };

  const enhanceAllMultiSelects = () => {
    document.querySelectorAll("select.shiny-input-select[multiple]").forEach((select) => {
      enhanceMultiSelect(select);
    });
  };

  const applyAllSelectedItemColoursSoon = () => {
    document.querySelectorAll("select.shiny-input-select[multiple]").forEach((select) => {
      if (select.selectize) {
        applySelectedItemColoursSoon(select.selectize);
      }
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

  document.addEventListener("eeud-selectize-colours-ready", () => {
    applyAllSelectedItemColoursSoon();
  });
})();
