console.log("🟡 content.js loaded");

const script = document.createElement("script");
script.src = chrome.runtime.getURL("page-hook.js");
script.onload = () => console.log("🟢 page-hook.js injected");
(document.head || document.documentElement).appendChild(script);
script.remove();

window.addEventListener("message", (event) => {
  if (event.source !== window) return;
  if (event.data?.type === "ZEPTO_PRODUCTS") {
    chrome.runtime.sendMessage(event.data);
  }
});
