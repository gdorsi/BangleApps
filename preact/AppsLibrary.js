import { AppList } from "./AppList.js";
import { AppFilters } from "./AppFilters.js";
import { html } from "./index.js";

export function AppsLibrary() {
  return html`<${AppFilters} /><${AppList} />`;
}
