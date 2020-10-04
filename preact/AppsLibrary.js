import { AppList } from "./AppList.js";
import { AppFilters } from "./AppFilters.js";
import { Panel } from "./Panel.js";
import { html } from "./index.js";

export function AppsLibrary() {
  return html`<${Panel}
    header=${html`<${AppFilters} />`}
    body=${html`<${AppList} />`}
  />`;
}
