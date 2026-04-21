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
let suggestionDebounceTimer = null;
let suggestionAbortController = null;
let selectedSuggestionIndex = -1;
let activeSuggestions = [];

const RECENT_SEARCHES_STORAGE_KEY = "zenRecentSearches";
const MAX_RECENT_SEARCHES = 8;
const MAX_LIVE_SUGGESTIONS = 7;

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

function getRecentSearches() {
  try {
    const saved = localStorage.getItem(RECENT_SEARCHES_STORAGE_KEY);
    if (!saved) {
      return [];
    }
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function saveRecentSearch(query) {
  const cleanedQuery = query.trim();
  if (!cleanedQuery) {
    return;
  }

  const recent = getRecentSearches().filter(
    (item) => item.toLowerCase() !== cleanedQuery.toLowerCase(),
  );
  recent.unshift(cleanedQuery);
  localStorage.setItem(
    RECENT_SEARCHES_STORAGE_KEY,
    JSON.stringify(recent.slice(0, MAX_RECENT_SEARCHES)),
  );
}

function getSuggestionListElement() {
  return document.getElementById("searchSuggestions");
}

function closeSuggestions() {
  const list = getSuggestionListElement();
  if (!list) {
    return;
  }
  list.classList.remove("active");
  list.innerHTML = "";
  selectedSuggestionIndex = -1;
  activeSuggestions = [];
}

function openSuggestions() {
  const list = getSuggestionListElement();
  if (!list || activeSuggestions.length === 0) {
    return;
  }
  list.classList.add("active");
}

function setSelectedSuggestion(index, updateInput = true) {
  const list = getSuggestionListElement();
  if (!list) {
    return;
  }

  const items = list.querySelectorAll(".suggestion-item");
  items.forEach((item, itemIndex) => {
    const isActive = itemIndex === index;
    item.classList.toggle("active", isActive);
    item.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  selectedSuggestionIndex = index;
  if (updateInput && index >= 0 && activeSuggestions[index]) {
    const searchInputElement = document.getElementById("searchInput");
    if (searchInputElement) {
      searchInputElement.value = activeSuggestions[index];
    }
  }
}

function renderSuggestions(suggestions, userQuery) {
  const list = getSuggestionListElement();
  if (!list) {
    return;
  }

  list.innerHTML = "";
  activeSuggestions = suggestions;
  selectedSuggestionIndex = -1;

  if (suggestions.length === 0) {
    closeSuggestions();
    return;
  }

  suggestions.forEach((suggestionText, index) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "suggestion-item";
    item.setAttribute("role", "option");
    item.setAttribute("aria-selected", "false");
    item.textContent = suggestionText;

    item.addEventListener("mouseenter", () => {
      setSelectedSuggestion(index, false);
    });

    item.addEventListener("mousedown", (event) => {
      event.preventDefault();
      performSearch(suggestionText);
    });

    list.appendChild(item);
  });

  if (userQuery && suggestions[0].toLowerCase() === userQuery.toLowerCase()) {
    setSelectedSuggestion(0, false);
  }

  openSuggestions();
}

async function fetchQuerySuggestions(query) {
  if (suggestionAbortController) {
    suggestionAbortController.abort();
  }

  suggestionAbortController = new AbortController();

  try {
    const response = await fetch(
      `https://suggestqueries.google.com/complete/search?client=chrome&q=${encodeURIComponent(query)}`,
      {
        signal: suggestionAbortController.signal,
      },
    );

    if (!response.ok) {
      throw new Error(`Suggestion API error: ${response.status}`);
    }

    const data = await response.json();
    if (!Array.isArray(data) || data.length < 2 || !Array.isArray(data[1])) {
      return [];
    }

    const suggestions = data[1];

    const filteredSuggestions = suggestions
      .map((item) => (item && typeof item === "string" ? item : ""))
      .filter(Boolean)
      .filter((value, index, array) => array.indexOf(value) === index)
      .slice(0, MAX_LIVE_SUGGESTIONS);

    return filteredSuggestions;
  } catch (error) {
    if (error.name === "AbortError") {
      return null;
    }
    return [];
  }
}

async function handleSuggestionInput(query) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    closeSuggestions();
    return;
  }

  const liveSuggestions = await fetchQuerySuggestions(trimmedQuery);
  if (liveSuggestions === null) {
    return;
  }

  const recentMatches = getRecentSearches()
    .filter((item) => item.toLowerCase().includes(trimmedQuery.toLowerCase()))
    .slice(0, MAX_RECENT_SEARCHES);

  const mergedSuggestions = [...liveSuggestions, ...recentMatches]
    .filter((value, index, array) => array.indexOf(value) === index)
    .slice(0, MAX_LIVE_SUGGESTIONS + 2);

  renderSuggestions(mergedSuggestions, trimmedQuery);
}

function isLikelyUrl(query) {
  return (
    query.includes(".") &&
    !query.includes(" ") &&
    (query.startsWith("http") || query.match(/^[a-zA-Z0-9-]+\.[a-zA-Z]{2,}/))
  );
}

function performSearch(rawQuery) {
  const query = rawQuery.trim();
  if (!query) {
    return;
  }

  saveRecentSearch(query);

  if (isLikelyUrl(query)) {
    const url = query.startsWith("http") ? query : `https://${query}`;
    window.location.href = url;
    return;
  }

  const engine = getCurrentEngine();
  const searchUrl = engine.url.replace("%s", encodeURIComponent(query));
  window.location.href = searchUrl;
}

function ensureSuggestionContainer() {
  const searchContainer = document.querySelector(".search-container");
  if (!searchContainer) {
    return;
  }

  if (getSuggestionListElement()) {
    return;
  }

  const suggestionList = document.createElement("div");
  suggestionList.id = "searchSuggestions";
  suggestionList.className = "search-suggestions";
  suggestionList.setAttribute("role", "listbox");
  searchContainer.appendChild(suggestionList);
}

function setupSearchSuggestions() {
  ensureSuggestionContainer();

  const searchInputElement = document.getElementById("searchInput");
  if (!searchInputElement) {
    return;
  }

  searchInputElement.setAttribute("autocomplete", "off");
  searchInputElement.setAttribute("spellcheck", "false");

  searchInputElement.addEventListener("input", (event) => {
    const query = event.target.value;
    clearTimeout(suggestionDebounceTimer);
    suggestionDebounceTimer = setTimeout(() => {
      handleSuggestionInput(query);
    }, 160);
  });

  searchInputElement.addEventListener("keydown", (event) => {
    if (event.key === "ArrowDown") {
      if (activeSuggestions.length === 0) {
        return;
      }
      event.preventDefault();
      const nextIndex =
        selectedSuggestionIndex < activeSuggestions.length - 1
          ? selectedSuggestionIndex + 1
          : 0;
      setSelectedSuggestion(nextIndex);
      return;
    }

    if (event.key === "ArrowUp") {
      if (activeSuggestions.length === 0) {
        return;
      }
      event.preventDefault();
      const nextIndex =
        selectedSuggestionIndex > 0
          ? selectedSuggestionIndex - 1
          : activeSuggestions.length - 1;
      setSelectedSuggestion(nextIndex);
      return;
    }

    if (event.key === "Escape") {
      closeSuggestions();
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      const selectedSuggestion =
        selectedSuggestionIndex >= 0
          ? activeSuggestions[selectedSuggestionIndex]
          : null;
      performSearch(selectedSuggestion || searchInputElement.value);
      closeSuggestions();
    }
  });

  searchInputElement.addEventListener("focus", () => {
    if (searchInputElement.value.trim()) {
      handleSuggestionInput(searchInputElement.value);
    }
  });

  searchInputElement.addEventListener("blur", () => {
    setTimeout(closeSuggestions, 120);
  });

  document.addEventListener("click", (event) => {
    const searchContainer = document.querySelector(".search-container");
    if (!searchContainer || !searchContainer.contains(event.target)) {
      closeSuggestions();
    }
  });
}

// Initialize search settings
document.addEventListener("DOMContentLoaded", () => {
  loadSearchSettings();
  setupSearchSuggestions();

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
