import { html } from "./index.js";
import { useEffect, useRef } from "https://cdn.skypack.dev/preact/hooks";
import { Dialog } from "./Dialog.js";

export function CustomAppDialog({ onClose, onConfirm, app }) {
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
