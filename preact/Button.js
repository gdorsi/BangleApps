import { html } from "./index.js";

export function Button({
  primary,
  active,
  light,
  rounded,
  label,
  onClick,
  children,
}) {
  const classes = [
    'Button',
    primary && "Button--primary",
    rounded && "Button--rounded",
    active && "Button--active",
    light && "Button--light",
  ].filter(Boolean).join(' ');

  return html`<button
    class=${classes}
    aria-label="${label}"
    onClick=${onClick}
  >
    ${children}
  </button>`;
}
