// Shortcuts management
let isEditMode = false;
let shortcuts = [];
let editingIndex = -1;

// Load shortcuts from storage
function loadShortcuts() {
  const stored = localStorage.getItem("zenShortcuts");
  if (stored) {
    shortcuts = JSON.parse(stored);
  } else {
    shortcuts = [
      { name: "Reddit", url: "https://reddit.com" },
      { name: "YouTube", url: "https://youtube.com" },
      { name: "Gmail", url: "https://gmail.com" },
    ];
    saveShortcuts();
  }
  renderShortcuts();
}

// Save shortcuts to storage
function saveShortcuts() {
  localStorage.setItem("zenShortcuts", JSON.stringify(shortcuts));
}

// Get favicon URL
async function getFaviconUrl(url) {
  try {
    const domain = new URL(url).hostname;
    const firstFavicon = `https://favicon.vemetric.com/${domain}`;

    // const response = await fetch(firstFavicon).then((res) => res.text());

    // // Means its an the default favicon, try another service
    // if (
    //   response &&
    //   response.includes(
    //     "M19 19a2.003 2.003 0 0 0 .914 -3.782a1.98 1.98 0 0 0 -2.414 .483"
    //   )
    // ) {
    //   const secondFavicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    //   // Check if second favicon is valid
    //   const secondResponse = await fetch(secondFavicon).then((res) =>
    //     res.blob()
    //   );
    //   return secondFavicon;
    // }

    return firstFavicon;
  } catch {
    return "";
  }
}

// Render shortcuts
async function renderShortcuts() {
  const grid = document.getElementById("shortcutsGrid");
  grid.innerHTML = "";

  // Fetch all favicons first to maintain order
  const faviconPromises = shortcuts.map((shortcut) =>
    getFaviconUrl(shortcut.url)
  );
  const faviconUrls = await Promise.all(faviconPromises);

  shortcuts.forEach((shortcut, index) => {
    const item = document.createElement("a");
    item.className = "shortcut-item";
    item.href = shortcut.url;
    item.rel = "noopener noreferrer";

    const icon = document.createElement("div");
    icon.className = "shortcut-icon";

    const img = document.createElement("img");
    img.src = faviconUrls[index];
    img.alt = shortcut.name;
    img.onerror = function () {
      this.style.display = "none";
      icon.innerHTML = shortcut.name.charAt(0).toUpperCase();
      icon.style.fontSize = "1.5rem";
      icon.style.fontWeight = "400";
    };

    icon.appendChild(img);

    const name = document.createElement("div");
    name.className = "shortcut-name";
    name.textContent = shortcut.name;

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-shortcut";
    removeBtn.innerHTML = "×";
    removeBtn.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      removeShortcut(index);
    };

    // In edit mode, clicking the shortcut opens edit modal
    if (isEditMode) {
      item.onclick = function (e) {
        e.preventDefault();
        openEditModal(index);
      };
      item.style.cursor = "pointer";
    }

    item.appendChild(removeBtn);
    item.appendChild(icon);
    item.appendChild(name);
    grid.appendChild(item);
  });

  // Add "Add shortcut" button in edit mode
  if (isEditMode) {
    const addItem = document.createElement("div");
    addItem.className = "shortcut-item shortcut-add";
    addItem.onclick = openAddModal;

    const icon = document.createElement("div");
    icon.className = "shortcut-icon";
    icon.innerHTML = "+";

    const name = document.createElement("div");
    name.className = "shortcut-name";
    name.textContent = "Add";

    addItem.appendChild(icon);
    addItem.appendChild(name);
    grid.appendChild(addItem);
  }

  // Show/hide grid
  if (shortcuts.length > 0 || isEditMode) {
    grid.classList.add("active");
  } else {
    grid.classList.remove("active");
  }
}

// Remove shortcut
function removeShortcut(index) {
  shortcuts.splice(index, 1);
  saveShortcuts();
  renderShortcuts();
}

// Toggle edit mode
function toggleEditMode() {
  isEditMode = !isEditMode;
  const grid = document.getElementById("shortcutsGrid");
  const banner = document.getElementById("editModeBanner");

  if (isEditMode) {
    grid.classList.add("edit-mode");
    if (banner) {
      banner.classList.add("active");
    }
  } else {
    grid.classList.remove("edit-mode");
    if (banner) {
      banner.classList.remove("active");
    }
  }

  renderShortcuts();
}

// Open add shortcut modal
function openAddModal() {
  document.getElementById("addShortcutModal").classList.add("active");
  document.getElementById("shortcutName").value = "";
  document.getElementById("shortcutUrl").value = "";
  document.getElementById("shortcutName").focus();
}

// Close add shortcut modal
function closeAddModal() {
  document.getElementById("addShortcutModal").classList.remove("active");
}

// Open edit shortcut modal
function openEditModal(index) {
  editingIndex = index;
  const shortcut = shortcuts[index];
  document.getElementById("editShortcutName").value = shortcut.name;
  document.getElementById("editShortcutUrl").value = shortcut.url;
  document.getElementById("editShortcutModal").classList.add("active");
  document.getElementById("editShortcutName").focus();
}

// Close edit shortcut modal
function closeEditModal() {
  document.getElementById("editShortcutModal").classList.remove("active");
  editingIndex = -1;
}

// Save edited shortcut
function saveEditedShortcut() {
  const name = document.getElementById("editShortcutName").value.trim();
  const url = document.getElementById("editShortcutUrl").value.trim();

  if (!name || !url) {
    alert("Please enter both name and URL");
    return;
  }

  // Add https:// if not present
  let finalUrl = url;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    finalUrl = "https://" + url;
  }

  shortcuts[editingIndex] = { name, url: finalUrl };
  saveShortcuts();
  renderShortcuts();
  closeEditModal();
}

// Add shortcut
function addShortcut() {
  const name = document.getElementById("shortcutName").value.trim();
  const url = document.getElementById("shortcutUrl").value.trim();

  if (!name || !url) {
    alert("Please enter both name and URL");
    return;
  }

  // Add https:// if not present
  let finalUrl = url;
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    finalUrl = "https://" + url;
  }

  shortcuts.push({ name, url: finalUrl });
  saveShortcuts();
  renderShortcuts();
  closeAddModal();
}

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  loadShortcuts();

  // Edit Shortcuts button (inside settings modal)
  const editShortcutsBtn = document.getElementById("editShortcutsBtn");
  if (editShortcutsBtn) {
    editShortcutsBtn.addEventListener("click", () => {
      toggleEditMode();
      // Close settings modal when entering edit mode
      document.getElementById("searchSettingsModal").classList.remove("active");
    });
  }

  // Done editing button
  const doneEditingBtn = document.getElementById("doneEditingBtn");
  if (doneEditingBtn) {
    doneEditingBtn.addEventListener("click", toggleEditMode);
  }

  // Add shortcut modal buttons
  document.getElementById("cancelBtn").addEventListener("click", closeAddModal);
  document.getElementById("saveBtn").addEventListener("click", addShortcut);

  // Edit shortcut modal buttons
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const saveEditBtn = document.getElementById("saveEditBtn");
  if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", closeEditModal);
  }
  if (saveEditBtn) {
    saveEditBtn.addEventListener("click", saveEditedShortcut);
  }

  // Close modal on background click
  document
    .getElementById("addShortcutModal")
    .addEventListener("click", function (e) {
      if (e.target === this) {
        closeAddModal();
      }
    });

  // Close edit modal on background click
  const editModal = document.getElementById("editShortcutModal");
  if (editModal) {
    editModal.addEventListener("click", function (e) {
      if (e.target === this) {
        closeEditModal();
      }
    });
  }

  // Enter key to save in add modal
  document.getElementById("shortcutUrl").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addShortcut();
    }
  });

  // Enter key to save in edit modal
  const editShortcutUrl = document.getElementById("editShortcutUrl");
  if (editShortcutUrl) {
    editShortcutUrl.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        saveEditedShortcut();
      }
    });
  }
});
