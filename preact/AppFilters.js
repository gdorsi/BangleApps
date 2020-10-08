import { useFilters } from "./useFilters.js";
import { html } from "./index.js";
import { Chip } from "./Chip.js";

export const chips = {
  tags: [
    ["", "Default"],
    ["clock", "Clocks"],
    ["game", "Games"],
    ["tool", "Tools"],
    ["widget", "Widgets"],
    ["bluetooth", "Bluetooth"],
    ["outdoors", "Outdoors"],
  ],
  sort: [
    ["", "None"],
    ["created", "New"],
    ["modified", "Updated"],
  ],
};

export function AppFilters() {
  const filters = useFilters();

  return html`<div style="padding: 18px 24px;">
    <div class="filter-nav" style="display: inline-flex; gap: 0.5rem;">
      ${chips.tags.map(
        ([value, text]) => html`<${Chip}
          key=${value}
          value=${value}
          onClick=${filters.setActive}
          active=${filters.active === value}
          >${text}<//
        >`
      )}
    </div>
    <div class="sort-nav ${!filters.sortInfo ? "hidden" : ""}">
      <span>Sort by:</span>
      ${chips.sort.map(
        ([value, text]) => html`<${Chip}
          key=${value}
          value=${value}
          text=${text}
          onClick=${filters.setSort}
          active=${filters.sort === value}
        />`
      )}
    </div>
  </div>`;
}
