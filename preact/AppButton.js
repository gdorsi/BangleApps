import { html } from "./index.js";

export function AppButton({
  class: className = "",
  iconName = "",
  loading,
  title,
  onClick,
  children,
}) {
  return html`
    <button
      class="btn btn-link btn-action btn-lg ${className}"
      title=${title}
      onClick=${onClick}
    >
      <i class="icon ${loading ? "loading" : iconName}"></i>
      ${children}
    </button>
  `;
}
