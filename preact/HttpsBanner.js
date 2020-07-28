import { html } from "./index.js";

export function HttpsBanner() {
  if (location.href.startsWith("https") ||
    location.href.startsWith("http://localhost"))
    return null;

  return html`<div class="container" style="padding-top:4px">
    <p>
      <b>STOP!</b> This page <b>must</b> be served over HTTPS. Please
      <a
        href="#https"
        onClick=${() => {
      location.href = location.href.replace(`http://`, "https://");
    }}
        >reload this page via HTTPS</a
      >.
    </p>
  </div>`;
}
