import {
  useRef,
  useState
} from "https://cdn.skypack.dev/preact/hooks";

export function useDebouncedInput(onChange, initialValue) {
  const [value, setValue] = useState(initialValue || "");

  const timeout = useRef();

  function handleInput(evt) {
    const value = evt.target.value;

    setValue(value);

    clearTimeout(timeout.current);
    timeout.current = setTimeout(() => onChange(value), 100);
  }

  return {
    onInput: handleInput,
    value,
  };
}
