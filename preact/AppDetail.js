import { PreInstallWizardDialog } from "./PreInstallWizardDialog.js";
import { usePrompt } from "./Dialog.js";
import { EmulatorDialog } from "./Emulator.js";
import { AppReadmeDialog } from "./AppReadme.js";
import { AppInterfaceDialog } from "./AppInterface.js";
import { HtmlBlock } from "./HtmlBlock.js";
import { useAppInstaller } from "./useAppInstaller.js";
import { html } from "./preact.js";
import { Chip } from "./Chip.js";
import { Button } from "./Button.js";
import { IconHeart } from "./Icons.js";
import { Dialog } from "./Dialog.js";

export function AppDetail({ onClose, app }) {
  const installer = useAppInstaller();

  const installWizardPrompt = usePrompt(installer.install);
  const appInterfacePrompt = usePrompt();
  const emulatorPrompt = usePrompt();
  const readmePrompt = usePrompt();
  const detailDialog = usePrompt();

  const { description, mainCategory, avatar, canUpdate, appInstalled } = app;

  const body = html`<article class="AppCard">
    <header class="AppCard__content" onClick=${detailDialog.show}>
      <img class="AppCard__avatar" src=${avatar} alt=${app.name} />
      <div class="AppCard__actions">
        <button><${IconHeart} /></button>
      </div>
    </header>
    <main class="AppCard__main" onClick=${detailDialog.show}>
      <div class="AppCard__title">${app.name}</div>
      <${HtmlBlock} as="div" html="${description}" />
    </main>
    <footer class="AppCard__content">
      <${Chip}>#${mainCategory}<//>
      <div class="AppCard__actions">
        ${canUpdate &&
        html`<${Button} active onClick=${() => installer.update(app)}>
          Update
        <//>`}
        ${appInstalled
          ? html`<${Button}
              active
              onClick=${() => installer.remove(app)}
            >
              Remove
            <//>`
          : html`<${Button} active
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
    ${detailDialog.isOpen &&
    html`<${AppDetail} app=${app} onClose=${detailDialog.onClose} />`}
  </article> `;

  return html`
    <${Dialog} onClose=${onClose} header=${app.name} body=${body} />
  `;
}
