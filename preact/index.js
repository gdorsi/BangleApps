import htm from "https://cdn.skypack.dev/htm";
import marked from "https://cdn.skypack.dev/marked";
import { h, render } from "https://cdn.skypack.dev/preact";
import {
  useMemo,
  useRef,
  useState,
} from "https://cdn.skypack.dev/preact/hooks";
import {
  createDataAtom,
  createStateAtom,
  useStateAtom,
  useAtomValue,
} from "./atoms.js";
import { CustomAppDialog } from "./CustomApp.js";
import { Confirm, usePrompt } from "./Dialog.js";
import { EmulatorDialog } from "./Emulator.js";
import { AppReadmeDialog } from "./AppReadme.js";
import { AppInterfaceDialog } from "./AppInterface.js";
import { Toast, useToast, toastAtom } from "./Toast.js";
import { HttpsBanner } from "./HttpsBanner.js";
import { HtmlBlock } from "./HtmlBlock.js";
import { useProgressBar, ProgressBar } from "./ProgressBar.js";
import { useComms } from "./useComms.js";

export const html = htm.bind(h);

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

const installedAtom = createStateAtom(null);

function useInstalledApps() {
  //TODO use watchConnectionChange
  const [list, set] = useStateAtom(installedAtom);
  const Comms = useComms();
  const toast = useToast();

  function loadFromTheDevice() {
    return Comms.getInstalledApps()
      .then((apps) => {
        set(apps);

        return apps;
      })
      .catch((err) => {
        toast.show("Connection failed ", err);
      });
  }

  function disconnect() {
    Comms.disconnectDevice();
    set(null);
  }

  return {
    list,
    set,
    loadFromTheDevice,
    disconnect,
  };
}

function useIsConnected() {
  return useInstalledApps().list !== null;
}

function useAppsUtils() {
  const Comms = useComms();
  const toast = useToast();

  function setTime() {
    Comms.setTime().then(
      () => {
        toast.show("Time set successfully", "success");
      },
      (err) => {
        toast.show("Error setting time, " + err, "error");
      }
    );
  }

  return { setTime };
}

function useAppInstaller() {
  const { data: appList } = useAtomValue(appListAtom);
  const installed = useInstalledApps();
  const isConnected = useIsConnected();
  const toast = useToast();
  const progressBar = useProgressBar();
  const Comms = useComms();

  /// check for dependencies the app needs and install them if required
  function checkDependencies(app) {
    let promise = Promise.resolve();

    if (!app.dependencies) return promise;

    Object.entries(app.dependencies).forEach(([dependency, kind]) => {
      if (kind !== "type")
        throw new Error("Only supporting dependencies on app types right now");

      console.log(`Searching for dependency on app type '${dependency}'`);

      let found = installed.list.find((app) => app.type == dependency);

      if (found) {
        console.log(`Found dependency in installed app '${found.id}'`);
        return;
      }

      let foundApps = appList.filter((app) => app.type == dependency);

      if (!foundApps.length)
        throw new Error(
          `Dependency of '${dependency}' listed, but nothing satisfies it!`
        );

      console.log(
        `Apps ${foundApps
          .map((f) => `'${f.id}'`)
          .join("/")} implement '${dependency}'`
      );
      found = foundApps[0]; // choose first app in list
      console.log(`Dependency not installed. Installing app id '${found.id}'`);

      promise = promise.then(() => {
        console.log(`Install dependency '${dependency}':'${found.id}'`);
        return Comms.uploadApp(found).then((app) => {
          if (app) installed.set((list) => list.concat(app));
        });
      });
    });

    return promise;
  }

  function install(app) {
    //TODO Move the connection check outside
    let promise = isConnected
      ? Promise.resolve(installed.list)
      : installed.loadFromTheDevice();

    return promise
      .then((list) => {
        if (list.some((i) => i.id === app.id)) {
          return update(app);
        }

        checkDependencies(app)
          .then(() => Comms.uploadApp(app))
          .then((app) => {
            progressBar.hide();

            if (app) {
              installed.set((list) => list.concat(app));
            }
            toast.show(app.name + " Uploaded!", "success");
          })
          .catch((err) => {
            progressBar.hide();
            toast.show("Upload failed, " + err, "error");
          });
      })
      .catch((err) => {
        toast.show("Device connection failed, " + err, "error");
      });
  }

  function update(app) {
    //TODO Move the connection check outside
    let promise = isConnected
      ? Promise.resolve(installed.list)
      : installed.loadFromTheDevice();

    return promise
      .then((list) => {
        // a = from appid.info, app = from apps.json
        let remove = list.find((a) => a.id === app.id);
        // no need to remove files which will be overwritten anyway
        remove.files = remove.files
          .split(",")
          .filter((f) => f !== app.id + ".info")
          .filter((f) => !app.storage.some((s) => s.name === f))
          .join(",");

        let data = AppInfo.parseDataString(remove.data);

        if ("data" in app) {
          // only remove data files which are no longer declared in new app version
          const removeData = (f) =>
            !app.data.some((d) => (d.name || d.wildcard) === f);

          data.dataFiles = data.dataFiles.filter(removeData);
          data.storageFiles = data.storageFiles.filter(removeData);
        }

        remove.data = AppInfo.makeDataString(data);

        return Comms.removeApp(remove);
      })
      .then(() => {
        toast.show(`Updating ${app.name}...`);

        installed.set((list) => list.filter((a) => a.id != app.id));

        return checkDependencies(app);
      })
      .then(() => Comms.uploadApp(app))
      .then(
        (app) => {
          if (app) installed.set((list) => list.concat(app));

          toast.show(app.name + " Updated!", "success");
        },
        (err) => {
          toast.show(app.name + " update failed, " + err, "error");
        }
      );
  }

  function remove(app) {
    return Comms.removeApp(installed.list.find((a) => a.id === app.id)).then(
      () => {
        installed.set((list) => list.filter((a) => a.id != app.id));
        toast.show(app.name + " removed successfully", "success");
      },
      (err) => {
        toast.show(app.name + " removal failed, " + err, "error");
      }
    );
  }

  function removeAll() {
    Comms.removeAllApps()
      .then(() => {
        progressBar.hide();
        toast.show("All apps removed", "success");
        return installed.loadFromTheDevice();
      })
      .catch((err) => {
        progressBar.hide();
        toast.show("App removal failed, " + err, "error");
      });
  }

  function installMultipleApps(appIds) {
    let apps = appIds.map((appid) => appList.find((app) => app.id == appid));

    if (apps.some((x) => x === undefined))
      return Promise.reject("Not all apps found");

    let appCount = apps.length;

    toast.show(`Installing  ${appCount} apps...`);

    return new Promise((resolve, reject) => {
      function uploadNextApp() {
        let app = apps.shift();

        if (app === undefined) return resolve();

        progressBar.show(`${app.name} (${appCount - apps.length}/${appCount})`);

        checkDependencies(app, "skip_reset")
          .then(() => Comms.uploadApp(app, "skip_reset"))
          .then((appJSON) => {
            progressBar.hide();

            if (appJSON) installed.set((list) => list.concat(app));

            toast.show(
              `(${appCount - apps.length}/${appCount}) ${app.name} Uploaded`
            );

            uploadNextApp();
          })
          .catch(function () {
            progressBar.hide();
            reject();
          });
      }

      uploadNextApp();
    }).then(() => {
      toast.show("Apps successfully installed!", "success");
      return installed.loadFromTheDevice();
    });
  }

  function resetToDefaultApps() {
    fetch("defaultapps.json")
      .then((res) =>
        res.ok ? res.json() : Promise.reject(`Could not fetch the default apps`)
      )
      .then((json) => {
        return Comms.removeAllApps().then(() => {
          progressBar.hide();
          toast.show(`Existing apps removed.`);

          return installMultipleApps(JSON.parse(json));
        });
      })
      .then(() => {
        return Comms.setTime();
      })
      .catch((err) => {
        progressBar.hide();
        toast.show("App Install failed, " + err, "error");
      });
  }

  return {
    install,
    update,
    remove,
    removeAll,
    installMultipleApps,
    resetToDefaultApps,
  };
}

export const pretokeniseAtom = createStateAtom(
  () => {
    const saved = localStorage.getItem("pretokenise");

    if (saved) {
      return JSON.parse(saved);
    }

    return true;
  },
  (pretokenise) => {
    localStorage.setItem("pretokenise", JSON.stringify(pretokenise));
  }
);

const activeCategoryAtom = createStateAtom("");
const sortAtom = createStateAtom("");
const searchAtom = createStateAtom("");
const sortInfoAtom = createDataAtom(
  () =>
    fetch("appdates.csv")
      .then((res) => (res.ok ? res.text() : Promise.reject(res)))
      .then((csv) => {
        const appSortInfo = {};

        csv.split("\n").forEach((line) => {
          let l = line.split(",");
          appSortInfo[l[0]] = {
            created: Date.parse(l[1]),
            modified: Date.parse(l[2]),
          };
        });

        return appSortInfo;
      }),
  ({ error, init, fetchData }, use) => {
    const toast = use(toastAtom);

    if (init) {
      fetchData();
    }

    if (error) {
      toast.setState({
        msg: "No recent.csv - app sort disabled",
      });
    }
  }
);

const useFilters = () => {
  const [active, setActive] = useStateAtom(activeCategoryAtom);
  const [sort, setSort] = useStateAtom(sortAtom);
  const { data: sortInfo } = useAtomValue(sortInfoAtom);
  const [search, setSearch] = useStateAtom(searchAtom);

  return {
    active,
    setActive,
    sort,
    setSort,
    sortInfo,
    search,
    setSearch,
  };
};

export function AppList() {
  const { data: appList } = useAtomValue(appListAtom);
  const installedApps = useInstalledApps();
  const filters = useFilters();

  if (!appList) return;

  let visibleApps = appList.slice(); // clone so we don't mess with the original

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

  function appSorter(a, b) {
    if (a.unknown) return 1;
    if (b.unknown) return -1;

    const sa = 0 | a.sortorder;
    const sb = 0 | b.sortorder;

    if (sa !== sb) return sa - sb;

    return a.name == b.name ? 0 : a.name < b.name ? -1 : 1;
  }

  visibleApps.sort(appSorter);

  if (filters.sort && filters.sortInfo) {
    if (filters.sort == "created" || filters.sort == "modified") {
      visibleApps = visibleApps.sort(
        (a, b) =>
          filters.sortInfo[b.id][filters.sort] -
          filters.sortInfo[a.id][filters.sort]
      );
    } else throw new Error("Unknown sort type " + filters.sort);
  }

  return visibleApps.map((app) => {
    let appInstalled =
      installedApps.list && installedApps.list.find((a) => a.id == app.id);

    return html`<${AppTile}
      key=${app.id}
      app=${app}
      appInstalled=${appInstalled}
    />`;
  });
}

function getAppGithubURL(app) {
  let username = "espruino";
  let githubMatch = window.location.href.match(/\/(\w+)\.github\.io/);

  if (githubMatch) username = githubMatch[1];

  return `https://github.com/${username}/BangleApps/tree/master/apps/${app.id}`;
}

/* Given 2 JSON structures (1st from apps.json, 2nd from an installed app)
work out what to display re: versions and if we can update */
function getCanUpdate(appListing, appInstalled) {
  //TODO Implement semver compare
  if (appInstalled && appListing.version != appInstalled.version) {
    return true;
  }

  return false;
}

function AppTile({ app, appInstalled }) {
  const installer = useAppInstaller();

  const customAppPrompt = usePrompt(installer.install);
  const appInterfacePrompt = usePrompt();
  const emulatorPrompt = usePrompt();
  const readmePrompt = usePrompt();

  //TODO Implement changelog dialog
  const canUpdate = getCanUpdate(app, appInstalled);

  const description = useMemo(() => {
    let appPath = `apps/${app.id}/`;

    return marked(app.description, { baseUrl: appPath });
  }, [app.description]);

  return html`<div class="tile column col-6 col-sm-12 col-xs-12">
    <div class="tile-icon">
      <figure class="avatar">
        <img
          src="apps/${app.icon ? `${app.id}/${app.icon}` : "unknown.png"}"
          alt="${app.name}"
        />
      </figure>
      <br />
    </div>
    <div class="tile-content">
      <p class="tile-title text-bold">
        ${app.name}
        <small>
          ${canUpdate
            ? html`v${appInstalled.version || "Unknown version"}, latest
              v${app.version}`
            : html`v${app.version}`}
        </small>
      </p>
      <${HtmlBlock} class="tile-subtitle" as="p" html="${description}" />
      ${app.readme
        ? html`<p>
            <a class="c-hand" onClick=${readmePrompt.show}>Read more...</a>
          </p>`
        : ""}
      <a href="${getAppGithubURL(app)}" target="_blank" class="link-github"
        ><img src="img/github-icon-sml.png" alt="See the code on GitHub"
      /></a>
    </div>
    <div class="tile-action">
      ${appInstalled &&
      app.interface &&
      html`<${AppButton}
        title="Download data from app"
        iconName="icon-download"
        onClick=${appInterfacePrompt.show}
      />`}
      ${app.allow_emulator &&
      html`<${AppButton}
        title="Try in Emulator"
        iconName="icon-share"
        onClick=${emulatorPrompt.show}
      />`}
      ${canUpdate &&
      html`<${AppButton}
        title="Update App"
        iconName="icon-refresh"
        onClick=${() => installer.update(app)}
      />`}
      ${!appInstalled &&
      !app.custom &&
      html`<${AppButton}
        title="Upload App"
        iconName="icon-upload"
        onClick=${() => installer.install(app)}
      />`}
      ${appInstalled &&
      html`<${AppButton}
        title="Remove App"
        iconName="icon-delete"
        onClick=${() => installer.remove(app)}
      />`}
      ${app.custom &&
      html`<${AppButton}
        title="Customise and Upload App"
        iconName="icon-menu"
        onClick=${customAppPrompt.show}
      />`}
    </div>
    ${customAppPrompt.isOpen &&
    html`
      <${CustomAppDialog}
        app=${app}
        onClose=${customAppPrompt.onClose}
        onConfirm=${customAppPrompt.onConfirm}
      />
    `}
    ${appInterfacePrompt.isOpen &&
    html`
      <${AppInterfaceDialog} app=${app} onClose=${appInterfacePrompt.onClose} />
    `}
    ${emulatorPrompt.isOpen &&
    html` <${EmulatorDialog} app=${app} onClose=${emulatorPrompt.onClose} /> `}
    ${readmePrompt.isOpen &&
    html` <${AppReadmeDialog} app=${app} onClose=${readmePrompt.onClose} /> `}
  </div> `;
}

function AppButton({
  class: className = "",
  iconName = "",
  loading,
  title,
  onClick,
  children,
}) {
  return html`
    <button
      class="btn btn-link btn-action btn-lg ${className}"
      title=${title}
      onClick=${onClick}
    >
      <i class="icon ${loading ? "loading" : iconName}"></i>
      ${children}
    </button>
  `;
}

const chips = {
  tags: [
    ["", "Default"],
    ["clock", "Clocks"],
    ["game", "Games"],
    ["tool", "Tools"],
    ["widget", "Widgets"],
    ["bluetooth", "Bluetooth"],
    ["outdoors", "Outdoors"],
  ],
  sort: [
    ["", "None"],
    ["created", "New"],
    ["modified", "Updated"],
  ],
};

function useDebouncedInput(onChange, initialValue) {
  const [value, setValue] = useState(initialValue || "");

  const timeout = useRef();

  function handleInput(evt) {
    const value = evt.target.value;

    setValue(value);

    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => onChange(value), 500);
  }

  return {
    onInput: handleInput,
    value,
  };
}

function AppFilters() {
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

  return html`<div>
    <div>
      <input
        class="form-input"
        type="text"
        placeholder="Keywords..."
        ...${searchInput}
      />
    </div>
    <div>
      <div class="filter-nav">
        ${chips.tags.map(
          ([value, text]) =>
            html`<${Chip}
              key=${value}
              value=${value}
              text=${text}
              onClick=${filters.setActive}
              active=${filters.active === value}
            />`
        )}
      </div>
      <div class="sort-nav ${!filters.sortInfo ? "hidden" : ""}">
        <span>Sort by:</span>
        ${chips.sort.map(
          ([value, text]) =>
            html`<${Chip}
              key=${value}
              value=${value}
              text=${text}
              onClick=${filters.setSort}
              active=${filters.sort === value}
            />`
        )}
      </div>
    </div>
  </div>`;
}

function Chip({ value, active, text, onClick }) {
  return html`<label
    class="chip ${active ? "active" : ""}"
    onClick=${() => onClick(value)}
    >${text}</label
  >`;
}

function Panel({ header, body, children, ...props }) {
  return html`
    <div class="panel" ...${props}>
      <div class="panel-header">
        ${header}
      </div>
      <div class="panel-body columns">${body}</div>
    </div>
  `;
}

function AppsLibrary() {
  return html`<${Panel}
    header=${html`<${AppFilters} />`}
    body=${html`<${AppList} />`}
  />`;
}

function InstalledApps() {
  const { data: appList } = useAtomValue(appListAtom);
  const installedApps = useInstalledApps();

  const list =
    installedApps.list &&
    installedApps.list.map((appInstalled) => {
      let app = appList.find((a) => a.id == appInstalled.id);

      return html`<${AppTile}
        key=${app.id}
        app=${app}
        appInstalled=${appInstalled}
      />`;
    });

  return html`<${Panel}
    header=${html`<button
      class="btn refresh"
      onClick=${installedApps.loadFromTheDevice}
    >
      Refresh...
    </button>`}
    body=${list}
  />`;
}

function About() {
  const installer = useAppInstaller();
  const utils = useAppsUtils();

  const removeAllPrompt = usePrompt(installer.removeAll);
  const installDefaultPrompt = usePrompt(installer.resetToDefaultApps);
  const [pretokenise, setPretokenise] = useStateAtom(pretokeniseAtom);

  //TODO apploaderlinks
  return html`<div class="hero bg-gray">
      <div class="hero-body">
        <a href="https://banglejs.com" target="_blank"
          ><img src="img/banglejs-logo-mid.png" alt="Bangle.js"
        /></a>
        <h2>App Loader</h2>
        <p>
          A tool for uploading and removing apps from
          <a href="https://banglejs.com" target="_blank"
            >Bangle.js Smart Watches</a
          >
        </p>
      </div>
    </div>
    <div class="container" style="padding-top: 8px;">
      <p id="apploaderlinks"></p>
      <p>
        Check out
        <a href="https://github.com/espruino/BangleApps" target="_blank"
          >the Source on GitHub</a
        >, or find out
        <a href="https://www.espruino.com/Bangle.js+App+Loader" target="_blank"
          >how to add your own app</a
        >
      </p>
      <p>
        Using <a href="https://espruino.com/" target="_blank">Espruino</a>,
        Icons from <a href="https://icons8.com/" target="_blank">icons8.com</a>
      </p>

      <h3>Utilities</h3>
      <p>
        <button class="btn" onClick=${utils.setTime}>Set Bangle.js Time</button>
        <button class="btn" onClick=${removeAllPrompt.show}>
          Remove all Apps
        </button>
        <button class="btn" onClick=${installDefaultPrompt.show}>
          Install default apps
        </button>
      </p>
      <h3>Settings</h3>
      <div class="form-group">
        <label class="form-switch">
          <input
            type="checkbox"
            onChange=${(evt) => setPretokenise(evt.target.checked)}
            checked=${pretokenise}
          />
          <i class="form-icon"></i> Pretokenise apps before upload (smaller,
          faster apps)
        </label>
      </div>
      ${removeAllPrompt.isOpen &&
      html`
        <${Confirm}
          header="Remove all"
          body="Really remove all apps?"
          onConfirm=${removeAllPrompt.onConfirm}
          onClose=${removeAllPrompt.onClose}
        />
      `}
      ${installDefaultPrompt.isOpen &&
      html`
        <${Confirm}
          header="Install Defaults"
          body="Remove everything and install default apps?"
          onConfirm=${installDefaultPrompt.onConfirm}
          onClose=${installDefaultPrompt.onClose}
        />
      `}
    </div>`;
}

function Header() {
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

const tabs = [
  ["library", "Library"],
  ["myapps", "My Apps"],
  ["about", "About"],
];

export function Main() {
  const [activeTab, setTab] = useState("library");

  return html` <${Header} />
    <${HttpsBanner} />
    <ul class="tab tab-block">
      ${tabs.map(
        ([id, label]) => html`
          <li class="tab-item ${id === activeTab ? "active" : ""}">
            <button onClick=${() => setTab(id)}>${label}</button>
          </li>
        `
      )}
    </ul>
    <div class="container" id="toastcontainer">
      <${Toast} />
      <${ProgressBar} />
    </div>
    <div class="container bangle-tab">
      ${activeTab === "library"
        ? html`<${AppsLibrary} />`
        : activeTab === "myapps"
        ? html`<${InstalledApps} />`
        : html`<${About} />`}
    </div>`;
}

render(html`<${Main} />`, document.querySelector("#root"));
