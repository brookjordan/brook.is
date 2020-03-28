import { addUpdateModal } from "./update-prompt.js";
import { addInstallPWAModal } from "./install-prompt.js";

export function installServiceworker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener(
      "beforeinstallprompt",
      (beforeInstallPromptEvent) => {
        beforeInstallPromptEvent.preventDefault();
        addInstallPWAModal(beforeInstallPromptEvent);
      },
    );

    navigator.serviceWorker
      .register("/service-worker.js", { scope: "/" })
      .catch((error) => {
        console.warn(`ServiceWorker registration failed: ${error}`);
      });

    navigator.serviceWorker.addEventListener(
      "message",
      ({ data: { type, message } = {} } = {}) => {
        debugger;
        if (typeof type === "undefined") {
          return;
        }
        if (type === "cache expiry") {
          addUpdateModal();
        }
      },
    );
  }
}
