import { PreInstallWizardDialog } from "./PreInstallWizardDialog.js";
import { usePrompt } from "./Dialog.js";
import { EmulatorDialog } from "./Emulator.js";
import { AppReadmeDialog } from "./AppReadme.js";
import { AppInterfaceDialog } from "./AppInterface.js";
import { HtmlBlock } from "./HtmlBlock.js";
import { useAppInstaller } from "./useAppInstaller.js";
import { html } from "./index.js";
import { Chip } from "./Chip.js";
import { Button } from "./Button.js";


const IconHeart = ({ filled }) =>
  html`<svg
    class="Icon"
    viewBox="0 0 28 28"
    fill=${filled ? "#5755D9" : "none"}
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

  const installWizardPrompt = usePrompt(installer.install);
  const appInterfacePrompt = usePrompt();
  const emulatorPrompt = usePrompt();
  const readmePrompt = usePrompt();

  const { description, mainCategory, avatar, canUpdate } = app;

  return html`<article class="AppCard">
    <header class="AppCard__content">
      <img class="AppCard__avatar" src=${avatar} alt=${app.name} />
      <div class="AppCard__actions">
        <button><${IconHeart} /></button>
      </div>
    </header>
    <main class="AppCard__main">
      <div class="AppCard__title">${app.name}</div>
      <${HtmlBlock} as="div" html="${description}" />
    </main>
    <footer class="AppCard__content">
      <${Chip}>#${mainCategory || "app"}<//>
      <div class="AppCard__actions">
        ${canUpdate &&
        html`<${Button} primary inverted onClick=${() => installer.update(app)}>
          Update
        <//>`}
        ${appInstalled
          ? html`<${Button}
              primary
              inverted
              onClick=${() => installer.remove(app)}
            >
              Remove
            <//>`
          : html`<${Button} primary inverted
              onClick=${() =>
                app.custom ? customAppPrompt.show() : installer.install(app)}
            >
              Install
            </button>`}
      </div>
    </footer>
    ${installWizardPrompt.isOpen &&
    html`<${PreInstallWizardDialog}
      app=${app}
      onClose=${installWizardPrompt.onClose}
      onConfirm=${installWizardPrompt.onConfirm}
    />`}
    ${appInterfacePrompt.isOpen &&
    html`<${AppInterfaceDialog}
      app=${app}
      onClose=${appInterfacePrompt.onClose}
    />`}
    ${emulatorPrompt.isOpen &&
    html`<${EmulatorDialog} app=${app} onClose=${emulatorPrompt.onClose} />`}
    ${readmePrompt.isOpen &&
    html`<${AppReadmeDialog} app=${app} onClose=${readmePrompt.onClose} />`}
  </article> `;
}
