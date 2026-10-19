import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail } from "lucide-react";
import Button from "../../components/ui/Button";
import AuthLayout from "../../components/auth/AuthLayout";
import AuthInput from "../../components/auth/AuthInput";
import api, { errorMessage } from "../../lib/api";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [state, setState] = useState({ kind: "", message: "" });
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()))
      return setState({ kind: "error", message: "Enter a valid email address." });
    setSubmitting(true);
    setState({ kind: "", message: "" });
    try {
      const { data } = await api.post("/auth/forgot-password", { email: email.trim() });
      setState({ kind: "success", message: data.message });
    } catch (err) {
      // 503 = email delivery not configured on the server: say so honestly.
      setState({ kind: err.response?.status === 503 ? "info" : "error", message: errorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout badge="Account Recovery" title={["Reset.", "Return.", "Resume."]}
      subtitle="Enter the email address on your Bizula account and we will email you a link to set a new password."
      cardTitle="Reset Password">
      <form className="form-group" onSubmit={onSubmit} noValidate>
        {state.message && <div className={`form-alert ${state.kind}`} role="status">{state.message}</div>}
        <AuthInput icon={Mail} type="email" placeholder="Email Address" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button type="submit" disabled={submitting}>{submitting ? "Sending…" : "Send Reset Link"}</Button>
        <p className="bottom-text"><Link to="/login" className="purple-link">Back To Login</Link></p>
      </form>
    </AuthLayout>
  );
};

export default ForgotPassword;
