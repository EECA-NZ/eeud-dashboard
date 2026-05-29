(() => {
  const sliderIds = ["explore_period", "data_period"];

  const setForceEdgeAttrs = () => {
    sliderIds.forEach((id) => {
      const input = document.getElementById(id);
      if (input) {
        input.setAttribute("data-force-edges", "true");
      }
    });
  };

  const enableForceEdges = () => {
    if (!window.jQuery) {
      return false;
    }

    let applied = false;

    sliderIds.forEach((id) => {
      const slider = window.jQuery(`#${id}`).data("ionRangeSlider");
      if (slider) {
        slider.update({ force_edges: true });
        applied = true;
      }
    });

    return applied;
  };

  const startForceEdgeRetries = () => {
    let attempts = 0;
    const intervalId = window.setInterval(() => {
      attempts += 1;
      setForceEdgeAttrs();
      if (enableForceEdges() || attempts >= 40) {
        window.clearInterval(intervalId);
      }
    }, 150);
  };

  document.addEventListener("DOMContentLoaded", () => {
    setForceEdgeAttrs();
    startForceEdgeRetries();
  });

  document.addEventListener("shiny:connected", () => {
    setForceEdgeAttrs();
    startForceEdgeRetries();
  });
})();
