import { h, render, createContext } from "https://cdn.skypack.dev/preact";
import { createPortal } from "https://cdn.skypack.dev/preact/compat";
import {
  useState,
  useEffect,
  useContext,
  useRef,
} from "https://cdn.skypack.dev/preact/hooks";
import htm from "https://cdn.skypack.dev/htm";

const html = htm.bind(h);

/** LEGACY things */
//This is required by Comm.uploadApp
window.SETTINGS = {
  pretokenise: true,
};

/** UTILS */
function createSharedHook(hook, defaultValue) {
  const ctx = createContext(defaultValue);

  function Provider(props) {
    return h(ctx.Provider, { value: hook(props) }, props.children);
  }

  function consumerHook() {
    return useContext(ctx);
  }

  return [Provider, consumerHook];
}

/** GETTERS */
//TODO Move to import marked
function getAppDescription(app) {
  let appPath = `apps/${app.id}/`;
  let markedOptions = { baseUrl: appPath };

  return marked(app.description, markedOptions);
}

function getAppGithubURL(app) {
  let username = "espruino";
  let githubMatch = window.location.href.match(/\/(\w+)\.github\.io/);

  if (githubMatch) username = githubMatch[1];

  return `https://github.com/${username}/BangleApps/tree/master/apps/${app.id}`;
}

function getFocusableElements(el) {
  return el.querySelectorAll(
    'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex="0"]'
  );
}

/** EFFECTS */
function runEmulator(app) {
  let file = app.storage.find((f) => f.name.endsWith(".js"));
  if (!file) {
    console.error("No entrypoint found for " + appid);
    return;
  }
  let baseurl = window.location.href;
  baseurl = baseurl.substr(0, baseurl.lastIndexOf("/"));
  let url = baseurl + "/apps/" + app.id + "/" + file.url;
  window.open(`https://espruino.com/ide/emulator.html?codeurl=${url}&upload`);
}

function Dialog({ header, body, footer, onClose }) {
  const container = document.getElementById("modals");

  function handleClose(evt) {
    evt.preventDefault();
    onClose();
  }

  useEffect(() => {
    const upHandler = ({ code, which }) => {
      if (code === "Escape" || which === 27) {
        onClose();
      }
    };

    addEventListener("keyup", upHandler);

    return () => {
      removeEventListener("keyup", upHandler);
    };
  }, [onClose]);

  const ref = useRef();

  useEffect(() => {
    const focusedElBeforeOpen = document.activeElement;

    const focusableElements = getFocusableElements(
      ref.current.querySelector(".modal-container")
    );

    //The close button is focused only when it is the only focusable element
    const focusedEl = focusableElements[1] || focusableElements[0];

    focusedEl.focus();

    return () => {
      focusedElBeforeOpen && focusedElBeforeOpen.focus();
    };
  }, []);

  useEffect(() => {
    const focusTrap = (evt) => {
      const { code, which, shiftKey } = evt;

      if (code !== "Tab" && which !== 9) return;

      const focusableElements = getFocusableElements(
        ref.current.querySelector(".modal-container")
      );

      if (focusableElements.length === 1) {
        evt.preventDefault();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (shiftKey) {
        if (document.activeElement === first) {
          evt.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          evt.preventDefault();
          first.focus();
        }
      }
    };

    addEventListener("keydown", focusTrap);

    return () => {
      removeEventListener("keydown", focusTrap);
    };
  }, []);

  return createPortal(
    html`
      <div role="dialog" class="modal active" ref=${ref}>
        <a
          href="#close"
          class="modal-overlay"
          aria-label="Close"
          onClick=${handleClose}
        ></a>
        <div class="modal-container">
          <div class="modal-header">
            <a
              href="#close"
              class="btn btn-clear float-right"
              aria-label="Close"
              onClick=${handleClose}
            ></a>
            ${header}
          </div>
          <div class="modal-body">
            ${body}
          </div>
          ${footer &&
          html`
            <div class="modal-footer">
              ${footer}
            </div>
          `}
        </div>
      </div>
    `,
    container
  );
}

function Prompt({ header, body, onConfirm, onClose }) {
  return html`
    <${Dialog}
      header=${header}
      body=${body}
      onClose=${onClose}
      footer=${html`
        <button class="btn btn-primary" onClick=${onConfirm}>Yes</button>
        <button class="btn" onClick=${onClose}>No</button>
      `}
    />
  `;
}

function usePrompt(onConfirm) {
  const [open, setOpen] = useState(false);

  function showPrompt() {
    setOpen(true);
  }

  function handleConfirm(...args) {
    onConfirm(...args);
    setOpen(false);
  }

  function handleClose() {
    setOpen(false);
  }

  return {
    showPrompt,
    onConfirm: handleConfirm,
    onClose: handleClose,
    open,
  };
}

const [AppsProvider, useApps] = createSharedHook(function () {
  const [list, setAppList] = useState();
  const [installed, setAppsInstalled] = useState();
  const maybeConnected = Boolean(installed);

  useEffect(() => {
    httpGet("apps.json").then((apps) => {
      try {
        setAppList(JSON.parse(apps));
      } catch (e) {
        console.log(e);
        showToast("App List Corrupted", "error");
      }
    });
  }, []);

  function getInstalledApps(refresh) {
    if (installed && !refresh) {
      return Promise.resolve(installed);
    }

    // Get apps and files
    return Comms.getInstalledApps().then((apps) => {
      setAppsInstalled(apps);

      return apps;
    });
  }

  function refreshInstalled() {
    return getInstalledApps(true);
  }

  /// check for dependencies the app needs and install them if required
  function checkDependencies(app) {
    let promise = Promise.resolve();

    if (!app.dependencies) return promise;

    Object.entries(app.dependencies).forEach(([dependency, kind]) => {
      if (kind !== "type")
        throw new Error("Only supporting dependencies on app types right now");

      console.log(`Searching for dependency on app type '${dependency}'`);

      let found = installed.find((app) => app.type == dependency);

      if (found) {
        console.log(`Found dependency in installed app '${found.id}'`);
        return;
      }

      let foundApps = list.filter((app) => app.type == dependency);

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
          if (app) setAppsInstalled((installed) => installed.concat(app));
        });
      });
    });

    return promise;
  }

  //TODO Move the connection check outside
  function upload(app) {
    return getInstalledApps()
      .then((appsInstalled) => {
        if (appsInstalled.some((i) => i.id === app.id)) {
          return update(app);
        }

        checkDependencies(app)
          .then(() => Comms.uploadApp(app))
          .then((app) => {
            Progress.hide({ sticky: true });
            if (app) {
              setAppsInstalled((installed) => installed.concat(app));
            }
            showToast(app.name + " Uploaded!", "success");
          })
          .catch((err) => {
            Progress.hide({ sticky: true });
            showToast("Upload failed, " + err, "error");
          });
      })
      .catch((err) => {
        showToast("Device connection failed, " + err, "error");
      });
  }

  function update(app) {
    if (app.custom) return customApp(app);

    return getInstalledApps()
      .then((installed) => {
        // a = from appid.info, app = from apps.json
        let remove = installed.find((a) => a.id === app.id);
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
        showToast(`Updating ${app.name}...`);

        setAppsInstalled((installed) =>
          installed.filter((a) => a.id != app.id)
        );

        return checkDependencies(app);
      })
      .then(() => Comms.uploadApp(app))
      .then(
        (app) => {
          if (app) setAppsInstalled((installed) => installed.concat(app));

          showToast(app.name + " Updated!", "success");
        },
        (err) => {
          showToast(app.name + " update failed, " + err, "error");
        }
      );
  }

  function remove(app) {
    return getInstalledApps()
      .then((installed) => {
        // a = from appid.info, app = from apps.json
        return Comms.removeApp(installed.find((a) => a.id === app.id));
      })
      .then(
        () => {
          setAppsInstalled((installed) =>
            installed.filter((a) => a.id != app.id)
          );
          showToast(app.name + " removed successfully", "success");
        },
        (err) => {
          showToast(app.name + " removal failed, " + err, "error");
        }
      );
  }

  function removeAll() {
    Comms.removeAllApps()
      .then(() => {
        Progress.hide({ sticky: true });
        showToast("All apps removed", "success");
        return refreshInstalled();
      })
      .catch((err) => {
        Progress.hide({ sticky: true });
        showToast("App removal failed, " + err, "error");
      });
  }

  function setTime() {
    Comms.setTime().then(
      () => {
        showToast("Time set successfully", "success");
      },
      (err) => {
        showToast("Error setting time, " + err, "error");
      }
    );
  }

  function installMultipleApps(appIds) {
    let apps = appIds.map((appid) => list.find((app) => app.id == appid));
    if (apps.some((x) => x === undefined))
      return Promise.reject("Not all apps found");
    let appCount = apps.length;
    return Comms.removeAllApps()
      .then(() => {
        Progress.hide({ sticky: true });
        showToast(`Existing apps removed. Installing  ${appCount} apps...`);
        return new Promise((resolve, reject) => {
          function upload() {
            let app = apps.shift();
            if (app === undefined) return resolve();
            Progress.show({
              title: `${app.name} (${appCount - apps.length}/${appCount})`,
              sticky: true,
            });
            checkDependencies(app, "skip_reset")
              .then(() => Comms.uploadApp(app, "skip_reset"))
              .then((appJSON) => {
                Progress.hide({ sticky: true });
                if (appJSON)
                  setAppsInstalled((installed) => installed.concat(app));
                showToast(
                  `(${appCount - apps.length}/${appCount}) ${app.name} Uploaded`
                );
                upload();
              })
              .catch(function () {
                Progress.hide({ sticky: true });
                reject();
              });
          }
          upload();
        });
      })
      .then(() => {
        return Comms.setTime();
      })
      .then(() => {
        showToast("Apps successfully installed!", "success");
        return getInstalledApps(true);
      });
  }

  function installDefaultApps() {
    httpGet("defaultapps.json")
      .then((json) => {
        return installMultipleApps(JSON.parse(json), "default");
      })
      .catch((err) => {
        Progress.hide({ sticky: true });
        showToast("App Install failed, " + err, "error");
      });
  }

  return {
    list,
    installed,
    upload,
    update,
    remove,
    removeAll,
    getInstalledApps,
    refreshInstalled,
    setTime,
    installDefaultApps,
    maybeConnected,
  };
});

const [SettingsProvider, useSettings] = createSharedHook(function () {
  const [pretokenise, setPretokenise] = useState(true);

  return {
    pretokenise,
    setPretokenise,
  };
});

const [FiltersProvider, useFilters] = createSharedHook(function () {
  const [active, setActive] = useState("");
  const [sort, setSort] = useState("");
  const [sortInfo, setSortInfo] = useState();
  const [search, setSearch] = useState("");

  useEffect(() => {
    httpGet("appdates.csv")
      .then((csv) => {
        const appSortInfo = {};

        csv.split("\n").forEach((line) => {
          let l = line.split(",");
          appSortInfo[l[0]] = {
            created: Date.parse(l[1]),
            modified: Date.parse(l[2]),
          };
        });

        setSortInfo(appSortInfo);
      })
      .catch(() => {
        console.log("No recent.csv - app sort disabled");
      });
  }, []);

  return {
    active,
    setActive,
    sort,
    setSort,
    sortInfo,
    search,
    setSearch,
  };
});

export function AppList() {
  const apps = useApps();
  const settings = useSettings();
  const filters = useFilters();

  if (!apps.list) return;

  let visibleApps = apps.list.slice(); // clone so we don't mess with the original

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
      apps.installed && apps.installed.find((a) => a.id == app.id);

    return html`<${AppTile}
      key=${app.id}
      app=${app}
      appInstalled=${appInstalled}
    />`;
  });
}

function AppTile({ app, appInstalled }) {
  const apps = useApps();

  const customAppPrompt = usePrompt(apps.upload);

  let version = getVersionInfo(app, appInstalled);
  let versionInfo = version.text;
  let readme = `<a class="c-hand" onclick="showReadme('${app.id}')">Read more...</a>`;

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
        ${versionInfo &&
        html`<${HtmlBlock} as="small" html="(${versionInfo})" />`}
      </p>
      <${HtmlBlock}
        class="tile-subtitle"
        as="p"
        html="${getAppDescription(app)}${app.readme ? `<br/>${readme}` : ""}"
      />
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
      />`}
      ${app.allow_emulator &&
      html`<${AppButton}
        title="Try in Emulator"
        iconName="icon-share"
        onClick=${() => runEmulator(app)}
      />`}
      ${version.canUpdate &&
      html`<${AppButton}
        title="Update App"
        iconName="icon-refresh"
        onClick=${() => apps.update(app)}
      />`}
      ${!appInstalled &&
      !app.custom &&
      html`<${AppButton}
        title="Upload App"
        iconName="icon-upload"
        onClick=${() => apps.upload(app)}
      />`}
      ${appInstalled &&
      html`<${AppButton}
        title="Remove App"
        iconName="icon-delete"
        onClick=${() => apps.remove(app)}
      />`}
      ${app.custom &&
      html`<${AppButton}
        title="Customise and Upload App"
        iconName="icon-menu"
        onClick=${customAppPrompt.showPrompt}
      />`}
    </div>
    ${customAppPrompt.open &&
    html`
      <${CustomAppDialog}
        app=${app}
        onClose=${customAppPrompt.onClose}
        onConfirm=${customAppPrompt.onConfirm}
      />
    `}
  </div> `;
}

function CustomAppDialog({ onClose, onConfirm, app }) {
  const ref = useRef();

  useEffect(() => {
    const { contentWindow: iframeWindow } = ref.current;

    function handleMessage(event) {
      const appFiles = event.data;
      const customizedApp = JSON.parse(JSON.stringify(app));

      // copy extra keys from appFiles
      Object.keys(appFiles).forEach((k) => {
        if (k != "storage") customizedApp[k] = appFiles[k];
      });

      appFiles.storage.forEach((f) => {
        customizedApp.storage = customizedApp.storage.filter(
          (s) => s.name != f.name
        ); // remove existing item
        customizedApp.storage.push(f); // add new
      });

      onConfirm(customizedApp);
    }

    iframeWindow.addEventListener("message", handleMessage);

    return () => {
      iframeWindow.removeEventListener("message", handleMessage);
    };
  }, []);

  return html`
    <${Dialog}
      onClose=${onClose}
      header=${app.name}
      body=${html`<iframe
        src="apps/${app.id}/${app.custom}"
        style="width:100%;height:100%;border:0px;"
        ref=${ref}
      ></iframe>`}
    />
  `;
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

function AppFilters() {
  const filters = useFilters();

  function handleInput(evt) {
    filters.setSearch(evt.target.value.toLowerCase());
  }

  return html`<div>
    <div>
      <input
        class="form-input"
        type="text"
        placeholder="Keywords..."
        onInput=${handleInput}
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

function HtmlBlock({ as = "span", html, ...props }) {
  return h(as, {
    dangerouslySetInnerHTML: {
      __html: html,
    },
    ...props,
  });
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
  const apps = useApps();
  const settings = useSettings();

  const list =
    apps.installed &&
    apps.installed.map((appInstalled) => {
      let app = apps.list.find((a) => a.id == appInstalled.id);

      return html`<${AppTile}
        key=${app.id}
        app=${app}
        appInstalled=${appInstalled}
      />`;
    });

  return html`<${Panel}
    header=${html`<button class="btn refresh" onClick=${apps.refreshInstalled}>
      Refresh...
    </button>`}
    body=${list}
  />`;
}

function About() {
  const apps = useApps();
  const removeAllPrompt = usePrompt(apps.removeAll);
  const installDefaultPrompt = usePrompt(apps.installDefaultApps);

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
        <button class="btn" onClick=${apps.setTime}>Set Bangle.js Time</button>
        <button class="btn" onClick=${removeAllPrompt.showPrompt}>
          Remove all Apps
        </button>
        <button class="btn" onClick=${installDefaultPrompt.showPrompt}>
          Install default apps
        </button>
      </p>
      <h3>Settings</h3>
      <div class="form-group">
        <label class="form-switch">
          <input type="checkbox" id="settings-pretokenise" />
          <i class="form-icon"></i> Pretokenise apps before upload (smaller,
          faster apps)
        </label>
      </div>
      ${removeAllPrompt.open &&
      html`
        <${Prompt}
          header="Remove all"
          body="Really remove all apps?"
          onConfirm=${removeAllPrompt.onConfirm}
          onClose=${removeAllPrompt.onClose}
        />
      `}
      ${installDefaultPrompt.open &&
      html`
        <${Prompt}
          header="Install Defaults"
          body="Remove everything and install default apps?"
          onConfirm=${installDefaultPrompt.onConfirm}
          onClose=${installDefaultPrompt.onClose}
        />
      `}
    </div>`;
}

function Header() {
  const apps = useApps();

  return html`<header class="navbar-primary navbar">
    <section class="navbar-section">
      <a href="https://banglejs.com" target="_blank" class="navbar-brand mr-2"
        ><img src="img/banglejs-logo-sml.png" alt="Bangle.js" /> App Loader</a
      >
    </section>
    <section class="navbar-section">
      <button class="btn" onClick=${apps.getInstalledApps}>
        ${apps.maybeConnected ? "Disconnect" : "Connect"}
      </button>
    </section>
  </header>`;
}

function HttpsBanner() {
  if (location.href.startsWith("https")) return null;

  return html`<div class="container" style="padding-top:4px">
    <p>
      <b>STOP!</b> This page <b>must</b> be served over HTTPS. Please
      <a
        href="#https"
        onClick=${() => {
          location.href = location.href.replace(`http://`, "https://");
        }}
        >reload this page via HTTPS</a
      >.
    </p>
  </div>`;
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
    <div class="container" id="toastcontainer"></div>
    <div class="container bangle-tab">
      ${activeTab === "library"
        ? html`<${AppsLibrary} />`
        : activeTab === "myapps"
        ? html`<${InstalledApps} />`
        : html`<${About} />`}
    </div>`;
}

render(
  html`<${AppsProvider}>
    <${SettingsProvider}>
      <${FiltersProvider}>
        <${Main} />
      <//>
    <//>
  <//>`,
  document.querySelector("#root")
);
