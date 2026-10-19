import { useCallback, useEffect, useState } from "react";
import api, { errorMessage } from "./api";

/** GET `path` and expose { data, loading, error, reload }. Pass null to skip. */
export default function useFetch(path) {
  const [state, setState] = useState({ data: null, loading: Boolean(path), error: "" });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!path) return undefined;
    let alive = true;
    api
      .get(path)
      .then((r) => alive && setState({ data: r.data, loading: false, error: "" }))
      .catch((e) => alive && setState({ data: null, loading: false, error: errorMessage(e) }));
    return () => { alive = false; };
  }, [path, nonce]);

  const reload = useCallback(() => {
    setState((s) => ({ ...s, loading: true }));
    setNonce((n) => n + 1);
  }, []);

  return { ...state, reload };
}
