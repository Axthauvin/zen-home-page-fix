// Shortcuts management
let isEditMode = false;
let shortcuts = [];

// Load shortcuts from storage
function loadShortcuts() {
  const stored = localStorage.getItem("zenShortcuts");
  if (stored) {
    shortcuts = JSON.parse(stored);
  } else {
    shortcuts = [
      { name: "GitHub", url: "https://github.com" },
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
    item.target = "_blank";
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
  const editBtn = document.getElementById("editBtn");
  const grid = document.getElementById("shortcutsGrid");

  if (isEditMode) {
    editBtn.classList.add("active");
    grid.classList.add("edit-mode");
  } else {
    editBtn.classList.remove("active");
    grid.classList.remove("edit-mode");
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

  // Edit button
  document.getElementById("editBtn").addEventListener("click", toggleEditMode);

  // Modal buttons
  document.getElementById("cancelBtn").addEventListener("click", closeAddModal);
  document.getElementById("saveBtn").addEventListener("click", addShortcut);

  // Close modal on background click
  document
    .getElementById("addShortcutModal")
    .addEventListener("click", function (e) {
      if (e.target === this) {
        closeAddModal();
      }
    });

  // Enter key to save in modal
  document.getElementById("shortcutUrl").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      addShortcut();
    }
  });
});
