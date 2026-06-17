(() => {
  const PALETTE_URL = "data/eeud-colour-palette-2026.csv";
  const READY_EVENT = "eeud-selectize-colours-ready";

  const parseCsvLine = (line) => {
    const values = [];
    let value = "";
    let inQuotes = false;

    for (let index = 0; index < line.length; index += 1) {
      const character = line[index];
      const nextCharacter = line[index + 1];

      if (character === '"' && inQuotes && nextCharacter === '"') {
        value += '"';
        index += 1;
      } else if (character === '"') {
        inQuotes = !inQuotes;
      } else if (character === "," && !inQuotes) {
        values.push(value);
        value = "";
      } else {
        value += character;
      }
    }

    values.push(value);
    return values;
  };

  const parsePalette = (csvText) => {
    const lines = csvText.trim().split(/\r?\n/);
    const headers = parseCsvLine(lines.shift() || "");
    const dimensionIndex = headers.indexOf("Dimension");
    const labelIndex = headers.indexOf("Label");
    const colourIndex = headers.indexOf("Colour");
    const palette = {};

    lines.forEach((line) => {
      if (!line.trim()) {
        return;
      }

      const values = parseCsvLine(line);
      const dimension = values[dimensionIndex];
      const label = values[labelIndex];
      const colour = values[colourIndex];

      if (!dimension || !label || !colour) {
        return;
      }

      palette[dimension] = palette[dimension] || {};
      palette[dimension][label] = colour;
    });

    return palette;
  };

  const dispatchReady = () => {
    document.dispatchEvent(new CustomEvent(READY_EVENT));
  };

  window.EEUD_SELECTIZE_COLOURS = window.EEUD_SELECTIZE_COLOURS || {};

  fetch(PALETTE_URL)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Unable to load ${PALETTE_URL}`);
      }

      return response.text();
    })
    .then((csvText) => {
      window.EEUD_SELECTIZE_COLOURS = parsePalette(csvText);
      dispatchReady();
    })
    .catch(() => {
      dispatchReady();
    });
})();
