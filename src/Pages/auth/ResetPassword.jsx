import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Lock } from "lucide-react";
import Button from "../../components/ui/Button";
import AuthLayout from "../../components/auth/AuthLayout";
import AuthInput from "../../components/auth/AuthInput";
import api, { errorMessage, fieldErrors } from "../../lib/api";

const ResetPassword = () => {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    const v = {};
    if (password.length < 8 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) v.password = "At least 8 characters, with a letter and a number";
    if (confirm !== password) v.confirm = "Passwords do not match";
    setErrors(v);
    if (Object.keys(v).length) return;
    setSubmitting(true);
    setError("");
    try {
      const { data } = await api.post("/auth/reset-password", { token, password });
      navigate("/login", { replace: true, state: { message: data.message } });
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout badge="Account Recovery" title={["New.", "Password."]} subtitle="Choose a new password for your Bizula account." cardTitle="Set New Password">
      {!token ? (
        <div className="form-group">
          <div className="form-alert error">This reset link is missing its token. Request a new link.</div>
          <Link to="/forgot-password" className="purple-link">Request a new link</Link>
        </div>
      ) : (
        <form className="form-group" onSubmit={onSubmit} noValidate>
          {error && <div className="form-alert error" role="alert">{error}</div>}
          <AuthInput icon={Lock} type="password" placeholder="New Password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} error={errors.password} />
          <AuthInput icon={Lock} type="password" placeholder="Confirm New Password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} error={errors.confirm} />
          <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Reset Password"}</Button>
          <p className="bottom-text"><Link to="/login" className="purple-link">Back To Login</Link></p>
        </form>
      )}
    </AuthLayout>
  );
};

export default ResetPassword;
