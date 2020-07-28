import { html } from "./index.js";
import { createPortal } from "https://cdn.skypack.dev/preact/compat";
import {
  useEffect,
  useRef,
  useState,
} from "https://cdn.skypack.dev/preact/hooks";

function getFocusableElements(el) {
  return el.querySelectorAll(
    'a[href], area[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [tabindex="0"]'
  );
}

export function Dialog({ header, body, footer, onClose }) {
  const container = document.getElementById("modals");

  function handleClose(evt) {
    evt.preventDefault();
    onClose();
  }

  useEffect(() => {
    const upHandler = ({ code, which }) => {
      if (code === "Escape" || which === 27) {
        onClose();
      }
    };

    addEventListener("keyup", upHandler);

    return () => {
      removeEventListener("keyup", upHandler);
    };
  }, [onClose]);

  const ref = useRef();

  useEffect(() => {
    const focusedElBeforeOpen = document.activeElement;

    const focusableElements = getFocusableElements(
      ref.current.querySelector(".modal-container")
    );

    //The close button is focused only when it is the only focusable element
    const focusedEl = focusableElements[1] || focusableElements[0];

    focusedEl.focus();

    return () => {
      focusedElBeforeOpen && focusedElBeforeOpen.focus();
    };
  }, []);

  useEffect(() => {
    const focusTrap = (evt) => {
      const { code, which, shiftKey } = evt;

      if (code !== "Tab" && which !== 9) return;

      const focusableElements = getFocusableElements(
        ref.current.querySelector(".modal-container")
      );

      if (focusableElements.length === 1) {
        evt.preventDefault();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (shiftKey) {
        if (document.activeElement === first) {
          evt.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          evt.preventDefault();
          first.focus();
        }
      }
    };

    addEventListener("keydown", focusTrap);

    return () => {
      removeEventListener("keydown", focusTrap);
    };
  }, []);

  return createPortal(
    html`
      <div role="dialog" class="modal active" ref=${ref}>
        <a
          href="#close"
          class="modal-overlay"
          aria-label="Close"
          onClick=${handleClose}
        ></a>
        <div class="modal-container">
          <div class="modal-header">
            <a
              href="#close"
              class="btn btn-clear float-right"
              aria-label="Close"
              onClick=${handleClose}
            ></a>
            ${header}
          </div>
          <div class="modal-body">
            ${body}
          </div>
          ${footer &&
          html`
            <div class="modal-footer">
              ${footer}
            </div>
          `}
        </div>
      </div>
    `,
    container
  );
}

export function Confirm({ header, body, onConfirm, onClose }) {
  return html`
    <${Dialog}
      header=${header}
      body=${body}
      onClose=${onClose}
      footer=${html`
        <button class="btn btn-primary" onClick=${onConfirm}>Yes</button>
        <button class="btn" onClick=${onClose}>No</button>
      `}
    />
  `;
}

export function usePrompt(onConfirm) {
  const [isOpen, setOpen] = useState(false);

  function show() {
    setOpen(true);
  }

  function handleConfirm(...args) {
    onConfirm && onConfirm(...args);
    setOpen(false);
  }

  function handleClose() {
    setOpen(false);
  }

  return {
    show,
    onConfirm: handleConfirm,
    onClose: handleClose,
    isOpen,
  };
}
