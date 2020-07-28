import { html } from "./index.js";
import marked from "https://cdn.skypack.dev/marked";
import { useEffect, useState } from "https://cdn.skypack.dev/preact/hooks";
import { Dialog } from "./Dialog.js";
import { HtmlBlock } from "./HtmlBlock.js";

export function ReadmeDialog({ onClose, app }) {
  const [contents, setContents] = useState(null);

  const appPath = `apps/${app.id}/`;

  useEffect(() => {
    fetch(appPath + app.readme)
      .then((res) => (res.ok ? res.text() : Promise.reject()))
      .then((text) => setContents(marked(text, { baseUrl: appPath })))
      .catch(() => {
        setContents("Failed to load README.");
      });
  }, []);

  if (contents === null) return null;

  return html`
    <${Dialog}
      onClose=${onClose}
      header=${app.name}
      body=${html`<${HtmlBlock} html=${contents} />`}
    />
  `;
}
