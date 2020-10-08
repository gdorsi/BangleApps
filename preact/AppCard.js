import marked from "https://cdn.skypack.dev/marked";
import { useMemo } from "https://cdn.skypack.dev/preact/hooks";
import { CustomAppDialog } from "./CustomApp.js";
import { usePrompt } from "./Dialog.js";
import { EmulatorDialog } from "./Emulator.js";
import { AppReadmeDialog } from "./AppReadme.js";
import { AppInterfaceDialog } from "./AppInterface.js";
import { HtmlBlock } from "./HtmlBlock.js";
import { useAppInstaller } from "./useAppInstaller.js";
import { html } from "./index.js";
import { chips } from "./AppFilters.js";

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

const IconHeart = ({ filled }) =>
  html`<svg
    width="28"
    height="28"
    viewBox="0 0 28 28"
    fill=${filled ? "#5755D9" : "none"}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M7.17159 8.17159C6.80015 8.54302 6.50551 8.98398 6.30449 9.46928C6.10346 9.95458 6 10.4747 6 11C6 11.5253 6.10346 12.0455 6.30449 12.5308C6.50551 13.0161 6.80015 13.457 7.17159 13.8285L14 20.6569L20.8284 13.8285C21.5786 13.0783 22 12.0609 22 11C22 9.93915 21.5786 8.92173 20.8284 8.17159C20.0783 7.42144 19.0609 7.00001 18 7.00001C16.9391 7.00001 15.9217 7.42144 15.1716 8.17159L14 9.34314L12.8285 8.17159C12.457 7.80015 12.0161 7.50551 11.5308 7.30449C11.0455 7.10346 10.5253 7 10 7C9.47473 7 8.95458 7.10346 8.46928 7.30449C7.98398 7.50551 7.54302 7.80015 7.17159 8.17159V8.17159Z"
      stroke="#5755D9"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>`;

export function AppCard({ app, appInstalled }) {
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

  const categories = app.tags.split(",");
  const [mainCategory] = chips.tags.find(([tag]) =>
    categories.includes(tag)
  ) || [];

  return html`<article class="AppCard">
    <header class="AppCard__content">
      <img
        class="AppCard__avatar"
        src="apps/${app.icon ? `${app.id}/${app.icon}` : "unknown.png"}"
        alt="${app.name}"
      />
      <div class="AppCard__actions">
        <button>${html`<${IconHeart} />`}</button>
      </div>
    </header>
    <main class="AppCard__main">
      <div class="AppCard__title">
        ${app.name}${" "}
        <small>
          ${canUpdate
            ? html`v${appInstalled.version || "Unknown version"}, latest
              v${app.version}`
            : html`v${app.version}`}
        </small>
      </div>
      <${HtmlBlock} as="div" html="${description}" />
    </main>
    <footer class="AppCard__content">
      <button>#${mainCategory || 'app'}</button>
      <div class="AppCard__actions">
        ${canUpdate &&
        html`<button class="Button" onClick=${() => installer.update(app)}>
            Update
          </button>
          />`}
        ${appInstalled
          ? html`<button class="Button" onClick=${() => installer.remove(app)}>
                Remove
              </button>
              />`
          : html`<button
              class="Button"
              onClick=${() =>
                app.custom ? customAppPrompt.show() : installer.install(app)}
            >
              Install
            </button>`}
      </div>
    </footer>
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
  </article> `;
}
