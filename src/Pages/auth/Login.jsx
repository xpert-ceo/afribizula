import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import Button from "../../components/ui/Button";
import AuthLayout from "../../components/auth/AuthLayout";
import AuthInput from "../../components/auth/AuthInput";
import { useAuth, homeFor } from "../../context/AuthContext";
import { errorMessage } from "../../lib/api";

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) return setError("Enter your email and password.");
    setSubmitting(true);
    try {
      const session = await login(email.trim(), password);
      const from = location.state?.from;
      const home = homeFor(session);
      navigate(from && from.startsWith(home) ? from : home, { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout badge="Welcome Back" title={["Build.", "Sell.", "Deliver.", "Grow."]}
      subtitle="The operating system for African businesses." cardTitle="Sign In">
      <form className="form-group" onSubmit={handleLogin} noValidate>
        {location.state?.message && <div className="form-alert success">{location.state.message}</div>}
        {error && <div className="form-alert error" role="alert">{error}</div>}
        <AuthInput icon={Mail} type="email" placeholder="Email Address" autoComplete="email"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <AuthInput icon={Lock} type="password" placeholder="Password" autoComplete="current-password"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <Button type="submit" disabled={submitting}>{submitting ? "Signing in…" : "Sign In"}</Button>
        <Link to="/forgot-password" className="auth-link">Forgot Password?</Link>
        <p className="bottom-text">
          Don&apos;t have an account? <Link to="/register" className="purple-link">Register</Link>
        </p>
      </form>
    </AuthLayout>
  );
};

export default Login;
