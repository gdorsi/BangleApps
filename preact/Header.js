import { useInstalledApps } from "./useInstalledApps.js";
import { useIsConnected } from "./useIsConnected.js";
import { html } from "./index.js";

export function Header() {
  const installedApps = useInstalledApps();
  const isConnected = useIsConnected();

  return html`<header class="navbar-primary navbar">
    <section class="navbar-section">
      <a href="https://banglejs.com" target="_blank" class="navbar-brand mr-2"
        ><img src="img/banglejs-logo-sml.png" alt="Bangle.js" /> App Loader</a
      >
    </section>
    <section class="navbar-section">
      <button
        class="btn"
        onClick=${isConnected
      ? installedApps.disconnect
      : installedApps.loadFromTheDevice}
      >
        ${isConnected ? "Disconnect" : "Connect"}
      </button>
    </section>
  </header>`;
}
