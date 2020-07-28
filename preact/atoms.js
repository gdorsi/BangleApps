import {
  useReducer,
  useLayoutEffect,
} from "https://cdn.skypack.dev/preact/hooks";

//TODO add an optional context provider in order to support SSR
export function createStateAtom(init, effect) {
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
          cleanup = effect(state);
        });
      });
  }

  //triggers the effects on startup
  setState(init);

  return atom;
}

export function createAsyncAtom(fetcher, effect) {
  const atom = createStateAtom({ init: true }, effect);

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
}

export function useAtom(atom) {
  const [, forceRender] = useReducer((state) => !state, 0);

  useLayoutEffect(() => {
    atom.add(forceRender);

    return () => atom.remove(forceRender);
  }, []);

  return [atom.state, atom.setState];
}

export function useSetAtomState(atom) {
  return atom.setState;
}

export function useAtomValue(atom) {
  return useAtom(atom)[0];
}
