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
import { AppButton } from "./AppButton.js";
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

  const categories = app.tags.split(',');
  const [,mainCategory] = chips.tags.find(([tag]) => categories.includes(tag)) || [,'App'];

  return html`<article class="AppCard">
    <header class="AppCard__content">
      <img
        src="apps/${app.icon ? `${app.id}/${app.icon}` : "unknown.png"}"
        alt="${app.name}"
      />
      <div class="AppCard__actions">
        <button>❤️</button>
      </div>
    </header>
    <main class="AppCard__main">
      <div class="AppCard__title">
        ${app.name}${" "}
        <small>
          ${
            canUpdate
              ? html`v${appInstalled.version || "Unknown version"}, latest
                v${app.version}`
              : html`v${app.version}`
          }
        </small>
      </div>
      <${HtmlBlock} as="div" html="${description}" />
    </main>
    <footer class="AppCard__content">
      <button>${mainCategory}</button>
      <div class="AppCard__actions">
        ${
          canUpdate &&
          html`<${AppButton}
            title="Update"
            onClick=${() => installer.update(app)}
          />`
        }
          ${
            !appInstalled &&
            !app.custom &&
            html`<${AppButton}
              title="Install"
              onClick=${() => installer.install(app)}
            />`
          }
          ${
            appInstalled &&
            html`<${AppButton}
              title="Remove"
              onClick=${() => installer.remove(app)}
            />`
          }
          ${
            app.custom &&
            html`<${AppButton}
              title="Install"
              onClick=${customAppPrompt.show}
            />`
          }
      </div>
    </footer>
    ${
      customAppPrompt.isOpen &&
      html`
        <${CustomAppDialog}
          app=${app}
          onClose=${customAppPrompt.onClose}
          onConfirm=${customAppPrompt.onConfirm}
        />
      `
    }
    ${
      appInterfacePrompt.isOpen &&
      html`
        <${AppInterfaceDialog}
          app=${app}
          onClose=${appInterfacePrompt.onClose}
        />
      `
    }
    ${
      emulatorPrompt.isOpen &&
      html` <${EmulatorDialog} app=${app} onClose=${emulatorPrompt.onClose} /> `
    }
    ${
      readmePrompt.isOpen &&
      html` <${AppReadmeDialog} app=${app} onClose=${readmePrompt.onClose} /> `
    }
  </article> `;
}
