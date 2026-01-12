// Search engine management
const searchEngines = {
  google: {
    name: "Google",
    url: "https://www.google.com/search?q=%s",
    favicon: "https://www.google.com/favicon.ico",
  },
  duckduckgo: {
    name: "DuckDuckGo",
    url: "https://duckduckgo.com/?q=%s",
    favicon: "https://duckduckgo.com/favicon.ico",
  },
  bing: {
    name: "Bing",
    url: "https://www.bing.com/search?q=%s",
    favicon: "https://www.bing.com/favicon.ico",
  },
  yahoo: {
    name: "Yahoo",
    url: "https://search.yahoo.com/search?p=%s",
    favicon: "https://www.yahoo.com/favicon.ico",
  },
  brave: {
    name: "Brave",
    url: "https://search.brave.com/search?q=%s",
    favicon: "https://brave.com/static-assets/images/brave-favicon.png",
  },
  ecosia: {
    name: "Ecosia",
    url: "https://www.ecosia.org/search?q=%s",
    favicon: "https://www.ecosia.org/favicon.ico",
  },
};

let currentEngine = "google";
let showLogo = true;
let customEngine = null;

// Load search settings
function loadSearchSettings() {
  const savedEngine = localStorage.getItem("zenSearchEngine");
  const savedShowLogo = localStorage.getItem("zenShowLogo");
  const savedCustomEngine = localStorage.getItem("zenCustomEngine");

  if (savedEngine) {
    currentEngine = savedEngine;
  }
  if (savedShowLogo !== null) {
    showLogo = savedShowLogo === "true";
  }
  if (savedCustomEngine) {
    customEngine = JSON.parse(savedCustomEngine);
  }

  updateSearchBox();
  updateSettingsUI();
}

// Save search settings
function saveSearchSettings() {
  localStorage.setItem("zenSearchEngine", currentEngine);
  localStorage.setItem("zenShowLogo", showLogo.toString());
  if (customEngine) {
    localStorage.setItem("zenCustomEngine", JSON.stringify(customEngine));
  }
}

// Get current engine data
function getCurrentEngine() {
  if (currentEngine === "custom" && customEngine) {
    return customEngine;
  }
  return searchEngines[currentEngine] || searchEngines.google;
}

// Update search box with logo
function updateSearchBox() {
  const searchContainer = document.querySelector(".search-container");
  const searchInput = document.getElementById("searchInput");

  // Remove existing logo if any
  const existingLogo = searchContainer.querySelector(".search-logo");
  if (existingLogo) {
    existingLogo.remove();
  }
  searchInput.classList.remove("with-logo");

  // Add logo if enabled
  if (showLogo) {
    const engine = getCurrentEngine();
    const logo = document.createElement("img");
    logo.className = "search-logo";
    logo.src = engine.favicon;
    logo.alt = engine.name;
    logo.onerror = function () {
      this.style.display = "none";
      searchInput.classList.remove("with-logo");
    };
    searchContainer.appendChild(logo);
    searchInput.classList.add("with-logo");
  }

  // Update placeholder
  const engine = getCurrentEngine();
  searchInput.placeholder = `Search with ${engine.name}...`;
}

// Update settings UI
function updateSettingsUI() {
  const showLogoCheckbox = document.getElementById("showLogoCheckbox");
  if (showLogoCheckbox) {
    showLogoCheckbox.checked = showLogo;
  }

  // Update active engine button
  const engineButtons = document.querySelectorAll(".engine-option");
  engineButtons.forEach((btn) => {
    const engineId = btn.getAttribute("data-engine");
    if (engineId === currentEngine) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

// Open search settings modal
function openSearchSettings() {
  document.getElementById("searchSettingsModal").classList.add("active");
  updateSettingsUI();
}

// Close search settings modal
function closeSearchSettings() {
  document.getElementById("searchSettingsModal").classList.remove("active");
}

// Set search engine
function setSearchEngine(engineId) {
  currentEngine = engineId;
  saveSearchSettings();
  updateSearchBox();
  updateSettingsUI();
}

// Set custom search engine
function setCustomSearchEngine() {
  const name = document.getElementById("customEngineName").value.trim();
  const url = document.getElementById("customEngineUrl").value.trim();
  const favicon = document.getElementById("customEngineFavicon").value.trim();

  if (!name || !url) {
    alert("Please enter both name and search URL");
    return;
  }

  if (!url.includes("%s")) {
    alert("Search URL must contain %s as placeholder for the query");
    return;
  }

  customEngine = {
    name,
    url,
    favicon: favicon || "https://www.google.com/s2/favicons?domain=" + url,
  };

  currentEngine = "custom";
  saveSearchSettings();
  updateSearchBox();
  updateSettingsUI();

  // Clear inputs
  document.getElementById("customEngineName").value = "";
  document.getElementById("customEngineUrl").value = "";
  document.getElementById("customEngineFavicon").value = "";

  alert(`Custom search engine "${name}" has been set!`);
}

// Toggle logo display
function toggleLogoDisplay() {
  showLogo = document.getElementById("showLogoCheckbox").checked;
  saveSearchSettings();
  updateSearchBox();
}

// Perform search
const searchInput = document.getElementById("searchInput");

searchInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter") {
    const query = e.target.value.trim();
    if (query) {
      // Check if it's a URL
      if (
        query.includes(".") &&
        !query.includes(" ") &&
        (query.startsWith("http") ||
          query.match(/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/))
      ) {
        // Navigate to URL
        const url = query.startsWith("http") ? query : `https://${query}`;
        window.location.href = url;
      } else {
        // Search with current engine
        const engine = getCurrentEngine();
        const searchUrl = engine.url.replace("%s", encodeURIComponent(query));
        window.location.href = searchUrl;
      }
    }
  }
});

// Initialize search settings
document.addEventListener("DOMContentLoaded", () => {
  loadSearchSettings();

  // Settings button
  const settingsBtn = document.getElementById("settingsBtn");
  if (settingsBtn) {
    settingsBtn.addEventListener("click", openSearchSettings);
  }

  // Close settings button
  const closeSettingsBtn = document.getElementById("closeSettingsBtn");
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener("click", closeSearchSettings);
  }

  // Close modal on background click
  const searchSettingsModal = document.getElementById("searchSettingsModal");
  if (searchSettingsModal) {
    searchSettingsModal.addEventListener("click", function (e) {
      if (e.target === this) {
        closeSearchSettings();
      }
    });
  }

  // Logo checkbox
  const showLogoCheckbox = document.getElementById("showLogoCheckbox");
  if (showLogoCheckbox) {
    showLogoCheckbox.addEventListener("change", toggleLogoDisplay);
  }

  // Engine selection buttons
  const engineButtons = document.querySelectorAll(".engine-option");
  engineButtons.forEach((btn) => {
    btn.addEventListener("click", function () {
      const engineId = this.getAttribute("data-engine");
      setSearchEngine(engineId);
    });
  });

  // Custom engine button
  const setCustomEngineBtn = document.getElementById("setCustomEngineBtn");
  if (setCustomEngineBtn) {
    setCustomEngineBtn.addEventListener("click", setCustomSearchEngine);
  }
});
