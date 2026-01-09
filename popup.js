let products = [];
const INR = "\u20B9";

const tbody = document.getElementById("table-body");
const sortSelect = document.getElementById("sort");

chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
  if (!tab || !tab.url || !tab.url.includes("zepto.com")) {
    showEmptyState();
    return;
  }

  chrome.storage.local.get(
    ["zeptoProducts", "zeptoOwnerTabId"],
    ({ zeptoProducts = [], zeptoOwnerTabId }) => {
      if (tab.id !== zeptoOwnerTabId || !zeptoProducts.length) {
        showEmptyState();
        return;
      }

      products = zeptoProducts;

      products.sort((a, b) => b.discountPercent - a.discountPercent);
      sortSelect.value = "discount-desc";

      render(products);
    }
  );
});

sortSelect.addEventListener("change", () => {
  let sorted = [...products];

  switch (sortSelect.value) {
    case "price-asc":
      sorted.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      sorted.sort((a, b) => b.price - a.price);
      break;
    case "discount-desc":
      sorted.sort((a, b) => b.discountPercent - a.discountPercent);
      break;
  }

  render(sorted);
});

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function render(list) {
  tbody.innerHTML = "";

  list.forEach((p) => {
    const slug = slugify(p.name);
    const url = `https://www.zepto.com/pn/${slug}/pvid/${p.variantId}`;

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="name">
        <a href="${url}" target="_blank" rel="noopener">
          ${p.name}
        </a>
      </td>
      <td class="pack">${p.pack}</td>
      <td class="muted">${INR}${p.mrp}</td>
      <td class="price">${INR}${p.price}</td>
      <td class="discount">${p.discountPercent}%</td>
      <td class="qty">${p.availableQuantity ?? "-"}</td>
    `;

    tbody.appendChild(tr);
  });
}

function showEmptyState() {
  tbody.innerHTML = `
    <tr>
      <td colspan="6" style="padding:16px;text-align:center;color:#777">
        Open Zepto and search for a product<br/>
        or open a brand page
      </td>
    </tr>
  `;
}
