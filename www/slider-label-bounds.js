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

  const startForceEdgeRetries = () => {
    let attempts = 0;
    const intervalId = window.setInterval(() => {
      attempts += 1;
      setForceEdgeAttrs();
      if (attempts >= 40) {
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
