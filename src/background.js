function fixRedirectUrl(url) {
  /*
    Extensions are not able to open "about:*" pages directly,
    so we will redirect them to the extension's homepage instead.
    */
  if (!url || url.startsWith("about:")) {
    return browser.runtime.getURL("home/index.html");
  } else if (!url.startsWith("http://") && !url.startsWith("https://")) {
    // Ensure the URL starts with http:// or https://
    return `https://${url}`;
  }

  return url;
}

// Function to get the default homepage from storage
function getDefaultHomepage() {
  return new Promise((resolve) => {
    browser.storage.local.get(["defaultHomepage"], function (result) {
      resolve(fixRedirectUrl(result.defaultHomepage));
    });
  });
}

function homePageAlreadyOpen(tabs, homepageUrl) {
  return tabs.some((tab) => tab.url === homepageUrl);
}

function isHomepageUrl(url) {
  const homepageUrl = browser.runtime.getURL("home/index.html");
  return url === homepageUrl;
}

async function createHomepageTab(
  homepageUrl,
  windowId = null,
  createHomePageWhatever = false
) {
  const createProperties = { url: homepageUrl };
  if (windowId !== null) {
    createProperties.windowId = windowId;
  }

  const tabsPromise = await getAllTabs(windowId);

  if (
    !createHomePageWhatever &&
    homePageAlreadyOpen(tabsPromise, homepageUrl)
  ) {
    return;
  }

  console.log("Opening new homepage tab with:", createProperties);

  browser.tabs.create(createProperties);
}

function getAllTabs(windowId = null) {
  // If windowId is provided, get tabs only from that window
  if (windowId !== null) {
    return browser.tabs.query({ windowId: windowId });
  }
  // Otherwise get tabs from the current window only
  return browser.tabs.query({ currentWindow: true });
}

// Check and redirect a tab if necessary
async function checkNoActiveTab(tabToExclude = null) {
  const windowId = tabToExclude?.windowId || null;
  const allTabs = await getAllTabs(windowId);
  const homepageUrl = browser.runtime.getURL("home/index.html");

  const allRealTabs = allTabs.filter(
    (tab) => tab.pinned === false && tab.id !== tabToExclude?.id
    // && tab.url !== homepageUrl
  );
  console.log("Number of real tabs in window:", allRealTabs.length);
  console.log("Real tabs:", allRealTabs);
  return allRealTabs.length === 0;
}

// Track tab URLs to know which one was closed
const tabUrlCache = new Map();

browser.tabs.onCreated.addListener((tab) => {
  if (tab.url) {
    tabUrlCache.set(tab.id, tab.url);
  }
});

// Listen for tab updates
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Update URL cache
  if (changeInfo.url) {
    tabUrlCache.set(tabId, changeInfo.url);
  }

  // Only check for no active tabs if a non-homepage tab completed loading
  if (
    changeInfo.status === "complete" &&
    tab.active &&
    !isHomepageUrl(tab.url)
  ) {
    checkNoActiveTab().then((noActiveTab) => {
      if (noActiveTab) {
        getDefaultHomepage().then((defaultHomepage) => {
          createHomepageTab(defaultHomepage, tab.windowId);
        });
      }
    });
  }
});

// Listen for tab deletions
browser.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  console.log("Tab removed:", tabId, removeInfo);

  // Clean up cache
  tabUrlCache.delete(tabId);

  const noActiveTab = await checkNoActiveTab({
    id: tabId,
    windowId: removeInfo.windowId,
  });

  if (noActiveTab) {
    const defaultHomepage = await getDefaultHomepage();
    createHomepageTab(defaultHomepage, removeInfo.windowId, true);
  }
});

// Listen for storage changes
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && changes.defaultHomepage) {
    console.log("Homepage changed to:", changes.defaultHomepage.newValue);
  }
});

console.log("Zen Homepage Fixer extension loaded");
