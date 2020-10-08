import { html } from "./index.js";

export function Panel({ header, body, children, ...props }) {
  return html`
    <div ...${props}>
      <div>
        ${header}
      </div>
      <div>${body}</div>
    </div>
  `;
}
