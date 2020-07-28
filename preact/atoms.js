import { h, createContext } from "https://cdn.skypack.dev/preact";
import {
  useContext,
  useMemo,
  useReducer,
  useLayoutEffect,
} from "https://cdn.skypack.dev/preact/hooks";

//find a better name
function makeAtomsState() {
  const atomsMap = new WeakMap();

  function getAtom(atomRef) {
    let atom = atomsMap.get(atomRef);

    if (!atom) {
      atom = atomRef(atomsState);
      atomsMap.set(atomRef, atom);
    }

    return atom;
  }

  const atomsState = {
    getAtom,
    get(atomRef) {
      return getAtom(atomRef).state;
    },
    set(atomRef, state) {
      getAtom(atomRef).setState(state);
    },
  };

  return atomsState;
}

const ctx = createContext(makeAtomsState());

export function AtomsState({ children }) {
  return h(ctx.Provider, { value: useMemo(makeAtomsState, []) }, children);
}

export function useAtomsState() {
  return useContext(ctx);
}

export function createStateAtom(init, effect) {
  return function (atomsState) {
    const listeners = new Set();
    let cleanup;

    const atom = {
      add: listeners.add.bind(listeners),
      remove: listeners.delete.bind(listeners),
      state: null,
      setState,
    };

    function setState(state) {
      if (typeof state === "function") {
        state = state(atom.state);
      }

      if (state === atom.state) return;

      atom.state = state;
      listeners.forEach((cb) => cb(state));

      effect &&
        requestAnimationFrame(() => {
          queueMicrotask(() => {
            cleanup && cleanup();
            cleanup = effect(state, atomsState);
          });
        });
    }

    //triggers the effects on startup
    setState(init);

    return atom;
  };
}

export function createAsyncAtom(fetcher, effect) {
  return function (atomsState) {
    const atom = createStateAtom({ init: true }, effect)(atomsState);

    const setState = atom.setState;

    let promise;

    function fetch(value) {
      if (typeof value === "function") {
        value = value(atom.state);
      }

      const current = (promise = fetcher(value));

      current
        .then((data) => {
          if (current === promise) {
            setState({ data });
          }
        })
        .catch((error) => {
          if (current === promise) {
            setState({ data: atom.state.data, error });
          }
        });
    }

    atom.setState = fetch;

    return atom;
  };
}

export function useAtom(atomRef) {
  const atom = useAtomsState().getAtom(atomRef);
  const [, forceRender] = useReducer((state) => !state, 0);

  useLayoutEffect(() => {
    atom.add(forceRender);

    return () => atom.remove(forceRender);
  }, []);

  return [atom.state, atom.setState];
}

export function useSetAtomState(atomRef) {
  return useAtomsState().getAtom(atomRef).setState;
}

export function useAtomValue(atomRef) {
  return useAtom(atomRef)[0];
}
