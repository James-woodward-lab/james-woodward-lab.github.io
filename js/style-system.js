/**
 * UI style system: palette + custom palette + density controls.
 * Persists in localStorage and applies as <html> classes.
 */
(function() {
  var VARIANT_KEY = "jwl-style-variant";
  var DENSITY_KEY = "jwl-style-density";
  var CUSTOM_KEY = "jwl-style-custom-palette";
  var VARIANT_CLASSES = [
    "theme-palette-teal",
    "theme-palette-original",
    "theme-palette-blue",
    "theme-palette-indigo",
    "theme-palette-emerald",
    "theme-palette-rose",
    "theme-palette-custom"
  ];
  var DENSITY_CLASSES = ["density-comfortable", "density-compact"];
  var DEFAULT_VARIANT = "theme-palette-teal";
  var DEFAULT_DENSITY = "density-comfortable";
  var DEFAULT_CUSTOM = {
    bg: "#0f172a",
    surface: "#1a2740",
    border: "#344966",
    accent: "#14b8a6",
    text: "#e2edf9"
  };

  function readStorage(key, fallback) {
    try {
      return localStorage.getItem(key) || fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch (e) {}
  }

  function removeStorage(key) {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  }

  function migrateLegacyVariant(stored) {
    if (!stored) return null;
    if (stored === "theme-modern-a") return "theme-palette-teal";
    if (stored === "theme-modern-b") return "theme-palette-blue";
    if (stored === "theme-modern-c") return "theme-palette-indigo";
    return stored;
  }

  function setSingleClass(classList, allowed, nextClass, fallback) {
    allowed.forEach(function(cls) {
      classList.remove(cls);
    });
    classList.add(allowed.indexOf(nextClass) >= 0 ? nextClass : fallback);
  }

  function normalizeHex(value) {
    if (!value) return null;
    var v = String(value).trim();
    if (!v.startsWith("#")) v = "#" + v;
    if (/^#[0-9a-fA-F]{3}$/.test(v)) {
      var r = v[1];
      var g = v[2];
      var b = v[3];
      return ("#" + r + r + g + g + b + b).toUpperCase();
    }
    if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toUpperCase();
    return null;
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function hexToRgb(hex) {
    var norm = normalizeHex(hex);
    if (!norm) return null;
    return {
      r: parseInt(norm.slice(1, 3), 16),
      g: parseInt(norm.slice(3, 5), 16),
      b: parseInt(norm.slice(5, 7), 16)
    };
  }

  function rgbToHex(r, g, b) {
    var toHex = function(n) {
      return clamp(Math.round(n), 0, 255).toString(16).padStart(2, "0");
    };
    return ("#" + toHex(r) + toHex(g) + toHex(b)).toUpperCase();
  }

  function mixHex(hexA, hexB, ratio) {
    var a = hexToRgb(hexA);
    var b = hexToRgb(hexB);
    if (!a || !b) return hexA;
    var t = clamp(ratio, 0, 1);
    return rgbToHex(
      a.r + (b.r - a.r) * t,
      a.g + (b.g - a.g) * t,
      a.b + (b.b - a.b) * t
    );
  }

  function rgbFromHexForCss(hex) {
    var rgb = hexToRgb(hex);
    if (!rgb) return "20, 184, 166";
    return rgb.r + ", " + rgb.g + ", " + rgb.b;
  }

  function getReadableTextOn(hex) {
    var rgb = hexToRgb(hex);
    if (!rgb) return "#F8FAFC";
    // Relative luminance approximation for button foreground choice.
    var yiq = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    return yiq >= 150 ? "#0B1320" : "#F8FAFC";
  }

  function readCustomPalette() {
    var parsed = null;
    try {
      parsed = JSON.parse(readStorage(CUSTOM_KEY, ""));
    } catch (e) {
      parsed = null;
    }
    var source = parsed && typeof parsed === "object" ? parsed : DEFAULT_CUSTOM;
    return {
      bg: normalizeHex(source.bg) || DEFAULT_CUSTOM.bg,
      surface: normalizeHex(source.surface) || DEFAULT_CUSTOM.surface,
      border: normalizeHex(source.border) || DEFAULT_CUSTOM.border,
      accent: normalizeHex(source.accent) || DEFAULT_CUSTOM.accent,
      text: normalizeHex(source.text) || DEFAULT_CUSTOM.text
    };
  }

  function writeCustomPalette(palette) {
    writeStorage(CUSTOM_KEY, JSON.stringify(palette));
  }

  function clearCustomPaletteVars() {
    var html = document.documentElement;
    [
      "--bg",
      "--bg-elevated",
      "--surface",
      "--surface2",
      "--surface3",
      "--border",
      "--text",
      "--text-soft",
      "--muted",
      "--accent",
      "--accent2",
      "--focus-ring"
    ].forEach(function(token) {
      html.style.removeProperty(token);
    });
  }

  function applyCustomPalette(palette) {
    var html = document.documentElement;
    var bgElevated = mixHex(palette.bg, "#FFFFFF", 0.06);
    var surface2 = mixHex(palette.surface, "#FFFFFF", 0.08);
    var surface3 = mixHex(palette.surface, "#FFFFFF", 0.14);
    var textSoft = mixHex(palette.text, palette.surface, 0.18);
    var muted = mixHex(palette.text, palette.bg, 0.42);
    var accent2 = mixHex(palette.accent, "#FFFFFF", 0.2);
    var accentRgb = rgbFromHexForCss(palette.accent);
    var accentOn = getReadableTextOn(palette.accent);
    html.style.setProperty("--bg", palette.bg);
    html.style.setProperty("--bg-elevated", bgElevated);
    html.style.setProperty("--surface", palette.surface);
    html.style.setProperty("--surface2", surface2);
    html.style.setProperty("--surface3", surface3);
    html.style.setProperty("--border", palette.border);
    html.style.setProperty("--text", palette.text);
    html.style.setProperty("--text-soft", textSoft);
    html.style.setProperty("--muted", muted);
    html.style.setProperty("--accent", palette.accent);
    html.style.setProperty("--accent2", accent2);
    html.style.setProperty("--accent-on", accentOn);
    html.style.setProperty("--focus-ring", "rgba(" + accentRgb + ", 0.32)");
  }

  function currentVariant() {
    var html = document.documentElement;
    for (var i = 0; i < VARIANT_CLASSES.length; i++) {
      if (html.classList.contains(VARIANT_CLASSES[i])) return VARIANT_CLASSES[i];
    }
    return DEFAULT_VARIANT;
  }

  function updateMetaColorByVariant() {
    var meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    var bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
    if (bg) meta.content = bg;
  }

  function applyStored() {
    var html = document.documentElement;
    var storedVariant = readStorage(VARIANT_KEY, DEFAULT_VARIANT);
    var variant = migrateLegacyVariant(storedVariant);
    if (variant !== storedVariant) writeStorage(VARIANT_KEY, variant);
    var density = readStorage(DENSITY_KEY, DEFAULT_DENSITY);
    setSingleClass(html.classList, VARIANT_CLASSES, variant, DEFAULT_VARIANT);
    setSingleClass(html.classList, DENSITY_CLASSES, density, DEFAULT_DENSITY);
    if (currentVariant() === "theme-palette-custom") {
      applyCustomPalette(readCustomPalette());
    } else {
      clearCustomPaletteVars();
    }
    updateMetaColorByVariant();
  }

  function setVariant(nextVariant) {
    var html = document.documentElement;
    setSingleClass(html.classList, VARIANT_CLASSES, nextVariant, DEFAULT_VARIANT);
    var active = currentVariant();
    writeStorage(VARIANT_KEY, active);
    if (active === "theme-palette-custom") {
      applyCustomPalette(readCustomPalette());
    } else {
      clearCustomPaletteVars();
    }
    updateMetaColorByVariant();
  }

  function setDensity(nextDensity) {
    var html = document.documentElement;
    setSingleClass(html.classList, DENSITY_CLASSES, nextDensity, DEFAULT_DENSITY);
    writeStorage(DENSITY_KEY, html.classList.contains("density-compact") ? "density-compact" : "density-comfortable");
  }

  function setInputValue(scope, selector, value) {
    var input = scope.querySelector(selector);
    if (input) input.value = value;
  }

  function fillCustomInputs(scope, palette) {
    setInputValue(scope, "[data-custom-bg]", palette.bg);
    setInputValue(scope, "[data-custom-surface]", palette.surface);
    setInputValue(scope, "[data-custom-border]", palette.border);
    setInputValue(scope, "[data-custom-accent]", palette.accent);
    setInputValue(scope, "[data-custom-text]", palette.text);
  }

  function setCustomUiVisibility(scope, show) {
    var wrap = scope.querySelector("[data-custom-palette]");
    if (!wrap) return;
    wrap.hidden = !show;
    wrap.setAttribute("aria-hidden", show ? "false" : "true");
  }

  function clearInputErrors(scope) {
    var inputs = scope.querySelectorAll("[data-custom-palette] input");
    inputs.forEach(function(input) {
      input.classList.remove("is-invalid");
    });
    var error = scope.querySelector("[data-custom-error]");
    if (error) error.textContent = "";
  }

  function readCustomInputs(scope) {
    var bgEl = scope.querySelector("[data-custom-bg]");
    var surfaceEl = scope.querySelector("[data-custom-surface]");
    var borderEl = scope.querySelector("[data-custom-border]");
    var accentEl = scope.querySelector("[data-custom-accent]");
    var textEl = scope.querySelector("[data-custom-text]");
    return {
      bg: bgEl ? bgEl.value : "",
      surface: surfaceEl ? surfaceEl.value : "",
      border: borderEl ? borderEl.value : "",
      accent: accentEl ? accentEl.value : "",
      text: textEl ? textEl.value : ""
    };
  }

  function validateCustom(scope) {
    clearInputErrors(scope);
    var raw = readCustomInputs(scope);
    var out = {};
    var invalidKeys = [];
    Object.keys(raw).forEach(function(k) {
      var norm = normalizeHex(raw[k]);
      if (!norm) invalidKeys.push(k);
      else out[k] = norm;
    });
    if (invalidKeys.length) {
      invalidKeys.forEach(function(k) {
        var el = scope.querySelector("[data-custom-" + k + "]");
        if (el) el.classList.add("is-invalid");
      });
      var error = scope.querySelector("[data-custom-error]");
      if (error) error.textContent = "Enter valid hex values like #0F172A or #0FA.";
      return null;
    }
    return out;
  }

  function bindPanel() {
    var panel = document.querySelector("[data-style-panel]");
    if (!panel) return;
    var scope = panel.closest(".card") || panel.parentElement || document;

    var variantSelect = panel.querySelector("[data-style-variant]");
    var densitySelect = panel.querySelector("[data-style-density]");
    var modeSelect = panel.querySelector("[data-style-mode]");
    var applyCustomBtn = scope.querySelector("[data-custom-apply]");
    var resetCustomBtn = scope.querySelector("[data-custom-reset]");

    if (variantSelect) {
      var storedVariant = migrateLegacyVariant(readStorage(VARIANT_KEY, DEFAULT_VARIANT));
      variantSelect.value = storedVariant;
      setCustomUiVisibility(scope, storedVariant === "theme-palette-custom");
      variantSelect.addEventListener("change", function(e) {
        var next = e.target.value;
        setVariant(next);
        setCustomUiVisibility(scope, next === "theme-palette-custom");
        if (next === "theme-palette-custom") {
          fillCustomInputs(scope, readCustomPalette());
          clearInputErrors(scope);
        }
      });
    }

    if (densitySelect) {
      densitySelect.value = readStorage(DENSITY_KEY, DEFAULT_DENSITY);
      densitySelect.addEventListener("change", function(e) {
        setDensity(e.target.value);
      });
    }

    if (modeSelect) {
      modeSelect.value = document.documentElement.classList.contains("theme-light") ? "light" : "dark";
      modeSelect.addEventListener("change", function(e) {
        var selected = e.target.value;
        try {
          localStorage.setItem("jwl-theme", selected === "light" ? "light" : "dark");
        } catch (err) {}
        if (selected === "light") {
          document.documentElement.classList.add("theme-light");
        } else {
          document.documentElement.classList.remove("theme-light");
        }
        updateMetaColorByVariant();
        var toggleBtn = document.getElementById("theme-toggle");
        if (toggleBtn) toggleBtn.textContent = selected === "light" ? "🌙" : "☀️";
      });
    }

    fillCustomInputs(scope, readCustomPalette());

    if (applyCustomBtn) {
      applyCustomBtn.addEventListener("click", function() {
        var validated = validateCustom(scope);
        if (!validated) return;
        writeCustomPalette(validated);
        setVariant("theme-palette-custom");
        if (variantSelect) variantSelect.value = "theme-palette-custom";
        setCustomUiVisibility(scope, true);
        clearInputErrors(scope);
      });
    }

    if (resetCustomBtn) {
      resetCustomBtn.addEventListener("click", function() {
        fillCustomInputs(scope, DEFAULT_CUSTOM);
        writeCustomPalette(DEFAULT_CUSTOM);
        if (currentVariant() === "theme-palette-custom") {
          applyCustomPalette(DEFAULT_CUSTOM);
          updateMetaColorByVariant();
        }
        clearInputErrors(scope);
      });
    }
  }

  applyStored();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindPanel);
  } else {
    bindPanel();
  }

  window.StyleSystem = {
    applyStored: applyStored,
    setVariant: setVariant,
    setDensity: setDensity,
    normalizeHex: normalizeHex
  };
})();
