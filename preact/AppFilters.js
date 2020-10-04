import { useFilters } from "./useFilters.js";
import { useDebouncedInput } from "./useDebouncedInput.js";
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

  /**
   * The app list update is an operation that sometimes
   * runs over the 60FPS time budget
   *
   * That's why we reduce the list update operations by
   * debouncing the searchInput handler
   */
  const searchInput = useDebouncedInput((value) => {
    filters.setSearch(value.toLowerCase()); //TODO move the normalization inside the useFilters hook
  });

  return html`<div>
    <div>
      <input
        class="form-input"
        type="text"
        placeholder="Keywords..."
        ...${searchInput}
      />
    </div>
    <div>
      <div class="filter-nav">
        ${chips.tags.map(
    ([value, text]) => html`<${Chip}
              key=${value}
              value=${value}
              text=${text}
              onClick=${filters.setActive}
              active=${filters.active === value}
            />`
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
    </div>
  </div>`;
}
