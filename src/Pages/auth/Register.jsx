import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { User, Mail, Lock, Ticket } from "lucide-react";
import Button from "../../components/ui/Button";
import AuthLayout from "../../components/auth/AuthLayout";
import AuthInput from "../../components/auth/AuthInput";
import { useAuth, homeFor } from "../../context/AuthContext";
import api, { errorMessage, fieldErrors } from "../../lib/api";

const REF_KEY = "bizula_ref";

function validate(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = "Enter your full name";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) e.email = "Enter a valid email address";
  if (f.password.length < 8 || !/[A-Za-z]/.test(f.password) || !/\d/.test(f.password))
    e.password = "At least 8 characters, with a letter and a number";
  if (f.confirm !== f.password) e.confirm = "Passwords do not match";
  return e;
}

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const urlRef = (params.get("ref") || "").toUpperCase();
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirm: "",
    accountType: params.get("type") === "ambassador" ? "ambassador" : "business",
    referralCode: urlRef || sessionStorage.getItem(REF_KEY) || "",
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [refStatus, setRefStatus] = useState(null); // null | "valid" | "invalid"
  const [submitting, setSubmitting] = useState(false);

  // Keep a referral code from the link for this browser session (attribution happens only at signup).
  useEffect(() => { if (urlRef) sessionStorage.setItem(REF_KEY, urlRef); }, [urlRef]);

  const code = form.referralCode.trim();
  useEffect(() => {
    if (!code || form.accountType !== "business") return undefined;
    let alive = true;
    const t = setTimeout(() => {
      api.get(`/public/referral-codes/${encodeURIComponent(code)}`)
        .then((r) => alive && setRefStatus(r.data.valid ? "valid" : "invalid"))
        .catch(() => alive && setRefStatus(null));
    }, 350);
    return () => { alive = false; clearTimeout(t); };
  }, [code, form.accountType]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const v = validate(form);
    setErrors(v);
    if (Object.keys(v).length) return;
    setSubmitting(true);
    try {
      const session = await register({
        name: form.name.trim(), email: form.email.trim(), password: form.password, accountType: form.accountType,
        ...(form.accountType === "business" && code ? { referralCode: code } : {}),
      });
      sessionStorage.removeItem(REF_KEY);
      navigate(homeFor(session), { replace: true });
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const isAmb = form.accountType === "ambassador";
  return (
    <AuthLayout badge="Join Bizula" title={["Start.", "Build.", "Scale.", "Succeed."]}
      subtitle={isAmb
        ? "Apply to become a Bizula ambassador. Once the Bizula team approves your application you will receive a referral link to share."
        : "Create your Bizula account, set up your business in a few guided steps, and start managing inventory, staff and sales."}
      cardTitle="Create Account">
      <form className="form-group" onSubmit={onSubmit} noValidate>
        <div className="account-type" role="radiogroup" aria-label="Account type">
          <button type="button" role="radio" aria-checked={!isAmb} className={!isAmb ? "on" : ""}
            onClick={() => setForm({ ...form, accountType: "business" })}>
            Business owner<small>Run your business on Bizula</small>
          </button>
          <button type="button" role="radio" aria-checked={isAmb} className={isAmb ? "on" : ""}
            onClick={() => setForm({ ...form, accountType: "ambassador" })}>
            Ambassador<small>Refer businesses to Bizula</small>
          </button>
        </div>
        {error && <div className="form-alert error" role="alert">{error}</div>}
        <AuthInput icon={User} placeholder="Full Name" autoComplete="name" value={form.name} onChange={set("name")} error={errors.name} />
        <AuthInput icon={Mail} type="email" placeholder="Email Address" autoComplete="email" value={form.email} onChange={set("email")} error={errors.email} />
        <AuthInput icon={Lock} type="password" placeholder="Password" autoComplete="new-password" value={form.password} onChange={set("password")} error={errors.password} />
        <AuthInput icon={Lock} type="password" placeholder="Confirm Password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} error={errors.confirm} />
        {!isAmb && (
          <>
            <AuthInput icon={Ticket} placeholder="Referral code (optional)" value={form.referralCode}
              onChange={(e) => { setRefStatus(null); setForm({ ...form, referralCode: e.target.value.toUpperCase() }); }}
              error={errors.referralCode || (code && refStatus === "invalid" ? "This referral code is not valid or not active" : "")} />
            {code && refStatus === "valid" && <div className="form-alert success">Referral code applied.</div>}
          </>
        )}
        <Button type="submit" disabled={submitting}>{submitting ? "Creating account…" : isAmb ? "Apply as Ambassador" : "Create Account"}</Button>
        <p className="bottom-text">Already have an account? <Link to="/login" className="purple-link">Sign In</Link></p>
      </form>
    </AuthLayout>
  );
};

export default Register;
