import { h } from "https://cdn.skypack.dev/preact";

export function HtmlBlock({ as = "span", html, ...props }) {
  return h(as, {
    dangerouslySetInnerHTML: {
      __html: html,
    },
    ...props,
  });
}
