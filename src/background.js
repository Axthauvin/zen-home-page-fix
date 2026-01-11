function fixRedirectUrl(url) {
  /*
    Extensions are not able to open "about:*" pages directly,
    so we will redirect them to the extension's homepage instead.
    */
  if (!url || url.startsWith("about:")) {
    return browser.runtime.getURL("home/index.html");
  }
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
    (tab) =>
      tab.pinned === false &&
      tab.id !== tabToExclude?.id &&
      tab.url !== homepageUrl
  );
  console.log("Number of real tabs in window:", allRealTabs.length);
  console.log("Real tabs:", allRealTabs);
  return allRealTabs.length === 0;
}

// Listen for tab updates
browser.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.active) {
    const noActiveTab = await checkNoActiveTab();
    if (noActiveTab) {
      const defaultHomepage = await getDefaultHomepage();
      createHomepageTab(defaultHomepage, tab.windowId);
    }
  }
});

// Listen for tab deletions
browser.tabs.onRemoved.addListener(async (tabId, removeInfo) => {
  console.log("Tab removed:", tabId, removeInfo);
  const noActiveTab = await checkNoActiveTab({
    id: tabId,
    windowId: removeInfo.windowId,
  });
  if (noActiveTab) {
    const defaultHomepage = await getDefaultHomepage();
    createHomepageTab(defaultHomepage, removeInfo.windowId, true);
  }
});

// Check and redirect a tab if its URL is empty or invalid
browser.tabs.query({ active: true, currentWindow: true }).then(async (tabs) => {
  if (tabs.length > 0) {
    const noActiveTab = await checkNoActiveTab(tabs[0]);
    if (noActiveTab) {
      const defaultHomepage = await getDefaultHomepage();
      createHomepageTab(defaultHomepage, tabs[0].windowId);
    }
  }
});

// Listen for storage changes
browser.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && changes.defaultHomepage) {
    console.log("Homepage changed to:", changes.defaultHomepage.newValue);
  }
});

console.log("Zen Homepage Fixer extension loaded");
