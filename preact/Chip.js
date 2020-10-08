import { html } from "./index.js";

export function Chip({ value, active, children, onClick }) {
  return html`<button
    class="Chip ${active ? "Chip--active" : ""}"
    onClick=${() => onClick && onClick(value)}
    >${children}</button
  >`;
}
