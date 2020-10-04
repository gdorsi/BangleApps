import { html } from "./index.js";


export function Chip({ value, active, text, onClick }) {
  return html`<label
    class="chip ${active ? "active" : ""}"
    onClick=${() => onClick(value)}
    >${text}</label
  >`;
}
