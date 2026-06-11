(() => {
  const EMBEDDED_CLASS = "dashboard-embedded";
  const SIZING_ELEMENT_ID = "dashboard-iframe-size";
  const SIZING_ATTRIBUTE = "data-iframe-size";
  const EMBEDDED_MIN_HEIGHT = 1000;
  const RESIZE_DEBOUNCE_MS = 60;

  let resizeTimer = null;

  const isEmbedded = () => {
    try {
      return window.self !== window.top;
    } catch (error) {
      return true;
    }
  };

  const isDashboardEmbedded = () => (
    document.documentElement.classList.contains(EMBEDDED_CLASS)
  );

  const embeddedMinHeight = () => {
    const value = window.getComputedStyle(document.documentElement)
      .getPropertyValue("--dashboard-embedded-min-height");
    const minHeight = Number.parseFloat(value);

    return Number.isFinite(minHeight) ? minHeight : EMBEDDED_MIN_HEIGHT;
  };

  const embeddedDashboardHeight = () => Math.ceil(embeddedMinHeight());

  const updateLayoutVariables = () => {
    const header = document.getElementById("quarto-dashboard-header");
    const headerHeight = header ? header.getBoundingClientRect().height : 0;

    document.documentElement.style.setProperty(
      "--dashboard-header-height",
      `${Math.ceil(headerHeight)}px`
    );
  };

  const applyEmbeddedLayoutStyles = () => {
    if (!isDashboardEmbedded()) {
      return;
    }

    [
      document.documentElement,
      document.body,
      document.body && document.body.classList.contains("dashboard-fill")
        ? document.body
        : null,
    ].forEach((element) => {
      if (!element) {
        return;
      }

      element.style.setProperty("height", "var(--dashboard-height)", "important");
      element.style.setProperty("min-height", "var(--dashboard-embedded-min-height)", "important");
      element.style.setProperty("max-height", "var(--dashboard-height)", "important");
      element.style.setProperty("overflow", "hidden", "important");
    });
  };

  const removeLegacySizingAttributes = () => {
    [
      document.documentElement,
      document.body,
      document.querySelector(".quarto-dashboard-content"),
    ].forEach((element) => {
      if (!element) {
        return;
      }

      element.removeAttribute(SIZING_ATTRIBUTE);
      element.removeAttribute("data-iframe-height");
    });
  };

  const ensureSizingElement = () => {
    if (!document.body) {
      return null;
    }

    let element = document.getElementById(SIZING_ELEMENT_ID);

    if (!element) {
      element = document.createElement("div");
      element.id = SIZING_ELEMENT_ID;
      element.setAttribute("aria-hidden", "true");
      document.body.appendChild(element);
    }

    element.setAttribute(SIZING_ATTRIBUTE, "");
    element.style.cssText = [
      "position:absolute",
      "left:0",
      "top:0",
      "width:1px",
      "height:var(--dashboard-height)",
      "overflow:hidden",
      "opacity:0",
      "pointer-events:none",
    ].join(";");

    return element;
  };

  const parentIframeApi = () => window.parentIframe || window.parentIFrame;

  const requestParentResize = () => {
    if (!isDashboardEmbedded()) {
      return;
    }

    const api = parentIframeApi();
    if (!api) {
      return;
    }

    try {
      if (typeof api.setHeightCalculationMethod === "function") {
        api.setHeightCalculationMethod("taggedElement");
      }

      if (typeof api.resize === "function") {
        api.resize(embeddedDashboardHeight());
      } else if (typeof api.size === "function") {
        api.size(embeddedDashboardHeight());
      }
    } catch (error) {
      // The parent API may not be ready during early page setup.
    }
  };

  const requestParentResizeSoon = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(requestParentResize, RESIZE_DEBOUNCE_MS);
  };

  const markEmbedded = () => {
    if (!isEmbedded()) {
      return;
    }

    document.documentElement.classList.add(EMBEDDED_CLASS);
    document.documentElement.style.setProperty(
      "--dashboard-embedded-min-height",
      `${EMBEDDED_MIN_HEIGHT}px`
    );

    if (document.body) {
      document.body.classList.add(EMBEDDED_CLASS);
    }

    updateLayoutVariables();
    applyEmbeddedLayoutStyles();
    removeLegacySizingAttributes();
    ensureSizingElement();
    requestParentResizeSoon();
  };

  const previousConfig = window.iframeResizer || window.iFrameResizer || {};

  const iframeResizerConfig = {
    ...previousConfig,
    heightCalculationMethod: "taggedElement",
    sizeSelector: `#${SIZING_ELEMENT_ID}`,
    onBeforeResize(height) {
      let nextHeight = height;

      if (typeof previousConfig.onBeforeResize === "function") {
        const previousHeight = previousConfig.onBeforeResize.call(this, height);

        if (Number.isFinite(previousHeight)) {
          nextHeight = previousHeight;
        }
      }

      if (!isDashboardEmbedded()) {
        return nextHeight;
      }

      return embeddedDashboardHeight();
    },
    onReady(...args) {
      if (typeof previousConfig.onReady === "function") {
        previousConfig.onReady.call(this, ...args);
      }

      markEmbedded();
      requestParentResize();
    },
  };

  window.iframeResizer = iframeResizerConfig;
  window.iFrameResizer = iframeResizerConfig;

  markEmbedded();

  document.addEventListener("DOMContentLoaded", markEmbedded);
  window.addEventListener("load", markEmbedded);
  window.addEventListener("resize", () => {
    updateLayoutVariables();
    applyEmbeddedLayoutStyles();
    requestParentResizeSoon();
  });

  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", () => {
      updateLayoutVariables();
      applyEmbeddedLayoutStyles();
      requestParentResizeSoon();
    });
  }
})();
