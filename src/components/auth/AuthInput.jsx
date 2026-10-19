import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function AuthInput({ icon: Icon, type = "text", error, ...props }) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <>
      <div className={`input-wrap ${error ? "invalid" : ""}`}>
        {Icon && <Icon size={18} />}
        <input type={isPassword && show ? "text" : type} aria-invalid={Boolean(error)} aria-label={props.placeholder} {...props} />
        {isPassword && (
          <button type="button" className="eye-btn" onClick={() => setShow(!show)} aria-label={show ? "Hide password" : "Show password"}>
            {show ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {error && <div className="field-error">{error}</div>}
    </>
  );
}
