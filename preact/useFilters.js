import {
  useStateAtom,
  useAtomValue,
  createStateAtom,
  createDataAtom,
} from "./atoms.js";
import { toastAtom } from "./Toast.js";

export const activeCategoryAtom = createStateAtom("");
export const sortAtom = createStateAtom("");
export const searchAtom = createStateAtom("");
export const sortInfoAtom = createDataAtom(
  () =>
    fetch("appdates.csv")
      .then((res) => (res.ok ? res.text() : Promise.reject(res)))
      .then((csv) => {
        const appSortInfo = {};

        csv.split("\n").forEach((line) => {
          let l = line.split(",");
          appSortInfo[l[0]] = {
            created: Date.parse(l[1]),
            modified: Date.parse(l[2]),
          };
        });

        return appSortInfo;
      }),
  ({ error, init, fetchData }, use) => {
    const toast = use(toastAtom);

    if (init) {
      fetchData();
    }

    if (error) {
      toast.setState({
        msg: "No recent.csv - app sort disabled",
      });
    }
  }
);

export const useFilters = () => {
  const [active, setActive] = useStateAtom(activeCategoryAtom);
  const [sort, setSort] = useStateAtom(sortAtom);
  const { data: sortInfo } = useAtomValue(sortInfoAtom);
  const [search, setSearch] = useStateAtom(searchAtom);

  return {
    active,
    setActive,
    sort,
    setSort,
    sortInfo,
    search,
    setSearch,
  };
};
