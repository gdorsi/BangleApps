import { createDataAtom, useAtomValue } from "./atoms.js";
import { toastAtom } from "./Toast.js";

const appListAtom = createDataAtom(
  () => fetch("apps.json").then((res) => res.ok ? res.json() : Promise.reject(res)
  ),
  ({ error, init, fetchData }, use) => {
    const toast = use(toastAtom);

    if (init) {
      fetchData();
    }

    if (error) {
      if (error.message) {
        toast.setState({
          msg: `${error.toString()} on apps.json`,
          type: "error",
        });
      } else {
        toast.setState({
          msg: "Error during the fetch of apps.json",
          type: "error",
        });
      }
    }
  }
);

export const useAppList = () => useAtomValue(appListAtom);
