function getDate(languageCode) {
  const options = { year: "numeric", month: "long", day: "numeric" };
  return new Date().toLocaleDateString(languageCode, options);
}

const welcomeElement = document.getElementById("welcome");
if (welcomeElement) {
  const languageCode = navigator.language.slice(0, 2);
  const date = getDate(languageCode);
  const greeting = getGreeting(languageCode);
  welcomeElement.innerHTML = `${greeting} !<br /><span class="accent">${date}</span>`;
}
// ===== Wallpaper functionality =====

// Create wallpaper background element if it doesn't exist
function createWallpaperElement() {
  let wallpaperDiv = document.querySelector(".wallpaper-background");
  if (!wallpaperDiv) {
    wallpaperDiv = document.createElement("div");
    wallpaperDiv.className = "wallpaper-background";
    document.body.insertBefore(wallpaperDiv, document.body.firstChild);
  }
  return wallpaperDiv;
}

// Apply wallpaper settings
function applyWallpaper(imageData, opacity, blur, grain) {
  const wallpaperDiv = createWallpaperElement();

  if (imageData) {
    wallpaperDiv.style.backgroundImage = `url(${imageData})`;
    wallpaperDiv.style.opacity = opacity / 100;
    wallpaperDiv.style.filter = `blur(${blur}px)`;

    // Apply grain effect
    const existingStyle = document.getElementById("grain-style");
    if (existingStyle) {
      existingStyle.remove();
    }

    if (grain > 0) {
      const style = document.createElement("style");
      style.id = "grain-style";
      style.textContent = `.wallpaper-background::after { opacity: ${
        grain / 100
      } !important; }`;
      document.head.appendChild(style);
    }
  } else {
    wallpaperDiv.style.backgroundImage = "none";
  }
}

// Update live preview in settings modal
function updatePreview(imageData, opacity, blur, grain, isImageTab) {
  const previewBackground = document.getElementById("previewBackground");
  const previewContent = document.getElementById("previewContent");
  if (!previewBackground) return;

  if (imageData) {
    previewBackground.style.backgroundImage = `url(${imageData})`;
    previewBackground.style.opacity = opacity / 100;
    previewBackground.style.filter = `blur(${blur}px)`;

    // Hide "no image" message
    if (previewContent) {
      previewContent.style.display = "none";
    }

    // Apply grain effect to preview
    const existingStyle = document.getElementById("preview-grain-style");
    if (existingStyle) {
      existingStyle.remove();
    }

    if (grain > 0) {
      const style = document.createElement("style");
      style.id = "preview-grain-style";
      style.textContent = `.preview-background::after { opacity: ${
        grain / 100
      } !important; }`;
      document.head.appendChild(style);
    }
  } else {
    previewBackground.style.backgroundImage = "none";
    previewBackground.style.opacity = 1;
    previewBackground.style.filter = "none";

    // Show appropriate message
    if (previewContent) {
      previewContent.style.display = "flex";
      const label = previewContent.querySelector(".preview-label");
      if (label) {
        label.textContent = isImageTab ? "No image selected" : "Live Preview";
      }
    }
  }
}

// Load wallpaper settings from storage
function loadWallpaperSettings() {
  browser.storage.local.get(
    [
      "wallpaperImage",
      "wallpaperOpacity",
      "wallpaperBlur",
      "wallpaperGrain",
      "isBingImage",
      "bingImageDate",
    ],
    async function (result) {
      const opacity =
        result.wallpaperOpacity !== undefined ? result.wallpaperOpacity : 50;
      const blur =
        result.wallpaperBlur !== undefined ? result.wallpaperBlur : 0;
      const grain =
        result.wallpaperGrain !== undefined ? result.wallpaperGrain : 0;

      // Check if Bing image needs refresh
      if (result.isBingImage && result.bingImageDate) {
        const today = new Date().toDateString();
        const savedDate = new Date(result.bingImageDate).toDateString();

        if (today !== savedDate) {
          // Fetch new Bing image
          const newImageData = await fetchBingImageOfTheDay();
          if (newImageData) {
            saveWallpaperSettings(newImageData, opacity, blur, grain, true);
            applyWallpaper(newImageData, opacity, blur, grain);
            return;
          }
        }
      }

      if (result.wallpaperImage) {
        applyWallpaper(result.wallpaperImage, opacity, blur, grain);
      }
    }
  );
}

// Save wallpaper settings to storage
function saveWallpaperSettings(
  imageData,
  opacity,
  blur,
  grain,
  isBingImage = false
) {
  const settings = {
    wallpaperImage: imageData,
    wallpaperOpacity: opacity,
    wallpaperBlur: blur,
    wallpaperGrain: grain,
    isBingImage: isBingImage,
  };

  if (isBingImage) {
    settings.bingImageDate = new Date().toISOString();
  }

  browser.storage.local.set(settings);
}

// Fetch Bing Image of the Day
async function fetchBingImageOfTheDay() {
  try {
    const response = await fetch(
      "https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=en-US"
    );
    const data = await response.json();
    if (data.images && data.images.length > 0) {
      const imageUrl = "https://www.bing.com" + data.images[0].url;
      // Convert to base64 for storage
      const imageResponse = await fetch(imageUrl);
      const blob = await imageResponse.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    }
  } catch (error) {
    console.error("Failed to fetch Bing Image of the Day:", error);
    return null;
  }
}

// ===== Theme functionality =====

const THEME_BG_DEFAULTS = { dark: "#1f1f1f", light: "#f5f3ec" };

function getThemeBgKey(theme) {
  return "zenBgColor" + theme.charAt(0).toUpperCase() + theme.slice(1);
}

function applyThemeBgColor(hexColor) {
  if (hexColor) {
    document.documentElement.style.setProperty("--zen-paper", hexColor);
  } else {
    document.documentElement.style.removeProperty("--zen-paper");
  }
}

function loadThemeBgColor(theme) {
  let key;
  if (theme === "system") {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    key = prefersDark ? "zenBgColorDark" : "zenBgColorLight";
  } else {
    key = getThemeBgKey(theme);
  }
  browser.storage.local.get(key, function (result) {
    const color = result[key] || null;
    applyThemeBgColor(color);
    if (theme !== "system") {
      if (color) {
        localStorage.setItem("zenBgColorCache_" + theme, color);
      } else {
        localStorage.removeItem("zenBgColorCache_" + theme);
      }
    }
  });
}

function loadTheme() {
  browser.storage.local.get("zenTheme", function (result) {
    const theme = result.zenTheme || "dark";
    applyTheme(theme);
  });
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("zenThemeCache", theme);
  const cachedColor = localStorage.getItem("zenBgColorCache_" + theme);
  if (cachedColor) {
    document.documentElement.style.setProperty("--zen-paper", cachedColor);
  } else {
    document.documentElement.style.removeProperty("--zen-paper");
  }
  document.querySelectorAll(".theme-option").forEach(function (btn) {
    btn.classList.toggle("active", btn.dataset.theme === theme);
  });
  loadThemeBgColor(theme);
}

function saveTheme(theme) {
  browser.storage.local.set({ zenTheme: theme });
  applyTheme(theme);
}

// Handle wallpaper upload
document.addEventListener("DOMContentLoaded", function () {
  const wallpaperUploadBtn = document.getElementById("wallpaperUploadBtn");
  const wallpaperUpload = document.getElementById("wallpaperUpload");
  const bingImageBtn = document.getElementById("bingImageBtn");
  const removeWallpaperBtn = document.getElementById("removeWallpaperBtn");
  const resetAllBtn = document.getElementById("resetAllBtn");
  const dragDropArea = document.getElementById("dragDropArea");
  const wallpaperColorDark = document.getElementById("wallpaperColorDark");
  const wallpaperColorLight = document.getElementById("wallpaperColorLight");
  const applyColorBtn = document.getElementById("applyColorBtn");
  const effectsControls = document.getElementById("effectsControls");
  const opacitySlider = document.getElementById("wallpaperOpacity");
  const blurSlider = document.getElementById("wallpaperBlur");
  const grainSlider = document.getElementById("wallpaperGrain");
  const opacityValue = document.getElementById("opacityValue");
  const blurValue = document.getElementById("blurValue");
  const grainValue = document.getElementById("grainValue");

  // Tab elements
  const colorTab = document.getElementById("colorTab");
  const imageTab = document.getElementById("imageTab");
  const colorTabContent = document.getElementById("colorTabContent");
  const imageTabContent = document.getElementById("imageTabContent");

  // Collapsible background section
  const backgroundHeader = document.getElementById("backgroundHeader");
  const backgroundContent = document.getElementById("backgroundContent");
  const backgroundToggle = document.getElementById("backgroundToggle");

  // Toggle background section
  if (backgroundHeader) {
    backgroundHeader.addEventListener("click", function () {
      const isOpen = backgroundContent.style.display === "block";
      backgroundContent.style.display = isOpen ? "none" : "block";
      backgroundToggle.style.transform = isOpen
        ? "rotate(-90deg)"
        : "rotate(0deg)";

      // Save state
      browser.storage.local.set({ backgroundSectionOpen: !isOpen });
    });
  }

  // Tab switching functionality
  function switchTab(tabName) {
    // Update tab buttons
    if (colorTab && imageTab) {
      if (tabName === "color") {
        colorTab.classList.add("active");
        imageTab.classList.remove("active");
        colorTabContent.classList.add("active");
        imageTabContent.classList.remove("active");
      } else {
        imageTab.classList.add("active");
        colorTab.classList.remove("active");
        imageTabContent.classList.add("active");
        colorTabContent.classList.remove("active");
      }
    }

    // Save selected tab
    browser.storage.local.set({ selectedBackgroundTab: tabName });

    // Update preview message if on image tab with no image
    browser.storage.local.get(["wallpaperImage"], function (result) {
      const isImageTab = tabName === "image";
      if (!result.wallpaperImage && isImageTab) {
        updatePreview(null, 50, 0, 0, true);
      } else if (result.wallpaperImage) {
        const opacity = parseInt(opacitySlider.value);
        const blur = parseInt(blurSlider.value);
        const grain = parseInt(grainSlider.value);
        updatePreview(result.wallpaperImage, opacity, blur, grain, isImageTab);
      }
    });
  }

  // Add tab click listeners
  if (colorTab) {
    colorTab.addEventListener("click", () => switchTab("color"));
  }
  if (imageTab) {
    imageTab.addEventListener("click", () => switchTab("image"));
  }

  // Helper function to show/hide effects controls
  function toggleEffectsControls(show) {
    if (effectsControls) {
      effectsControls.style.display = show ? "block" : "none";
    }
    if (removeWallpaperBtn) {
      removeWallpaperBtn.style.display = show ? "block" : "none";
    }
  }

  // Helper function to handle image data
  function handleImageData(imageData) {
    const opacity = parseInt(opacitySlider.value);
    const blur = parseInt(blurSlider.value);
    const grain = parseInt(grainSlider.value);

    saveWallpaperSettings(imageData, opacity, blur, grain);
    applyWallpaper(imageData, opacity, blur, grain);
    updatePreview(imageData, opacity, blur, grain, true);
    toggleEffectsControls(true);

    // Switch to image tab when image is added
    switchTab("image");
  }

  // Load saved wallpaper and theme on page load
  loadWallpaperSettings();
  loadTheme();

  // Wire theme toggle buttons
  document.querySelectorAll(".theme-option").forEach(function (btn) {
    btn.addEventListener("click", function () {
      saveTheme(btn.dataset.theme);
    });
  });

  // Live swatch color update as user drags the color picker
  if (wallpaperColorDark) {
    wallpaperColorDark.addEventListener("input", function () {
      const swatch = document.getElementById("darkColorSwatch");
      if (swatch) swatch.style.backgroundColor = this.value;
    });
  }
  if (wallpaperColorLight) {
    wallpaperColorLight.addEventListener("input", function () {
      const swatch = document.getElementById("lightColorSwatch");
      if (swatch) swatch.style.backgroundColor = this.value;
    });
  }

  // Load saved settings into UI when settings modal is opened
  const settingsBtn = document.getElementById("settingsBtn");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", function () {
      browser.storage.local.get("zenTheme", function (result) {
        const theme = result.zenTheme || "dark";
        document.querySelectorAll(".theme-option").forEach(function (btn) {
          btn.classList.toggle("active", btn.dataset.theme === theme);
        });
        browser.storage.local.get(
          ["zenBgColorDark", "zenBgColorLight"],
          function (colors) {
            const darkColor = colors.zenBgColorDark || THEME_BG_DEFAULTS.dark;
            const lightColor = colors.zenBgColorLight || THEME_BG_DEFAULTS.light;
            const darkSwatch = document.getElementById("darkColorSwatch");
            const lightSwatch = document.getElementById("lightColorSwatch");
            if (wallpaperColorDark) wallpaperColorDark.value = darkColor;
            if (wallpaperColorLight) wallpaperColorLight.value = lightColor;
            if (darkSwatch) darkSwatch.style.backgroundColor = darkColor;
            if (lightSwatch) lightSwatch.style.backgroundColor = lightColor;
          }
        );
      });

      browser.storage.local.get(
        [
          "wallpaperImage",
          "wallpaperOpacity",
          "wallpaperBlur",
          "wallpaperGrain",
          "selectedBackgroundTab",
          "backgroundSectionOpen",
        ],
        function (result) {
          const opacity =
            result.wallpaperOpacity !== undefined
              ? result.wallpaperOpacity
              : 50;
          const blur =
            result.wallpaperBlur !== undefined ? result.wallpaperBlur : 0;
          const grain =
            result.wallpaperGrain !== undefined ? result.wallpaperGrain : 0;

          opacitySlider.value = opacity;
          opacityValue.textContent = opacity;
          blurSlider.value = blur;
          blurValue.textContent = blur;
          grainSlider.value = grain;
          grainValue.textContent = grain;

          // Restore background section state (default open)
          const isOpen =
            result.backgroundSectionOpen !== undefined
              ? result.backgroundSectionOpen
              : true;
          backgroundContent.style.display = isOpen ? "block" : "none";
          backgroundToggle.style.transform = isOpen
            ? "rotate(0deg)"
            : "rotate(-90deg)";

          // Restore selected tab or default to appropriate tab
          let selectedTab = result.selectedBackgroundTab || "color";

          // If there's an image, default to image tab if no preference saved
          if (result.wallpaperImage && !result.selectedBackgroundTab) {
            selectedTab = "image";
          }

          switchTab(selectedTab);

          // Update preview and controls visibility
          const isImageTab = selectedTab === "image";
          if (result.wallpaperImage) {
            updatePreview(
              result.wallpaperImage,
              opacity,
              blur,
              grain,
              isImageTab
            );
            toggleEffectsControls(true);
          } else {
            updatePreview(null, 50, 0, 0, isImageTab);
            toggleEffectsControls(false);
            const currentTheme =
              document.documentElement.getAttribute("data-theme") || "dark";
            const resolvedKey =
              currentTheme === "system"
                ? window.matchMedia("(prefers-color-scheme: dark)").matches
                  ? "zenBgColorDark"
                  : "zenBgColorLight"
                : getThemeBgKey(currentTheme);
            browser.storage.local.get(resolvedKey, function (cr) {
              if (cr[resolvedKey]) {
                const pb = document.getElementById("previewBackground");
                const pc = document.getElementById("previewContent");
                if (pb) {
                  pb.style.backgroundImage = "none";
                  pb.style.backgroundColor = cr[resolvedKey];
                  pb.style.opacity = 1;
                  pb.style.filter = "none";
                }
                if (pc) pc.style.display = "none";
              }
            });
          }
        }
      );
    });
  }

  // Drag and drop functionality
  if (dragDropArea) {
    // Prevent default drag behaviors
    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      dragDropArea.addEventListener(eventName, preventDefaults, false);
      document.body.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
      e.preventDefault();
      e.stopPropagation();
    }

    // Highlight drop area when item is dragged over
    ["dragenter", "dragover"].forEach((eventName) => {
      dragDropArea.addEventListener(eventName, () => {
        dragDropArea.classList.add("drag-over");
      });
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dragDropArea.addEventListener(eventName, () => {
        dragDropArea.classList.remove("drag-over");
      });
    });

    // Handle dropped files
    dragDropArea.addEventListener("drop", (e) => {
      const dt = e.dataTransfer;
      const files = dt.files;

      if (files.length > 0) {
        const file = files[0];
        if (
          file.type === "image/png" ||
          file.type === "image/jpeg" ||
          file.type === "image/jpg"
        ) {
          const reader = new FileReader();
          reader.onload = function (event) {
            handleImageData(event.target.result);
          };
          reader.readAsDataURL(file);
        }
      }
    });

    // Click to upload
    dragDropArea.addEventListener("click", () => {
      wallpaperUpload.click();
    });
  }

  // Trigger file input when button is clicked
  if (wallpaperUploadBtn) {
    wallpaperUploadBtn.addEventListener("click", function () {
      wallpaperUpload.click();
    });
  }

  // Handle file selection
  if (wallpaperUpload) {
    wallpaperUpload.addEventListener("change", function (e) {
      const file = e.target.files[0];
      if (
        file &&
        (file.type === "image/png" ||
          file.type === "image/jpeg" ||
          file.type === "image/jpg")
      ) {
        const reader = new FileReader();
        reader.onload = function (event) {
          handleImageData(event.target.result);
        };
        reader.readAsDataURL(file);
      }
    });
  }

  // Handle Bing Image of the Day
  if (bingImageBtn) {
    bingImageBtn.addEventListener("click", async function () {
      // Show loading state
      bingImageBtn.textContent = "Loading...";
      bingImageBtn.disabled = true;

      const imageData = await fetchBingImageOfTheDay();
      if (imageData) {
        const opacity = parseInt(opacitySlider.value);
        const blur = parseInt(blurSlider.value);
        const grain = parseInt(grainSlider.value);

        saveWallpaperSettings(imageData, opacity, blur, grain, true); // Mark as Bing image
        applyWallpaper(imageData, opacity, blur, grain);
        updatePreview(imageData, opacity, blur, grain, true);
        toggleEffectsControls(true);

        // Switch to image tab when Bing image is added
        switchTab("image");
      } else {
        alert("Failed to load Bing Image of the Day. Please try again.");
      }

      // Reset button state
      bingImageBtn.textContent = "Bing Image";
      bingImageBtn.disabled = false;
    });
  }

  // Handle color picker
  if (applyColorBtn) {
    applyColorBtn.addEventListener("click", function () {
      const darkColor = wallpaperColorDark ? wallpaperColorDark.value : THEME_BG_DEFAULTS.dark;
      const lightColor = wallpaperColorLight ? wallpaperColorLight.value : THEME_BG_DEFAULTS.light;

      browser.storage.local.set({
        zenBgColorDark: darkColor,
        zenBgColorLight: lightColor,
      });
      localStorage.setItem("zenBgColorCache_dark", darkColor);
      localStorage.setItem("zenBgColorCache_light", lightColor);

      const theme =
        document.documentElement.getAttribute("data-theme") || "dark";
      let colorToApply = darkColor;
      if (theme === "light") {
        colorToApply = lightColor;
      } else if (theme === "system") {
        colorToApply = window.matchMedia("(prefers-color-scheme: dark)").matches
          ? darkColor
          : lightColor;
      }
      applyThemeBgColor(colorToApply);

      const pb = document.getElementById("previewBackground");
      const pc = document.getElementById("previewContent");
      if (pb) {
        pb.style.backgroundImage = "none";
        pb.style.backgroundColor = colorToApply;
        pb.style.opacity = 1;
        pb.style.filter = "none";
      }
      if (pc) pc.style.display = "none";
    });
  }

  // Handle remove wallpaper
  if (removeWallpaperBtn) {
    removeWallpaperBtn.addEventListener("click", function () {
      browser.storage.local.remove([
        "wallpaperImage",
        "wallpaperOpacity",
        "wallpaperBlur",
        "wallpaperGrain",
        "isBingImage",
        "bingImageDate",
      ]);
      applyWallpaper(null, 50, 0, 0);
      const currentTab = imageTab.classList.contains("active")
        ? "image"
        : "color";
      updatePreview(null, 50, 0, 0, currentTab === "image");
      toggleEffectsControls(false);
      wallpaperUpload.value = "";

      // Reset sliders
      opacitySlider.value = 50;
      opacityValue.textContent = 50;
      blurSlider.value = 0;
      blurValue.textContent = 0;
      grainSlider.value = 0;
      grainValue.textContent = 0;
    });
  }

  // Handle reset all button
  if (resetAllBtn) {
    resetAllBtn.addEventListener("click", function () {
      if (
        confirm(
          "Reset all wallpaper settings to default? This will remove your current wallpaper and reset all effects."
        )
      ) {
        browser.storage.local.remove([
          "wallpaperImage",
          "wallpaperOpacity",
          "wallpaperBlur",
          "wallpaperGrain",
          "isBingImage",
          "bingImageDate",
          "zenBgColorDark",
          "zenBgColorLight",
        ]);
        localStorage.removeItem("zenBgColorCache_dark");
        localStorage.removeItem("zenBgColorCache_light");
        applyThemeBgColor(null);
        applyWallpaper(null, 50, 0, 0);
        const currentTab = imageTab.classList.contains("active")
          ? "image"
          : "color";
        updatePreview(null, 50, 0, 0, currentTab === "image");
        toggleEffectsControls(false);
        wallpaperUpload.value = "";
        if (wallpaperColorDark) wallpaperColorDark.value = THEME_BG_DEFAULTS.dark;
        if (wallpaperColorLight) wallpaperColorLight.value = THEME_BG_DEFAULTS.light;
        const dSwatch = document.getElementById("darkColorSwatch");
        const lSwatch = document.getElementById("lightColorSwatch");
        if (dSwatch) dSwatch.style.backgroundColor = THEME_BG_DEFAULTS.dark;
        if (lSwatch) lSwatch.style.backgroundColor = THEME_BG_DEFAULTS.light;

        // Reset sliders
        opacitySlider.value = 50;
        opacityValue.textContent = 50;
        blurSlider.value = 0;
        blurValue.textContent = 0;
        grainSlider.value = 0;
        grainValue.textContent = 0;
      }
    });
  }

  // Handle opacity slider with live preview
  if (opacitySlider) {
    opacitySlider.addEventListener("input", function () {
      const opacity = parseInt(this.value);
      opacityValue.textContent = opacity;

      browser.storage.local.get(
        ["wallpaperImage", "wallpaperBlur", "wallpaperGrain"],
        function (result) {
          if (result.wallpaperImage) {
            const blur =
              result.wallpaperBlur !== undefined ? result.wallpaperBlur : 0;
            const grain =
              result.wallpaperGrain !== undefined ? result.wallpaperGrain : 0;
            saveWallpaperSettings(result.wallpaperImage, opacity, blur, grain);
            applyWallpaper(result.wallpaperImage, opacity, blur, grain);
            const currentTab = imageTab.classList.contains("active")
              ? "image"
              : "color";
            updatePreview(
              result.wallpaperImage,
              opacity,
              blur,
              grain,
              currentTab === "image"
            );
          }
        }
      );
    });
  }

  // Handle blur slider with live preview
  if (blurSlider) {
    blurSlider.addEventListener("input", function () {
      const blur = parseInt(this.value);
      blurValue.textContent = blur;

      browser.storage.local.get(
        ["wallpaperImage", "wallpaperOpacity", "wallpaperGrain"],
        function (result) {
          if (result.wallpaperImage) {
            const opacity =
              result.wallpaperOpacity !== undefined
                ? result.wallpaperOpacity
                : 50;
            const grain =
              result.wallpaperGrain !== undefined ? result.wallpaperGrain : 0;
            saveWallpaperSettings(result.wallpaperImage, opacity, blur, grain);
            applyWallpaper(result.wallpaperImage, opacity, blur, grain);
            const currentTab = imageTab.classList.contains("active")
              ? "image"
              : "color";
            updatePreview(
              result.wallpaperImage,
              opacity,
              blur,
              grain,
              currentTab === "image"
            );
          }
        }
      );
    });
  }

  // Handle grain slider with live preview
  if (grainSlider) {
    grainSlider.addEventListener("input", function () {
      const grain = parseInt(this.value);
      grainValue.textContent = grain;

      browser.storage.local.get(
        ["wallpaperImage", "wallpaperOpacity", "wallpaperBlur"],
        function (result) {
          if (result.wallpaperImage) {
            const opacity =
              result.wallpaperOpacity !== undefined
                ? result.wallpaperOpacity
                : 50;
            const blur =
              result.wallpaperBlur !== undefined ? result.wallpaperBlur : 0;
            saveWallpaperSettings(result.wallpaperImage, opacity, blur, grain);
            applyWallpaper(result.wallpaperImage, opacity, blur, grain);
            const currentTab = imageTab.classList.contains("active")
              ? "image"
              : "color";
            updatePreview(
              result.wallpaperImage,
              opacity,
              blur,
              grain,
              currentTab === "image"
            );
          }
        }
      );
    });
  }
});
