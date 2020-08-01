import { html } from "./index.js";
import { createPortal } from "https://cdn.skypack.dev/preact/compat";
import { useEffect } from "https://cdn.skypack.dev/preact/hooks";
import { createStateAtom, useStateAtom, useAtomSetState } from "./atoms.js";

export const progressBarAtom = createStateAtom({ visible: false });

export function useProgressBar() {
  const setState = useAtomSetState(progressBarAtom);

  function show(text) {
    setState({ text, visible: true });
  }

  function hide() {
    setState({ visible: false });
  }

  return { show, hide };
}

export function ProgressBar() {
  const [state, setState] = useStateAtom(progressBarAtom);

  useEffect(() => {
    if (!state) return;

    /// Add progress handler so we get nice uploads
    Puck.writeProgress = function (charsSent, charsTotal) {
      if (charsSent === undefined) {
        setState({ visible: false });
        return;
      }

      const percent = Math.round((charsSent * 100) / charsTotal);

      setState((state) => ({ ...state, percent }));
    };

    return () => {
      Puck.writeProgress = null;
    };
  }, [state]);

  if (state.visible === false) return null;

  return createPortal(
    html`<div class="toast">
      ${state.text ? `<div>${state.text}</div>` : ``}
      <div class="bar bar-sm">
        <div
          class="bar-item"
          role="progressbar"
          style="width:${percent}%;"
          aria-valuenow="${percent}"
          aria-valuemin="0"
          aria-valuemax="100"
        ></div>
      </div>
    </div>`,
    document.getElementById("toastcontainer")
  );
}
