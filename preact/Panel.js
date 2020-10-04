import { html } from "./index.js";

export function Panel({ header, body, children, ...props }) {
  return html`
    <div class="panel" ...${props}>
      <div class="panel-header">
        ${header}
      </div>
      <div class="panel-body columns">${body}</div>
    </div>
  `;
}
