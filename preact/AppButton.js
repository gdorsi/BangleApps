import { html } from "./index.js";

export function AppButton({
  loading,
  title,
  onClick,
}) {
  return html`
    <button
      onClick=${onClick}
    >
      ${loading ? "loading" : title}
    </button>
  `;
}
