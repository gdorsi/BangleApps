import { html } from "./index.js";
import { createPortal } from "https://cdn.skypack.dev/preact/compat";
import { useEffect } from "https://cdn.skypack.dev/preact/hooks";
import { createStateAtom, useAtom, useSetAtomState } from "./atoms.js";

const toastAtom = createStateAtom();

export function useToast() {
  const setState = useSetAtomState(toastAtom);

  function show(msg, type) {
    setState({
      msg,
      type,
    });
  }

  return { show };
}

export function Toast() {
  const [state, setState] = useAtom(toastAtom);

  useEffect(() => {
    const timer = setTimeout(() => setState(null), 5000);

    return () => clearTimeout(timer);
  }, [state]);

  if (!state) return null;

  const { msg, type = "primary" } = state;

  if (!["success", "error", "warning", "primary"].includes(type)) {
    console.log("showToast: unknown toast " + type);
  }

  return createPortal(
    html`<div class="toast toast-${type}">${msg}</div>`,
    document.getElementById("toastcontainer")
  );
}
