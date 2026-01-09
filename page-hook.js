console.log("🔥 page-hook.js injected");

(function extractBrandPageFromDOM() {
  if (!location.pathname.startsWith("/brand/")) return;

  let executed = false;

  function tryExtract() {
    if (executed) return;

    const cards = document.querySelectorAll('a[href*="/pn/"][href*="/pvid/"]');
    if (!cards || !cards.length) return;

    executed = true;
    console.log("🟢 Extracting BRAND page-1 products from DOM");

    const products = [];

    cards.forEach((a) => {
      try {
        let name = null;

        const slug = a.href.match(/\/pn\/([^/]+)/)?.[1];
        if (slug) {
          name = slug
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
        }

        if (!name) {
          const lines = a.innerText
            .split("\n")
            .map((l) => l.trim())
            .filter(
              (l) => l && l !== "ADD" && !l.startsWith("₹") && !l.match(/OFF/i)
            );
          name = lines.find((l) => l.length > 10) || null;
        }

        const pack = a.innerText.match(/\(([^)]+)\)/)?.[1] || "-";

        const prices = a.innerText.match(/₹\d+/g) || [];
        const price = prices.length
          ? parseInt(prices[0].replace("₹", ""))
          : null;
        const mrp =
          prices.length > 1 ? parseInt(prices[1].replace("₹", "")) : price;

        const rating = a.innerText.match(/(\d\.\d)/)?.[1] || "-";

        const variantId = a.href.split("/pvid/")[1];

        if (!name || !variantId || !price) return;

        products.push({
          name,
          pack,
          mrp,
          price,
          discountPercent:
            mrp && price ? Math.round(((mrp - price) / mrp) * 100) : 0,
          rating,
          variantId,
        });
      } catch (_) {}
    });

    if (products.length) {
      const brand = decodeURIComponent(location.pathname.split("/")[2]);

      window.postMessage(
        {
          type: "ZEPTO_PRODUCTS",
          payload: products,
          meta: {
            contextKey: `BRAND:${brand}`,
            pageNumber: 1,
            source: "DOM",
          },
        },
        "*"
      );
    }
  }

  function startObserver() {
    if (!document.body) return;

    const observer = new MutationObserver(() => {
      tryExtract();
      if (executed) observer.disconnect();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    setTimeout(tryExtract, 1200);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver);
  } else {
    startObserver();
  }
})();

(function () {
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);
    handleResponse(args[0], response.clone());
    return response;
  };
})();

(function () {
  const open = XMLHttpRequest.prototype.open;
  const send = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    this._zeptoUrl = url;
    return open.call(this, method, url, ...rest);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener("load", function () {
      if (this._zeptoUrl?.includes("/api/v3/search")) {
        try {
          processZeptoData(JSON.parse(this.responseText));
        } catch (e) {
          console.error("XHR parse error", e);
        }
      }
    });
    return send.apply(this, args);
  };
})();

function handleResponse(url, response) {
  if (!url?.toString().includes("/api/v3/search")) return;
  response
    .json()
    .then(processZeptoData)
    .catch(() => {});
}

function processZeptoData(data) {
  const products = [];
  console.log("✅ Zepto API products processed");

  (data.layout || []).forEach((widget) => {
    const items = widget?.data?.resolver?.data?.items || [];
    items.forEach((entry) => {
      const p = entry.productResponse;
      if (!p) return;

      products.push({
        name: p.product?.name,
        pack: p.productVariant?.formattedPacksize,
        mrp: p.mrp / 100,
        price: p.sellingPrice / 100,
        discountPercent: p.discountPercent,
        variantId: p.productVariant?.id,

        availableQuantity: p.availableQuantity ?? p.quantity ?? "-",
      });
    });
  });

  let contextType = "SEARCH";
  let contextValue = null;

  if (data?.filters?.brands?.length) {
    contextType = "BRAND";
    contextValue = data.filters.brands[0];
  }

  if (!contextValue) {
    contextValue =
      data?.layout?.[0]?.data?.resolver?.data?.searchQuery ||
      data?.query ||
      null;
  }

  if (products.length) {
    window.postMessage(
      {
        type: "ZEPTO_PRODUCTS",
        payload: products,
        meta: {
          contextKey: contextValue ? `${contextType}:${contextValue}` : null,
          pageNumber: data?.pageNumber ?? null,
          source: "API",
        },
      },
      "*"
    );
  }
}
