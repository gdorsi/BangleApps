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

export function AppTile({ app, appInstalled }) {
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
        ><img src="core/img/github-icon-sml.png" alt="See the code on GitHub"
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
