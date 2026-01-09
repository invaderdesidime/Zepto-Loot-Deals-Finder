let activeContext = null;
let ownerTabId = null;

function getProductKey(p) {
  return `${p.variantId}_${p.price}_${p.mrp}`;
}

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.type !== "ZEPTO_PRODUCTS") return;

  const tabId = sender.tab?.id;
  const tabUrl = sender.tab?.url || "";

  if (!tabId || !tabUrl.includes("zepto.com")) return;

  let contextKey = msg.meta?.contextKey;

  if (!contextKey && activeContext) {
    contextKey = activeContext;
  }

  if (!contextKey) return;

  chrome.storage.local.get("zeptoProducts", (res) => {
    let existing = res.zeptoProducts || [];

    if (ownerTabId !== tabId || activeContext !== contextKey) {
      existing = [];
      ownerTabId = tabId;
      activeContext = contextKey;
    }

    const map = new Map();

    existing.forEach((p) => {
      if (!p.variantId) return;
      map.set(getProductKey(p), p);
    });

    (msg.payload || []).forEach((p) => {
      if (!p.variantId) return;
      map.set(getProductKey(p), p);
    });

    chrome.storage.local.set({
      zeptoProducts: Array.from(map.values()),
      zeptoOwnerTabId: ownerTabId,
      zeptoContext: activeContext,
    });
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (tabId === ownerTabId) {
    clearAll();
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (tabId !== ownerTabId) return;
  if (!tab.url || !tab.url.includes("zepto.com")) {
    clearAll();
  }
});

function clearAll() {
  ownerTabId = null;
  activeContext = null;
  chrome.storage.local.set({
    zeptoProducts: [],
    zeptoOwnerTabId: null,
    zeptoContext: null,
  });
}
