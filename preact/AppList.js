import { useInstalledApps } from "./useInstalledApps.js";
import { useFilters } from "./useFilters.js";
import { useAppList } from "./useAppList.js";
import { html } from "./index.js";
import { AppCard } from "./AppCard.js";

export function AppList() {
  const { data: appList } = useAppList();
  const installedApps = useInstalledApps();
  const filters = useFilters();

  if (!appList)
    return;

  let visibleApps = appList.slice(); // clone so we don't mess with the original

  if (filters.active) {
    visibleApps = visibleApps.filter(
      (app) => app.tags && app.tags.split(",").includes(filters.active)
    );
  }

  if (filters.search) {
    visibleApps = visibleApps.filter(
      (app) => app.name.toLowerCase().includes(filters.search) ||
        app.tags.includes(filters.search)
    );
  }

  function appSorter(a, b) {
    if (a.unknown)
      return 1;
    if (b.unknown)
      return -1;

    const sa = 0 | a.sortorder;
    const sb = 0 | b.sortorder;

    if (sa !== sb)
      return sa - sb;

    return a.name == b.name ? 0 : a.name < b.name ? -1 : 1;
  }

  visibleApps.sort(appSorter);

  if (filters.sort && filters.sortInfo) {
    if (filters.sort == "created" || filters.sort == "modified") {
      visibleApps = visibleApps.sort(
        (a, b) => filters.sortInfo[b.id][filters.sort] -
          filters.sortInfo[a.id][filters.sort]
      );
    } else
      throw new Error("Unknown sort type " + filters.sort);
  }

  return visibleApps.map((app) => {
    let appInstalled = installedApps.list && installedApps.list.find((a) => a.id == app.id);

    return html`<${AppCard}
      key=${app.id}
      app=${app}
      appInstalled=${appInstalled}
    />`;
  });
}
