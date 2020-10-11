import { createDataAtom, useAtomValue } from "./atoms.js";
import { toastAtom } from "./Toast.js";
import { useFilters } from "./useFilters.js";
import { useInstalledApps } from "./useInstalledApps.js";

const appListAtom = createDataAtom(
  () =>
    fetch("apps.json").then((res) =>
      res.ok ? res.json() : Promise.reject(res)
    ),
  ({ error, init, fetchData }, use) => {
    const toast = use(toastAtom);

    if (init) {
      fetchData();
    }

    if (error) {
      if (error.message) {
        toast.setState({
          msg: `${error.toString()} on apps.json`,
          type: "error",
        });
      } else {
        toast.setState({
          msg: "Error during the fetch of apps.json",
          type: "error",
        });
      }
    }
  }
);

export const useAppList = () => {
  let { data: visibleApps } = useAtomValue(appListAtom);

  const installedApps = useInstalledApps();
  const filters = useFilters();

  if (!visibleApps) return [];

  if (filters.active) {
    visibleApps = visibleApps.filter(
      (app) => app.tags && app.tags.split(",").includes(filters.active)
    );
  }

  if (filters.search) {
    visibleApps = visibleApps.filter(
      (app) =>
        app.name.toLowerCase().includes(filters.search) ||
        app.tags.includes(filters.search)
    );
  }

  visibleApps = visibleApps.slice().sort((a, b) => {
    if (a.unknown) return 1;
    if (b.unknown) return -1;

    const sa = 0 | a.sortorder;
    const sb = 0 | b.sortorder;

    if (sa !== sb) return sa - sb;

    return a.name == b.name ? 0 : a.name < b.name ? -1 : 1;
  });

  if (filters.sort && filters.sortInfo) {
    if (filters.sort == "created" || filters.sort == "modified") {
      visibleApps = visibleApps
        .slice()
        .sort(
          (a, b) =>
            filters.sortInfo[b.id][filters.sort] -
            filters.sortInfo[a.id][filters.sort]
        );
    } else throw new Error("Unknown sort type " + filters.sort);
  }

  if (installedApps.list) {
    visibleApps = visibleApps.map((app) => {
      const appInstalled = installedApps.list.find(({ id }) => id == app.id);

      if (appInstalled) {
        return {
          ...app,
          appInstalled,
        };
      }

      return app;
    });
  }

  if (filters.section === 'myapps') {
    visibleApps = visibleApps.filter(app => app.appInstalled);
  }

  return visibleApps;
};
