import htm from "https://cdn.skypack.dev/htm";
import { h, render } from "https://cdn.skypack.dev/preact";
import { useState } from "https://cdn.skypack.dev/preact/hooks";
import { Toast } from "./Toast.js";
import { HttpsBanner } from "./HttpsBanner.js";
import { ProgressBar } from "./ProgressBar.js";
import { InstallPrompt } from "./InstallPrompt.js";
import { AppsLibrary } from "./AppsLibrary.js";
import { InstalledApps } from "./InstalledApps.js";
import { About } from "./About.js";
import { Header } from "./Header.js";

export const html = htm.bind(h);

const tabs = [
  ["library", "Library"],
  ["myapps", "My Apps"],
  ["about", "About"],
];

function Main() {
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
    <div class="container" id="toastcontainer">
      <${Toast} />
      <${ProgressBar} />
    </div>
    <div class="container bangle-tab">
      ${activeTab === "library"
        ? html`<${AppsLibrary} />`
        : activeTab === "myapps"
        ? html`<${InstalledApps} />`
        : html`<${About} />`}
    </div>
    <${InstallPrompt} />`;
}

render(html`<${Main} />`, document.querySelector("#root"));
