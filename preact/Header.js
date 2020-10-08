import { useInstalledApps } from "./useInstalledApps.js";
import { useIsConnected } from "./useIsConnected.js";
import { html } from "./index.js";
import { useFilters } from "./useFilters.js";
import { useDebouncedInput } from "./useDebouncedInput.js";

export function Header() {
  const installedApps = useInstalledApps();
  const isConnected = useIsConnected();

  const filters = useFilters();

  /**
   * The app list update is an operation that sometimes
   * runs over the 60FPS time budget
   *
   * That's why we reduce the list update operations by
   * debouncing the searchInput handler
   */
  const searchInput = useDebouncedInput((value) => {
    filters.setSearch(value.toLowerCase()); //TODO move the normalization inside the useFilters hook
  });

  return html`<header class="Header">
    <a href="https://banglejs.com" target="_blank"
      ><img src="img/banglejs-logo-sml.png" alt="Bangle.js" /> App Loader</a
    >
    <input
      class="Header__search"
      type="text"
      placeholder="Filter the apps..."
      ...${searchInput}
    />
    <button class="Button">Library</button>
    <button class="Button">My Apps</button>
    <button class="Button">Favourites</button>
    <button class="Button">Settings</button>
    <button
      class="Button"
      onClick=${isConnected
        ? installedApps.disconnect
        : installedApps.loadFromTheDevice}
    >
      ${isConnected ? "Disconnect" : "Connect"}
    </button>
  </header>`;
}
