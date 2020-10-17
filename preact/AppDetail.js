import { html } from "./index.js";
import { useEffect, useRef } from "https://cdn.skypack.dev/preact/hooks";
import { Dialog } from "./Dialog.js";

export function AppDetail({ onClose, app }) {
  const body = html`<iframe
    src="apps/${app.id}/${app.custom}"
    style="width:100%;min-height:50vh;border:0px;"
    ref=${ref}
  ></iframe>`;

  return html`
    <${Dialog} onClose=${onClose} header=${app.name} body=${body} />
  `;
}
