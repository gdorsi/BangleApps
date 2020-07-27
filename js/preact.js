import { h, render } from "https://cdn.skypack.dev/preact";
import { createPortal } from "https://cdn.skypack.dev/preact/compat";
import {
  useState,
  useEffect,
  useRef,
  useLayoutEffect,
} from "https://cdn.skypack.dev/preact/hooks";
import htm from "https://cdn.skypack.dev/htm";

const html = htm.bind(h);

function createStateAtom(init, effect) {
  const listeners = new Set();
  let cleanup;

  const atom = {
    add: listeners.add.bind(listeners),
    remove: listeners.delete.bind(listeners),
    state: null,
    setState,
  };

  function setState(state) {
    if (typeof state === "function") {
      state = state(atom.state);
    }

    if (state === atom.state) return;

    atom.state = state;
    listeners.forEach((cb) => cb(state));

    effect &&
      requestAnimationFrame(() => {
        queueMicrotask(() => {
          cleanup && cleanup();
          cleanup = effect(state);
        });
      });
  }

  //triggers the effects on startup
  setState(init);

  return atom;
}

function createAsyncAtom(fetcher, effect) {
  const atom = createStateAtom({ init: true }, effect);

  const setState = atom.setState;

  let promise;

  function fetch(value) {
    if (typeof value === "function") {
      value = value(atom.state);
    }

    const current = (promise = fetcher(value));

    current
      .then((data) => {
        if (current === promise) {
          setState({ data });
        }
      })
      .catch((error) => {
        if (current === promise) {
          setState({ ...atom.state, error });
        }
      });
  }

  atom.setState = fetch;

  return atom;
}

function useAtom(atom) {
  const [state, setLocalState] = useState(atom.state);

  useLayoutEffect(() => {
    atom.add(setLocalState);

    return () => atom.remove(setLocalState);
  }, []);

  return [state, atom.setState];
}

function useSetAtomState(atom) {
  return atom.setState;
}

function useAtomValue(atom) {
  return useAtom(atom)[0];
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
function getEmulatorURL(app) {
  let file = app.storage.find((f) => f.name.endsWith(".js"));
  if (!file) {
    console.error("No entrypoint found for " + appid);
    return;
  }
  let baseurl = window.location.href;
  baseurl = baseurl.substr(0, baseurl.lastIndexOf("/"));
  let url = baseurl + "/apps/" + app.id + "/" + file.url;

  return `/emulator.html?codeurl=${url}`;
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
  const [isOpen, setOpen] = useState(false);

  function show() {
    setOpen(true);
  }

  function handleConfirm(...args) {
    onConfirm && onConfirm(...args);
    setOpen(false);
  }

  function handleClose() {
    setOpen(false);
  }

  return {
    show,
    onConfirm: handleConfirm,
    onClose: handleClose,
    isOpen,
  };
}

const toastAtom = createStateAtom();

function useToast() {
  const setState = useSetAtomState(toastAtom);

  function show(msg, type) {
    setState({
      msg,
      type,
    });
  }

  return { show };
}

const appListAtom = createAsyncAtom(
  () =>
    fetch("apps.json").then((res) =>
      res.ok ? res.json() : Promise.reject(res)
    ),
  ({ error, init }) => {
    if (init) {
      appListAtom.setState();
    }

    if (error) {
      if (error.message) {
        toastAtom.setState({
          msg: `${error.toString()} on apps.json`,
          type: "error",
        });
      } else {
        toastAtom.setState({
          msg: "Error during the fetch of apps.json",
          type: "error",
        });
      }
    }
  }
);

const installedAtom = createStateAtom(null);

function useInstalledApps() {
  const [list, set] = useAtom(installedAtom);

  function loadFromTheDevice() {
    return Comms.getInstalledApps().then((apps) => {
      set(apps);

      return apps;
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
  const list = useAtomValue(appListAtom).data;
  const installed = useInstalledApps();
  const isConnected = useIsConnected();
  const toast = useToast();

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
            Progress.hide({ sticky: true });
            if (app) {
              installed.set((list) => list.concat(app));
            }
            toast.show(app.name + " Uploaded!", "success");
          })
          .catch((err) => {
            Progress.hide({ sticky: true });
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
        Progress.hide({ sticky: true });
        toast.show("All apps removed", "success");
        return installed.loadFromTheDevice();
      })
      .catch((err) => {
        Progress.hide({ sticky: true });
        toast.show("App removal failed, " + err, "error");
      });
  }

  function installMultipleApps(appIds) {
    let apps = appIds.map((appid) => list.find((app) => app.id == appid));

    if (apps.some((x) => x === undefined))
      return Promise.reject("Not all apps found");

    let appCount = apps.length;

    toast.show(`Installing  ${appCount} apps...`);

    return new Promise((resolve, reject) => {
      function uploadNextApp() {
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

            if (appJSON) installed.set((list) => list.concat(app));

            toast.show(
              `(${appCount - apps.length}/${appCount}) ${app.name} Uploaded`
            );

            uploadNextApp();
          })
          .catch(function () {
            Progress.hide({ sticky: true });
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
    httpGet("defaultapps.json")
      .then((json) => {
        return Comms.removeAllApps().then(() => {
          Progress.hide({ sticky: true });
          toast.show(`Existing apps removed.`);

          return installMultipleApps(JSON.parse(json));
        });
      })
      .then(() => {
        return Comms.setTime();
      })
      .catch((err) => {
        Progress.hide({ sticky: true });
        shotoast.showwToast("App Install failed, " + err, "error");
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

const pretokeniseAtom = createStateAtom(
  () => {
    const saved = localStorage.getItem("pretokenise");

    if (saved) {
      return JSON.parse(saved);
    }

    return true;
  },
  (pretokenise) => {
    //This is required by Comm.uploadApp
    window.SETTINGS = {
      pretokenise,
    };

    localStorage.setItem("pretokenise", JSON.stringify(pretokenise));
  }
);

const activeCategoryAtom = createStateAtom("");
const sortAtom = createStateAtom("");
const searchAtom = createStateAtom("");
const sortInfoAtom = createAsyncAtom(
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
  ({ error, init }) => {
    if (init) {
      sortInfoAtom.setState();
    }

    if (error) {
      console.log("No recent.csv - app sort disabled");
    }
  }
);

const useFilters = () => {
  const [active, setActive] = useAtom(activeCategoryAtom);
  const [sort, setSort] = useAtom(sortAtom);
  const sortInfo = useAtomValue(sortInfoAtom).data;
  const [search, setSearch] = useAtom(searchAtom);

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
  const appList = useAtomValue(appListAtom).data;
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

function AppTile({ app, appInstalled }) {
  const installer = useAppInstaller();

  const customAppPrompt = usePrompt(installer.install);
  const appInterfacePrompt = usePrompt();
  const emulatorPrompt = usePrompt();

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
        onClick=${appInterfacePrompt.show}
      />`}
      ${app.allow_emulator &&
      html`<${AppButton}
        title="Try in Emulator"
        iconName="icon-share"
        onClick=${emulatorPrompt.show}
      />`}
      ${version.canUpdate &&
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

function AppInterfaceDialog({ onClose, app }) {
  const [loaded, setLoaded] = useState(false);
  const ref = useRef();

  useEffect(() => {
    if (!loaded) return;

    const { contentWindow: iframeWindow } = ref.current;

    function handleMessage(event) {
      const msg = event.data;

      if (msg.type === "eval") {
        Puck.eval(msg.data, function (result) {
          iframeWindow.postMessage({
            type: "evalrsp",
            data: result,
            id: msg.id,
          });
        });
      } else if (msg.type === "write") {
        Puck.write(msg.data, function (result) {
          iframeWindow.postMessage({
            type: "writersp",
            data: result,
            id: msg.id,
          });
        });
      } else if (msg.type === "readstoragefile") {
        Comms.readStorageFile(msg.data /*filename*/).then(function (result) {
          iframeWindow.postMessage({
            type: "readstoragefilersp",
            data: result,
            id: msg.id,
          });
        });
      }

      iframeWindow.postMessage({ type: "init" });
    }

    iframeWindow.addEventListener("message", handleMessage);

    return () => {
      iframeWindow.removeEventListener("message", handleMessage);
    };
  }, [loaded]);

  return html`
    <${Dialog}
      onClose=${onClose}
      header=${app.name}
      body=${html`<iframe
        src="apps/${app.id}/${app.interface}"
        style="width:100%;height:100%;border:0px;"
        onLoad=${() => setLoaded(true)}
        ref=${ref}
      ></iframe>`}
    />
  `;
}

function EmulatorDialog({ onClose, app }) {
  return html`
    <${Dialog}
      onClose=${onClose}
      header=${app.name}
      body=${html`<iframe
        src=${getEmulatorURL(app)}
        style="width: 264px;height: 244px;border:0px;"
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
  const appList = useAtomValue(appListAtom).data;
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
  const [pretokenise, setPretokenise] = useAtom(pretokeniseAtom);

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
        <${Prompt}
          header="Remove all"
          body="Really remove all apps?"
          onConfirm=${removeAllPrompt.onConfirm}
          onClose=${removeAllPrompt.onClose}
        />
      `}
      ${installDefaultPrompt.isOpen &&
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

function Toast() {
  const [state, setState] = useAtom(toastAtom);

  useEffect(() => {
    const timer = setTimeout(() => setState(null), 5000);

    return () => clearTimeout(timer);
  }, [state]);

  if (!state) return null;

  const { msg, type } = state;
  let style = "toast-primary";

  if (type == "success") style = "toast-success";
  else if (type == "error") style = "toast-error";
  else if (type == "warning") style = "toast-warning";
  else if (type !== undefined) console.log("showToast: unknown toast " + type);

  return createPortal(
    html` <div class="toast ${style}">${msg}</div> `,
    document.getElementById("toastcontainer")
  );
}

export function Main() {
  const [activeTab, setTab] = useState("library");

  return html` <${Toast} />
    <${Header} />
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

render(html`<${Main} />`, document.querySelector("#root"));
