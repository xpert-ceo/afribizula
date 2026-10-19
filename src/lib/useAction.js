import { useCallback, useState } from "react";
import { errorMessage, fieldErrors } from "./api";

/**
 * Wraps a mutating API call with busy / success / error state.
 * `success` may be a string or a function receiving the call's return value
 * (return a falsy value to show no message).
 */
export default function useAction() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ kind: "", text: "" });
  const [errors, setErrors] = useState({});
  const run = useCallback(async (fn, success) => {
    setBusy(true); setMsg({ kind: "", text: "" }); setErrors({});
    try {
      const result = await fn();
      const text = typeof success === "function" ? success(result) : success;
      if (text) setMsg({ kind: "success", text });
      return true;
    } catch (e) {
      setErrors(fieldErrors(e));
      setMsg({ kind: "error", text: errorMessage(e) });
      return false;
    } finally {
      setBusy(false);
    }
  }, []);
  const fail = useCallback((text) => setMsg({ kind: "error", text }), []);
  const clear = useCallback(() => setMsg({ kind: "", text: "" }), []);
  return { busy, msg, errors, run, fail, clear };
}
