import { html } from "./index.js";

export function Button({
  primary,
  inverted,
  rounded,
  label,
  onClick,
  children,
}) {
  const classes = [
    'Button',
    primary ? (inverted ? "Button--primary-inverted" : "Button--primary") : "",
    rounded && "Button--rounded",
  ].filter(Boolean).join(' ');

  return html`<button
    class=${classes}
    aria-label="${label}"
    onClick=${onClick}
  >
    ${children}
  </button>`;
}
