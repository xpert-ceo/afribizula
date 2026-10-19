import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api, { errorMessage, fieldErrors } from "../lib/api";
import { COUNTRIES, CURRENCIES, DEFAULT_CURRENCY } from "../lib/geo";
import { Alert, Field } from "../components/app/ui";
import "../styles/app.css";

const TRACKING = [
  ["off", "Off", "Sales are not linked to staff members."],
  ["optional", "Optional", "A staff member can be attached to a sale."],
  ["required", "Required", "Every sale must be attributed to a staff member."],
];

export default function Onboarding() {
  const { session, applySession, logout } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", type: "", country: "NG", currency: "NGN", staffSalesTracking: "off" });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  if (session.user.onboardingCompleted && step < 3) return <Navigate to="/app" replace />;

  const next = () => {
    const e = {};
    if (step === 0) {
      if (form.name.trim().length < 2) e.name = "Enter your business name";
      if (!form.type) e.type = "Choose what kind of business you run";
    }
    setErrors(e);
    if (!Object.keys(e).length) setStep(step + 1);
  };

  const submit = async () => {
    setSaving(true);
    setError("");
    try {
      const { data } = await api.post("/business/onboarding", { ...form, name: form.name.trim() });
      applySession(data);
      setStep(3);
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors(fe);
      setError(errorMessage(err));
      if (fe.name || fe.type) setStep(0);
      else if (fe.country || fe.currency) setStep(1);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#f7f7f8" }}>
      <div className="onboarding">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <a href="/" className="brand" style={{ fontSize: "1.5rem", fontWeight: 600, color: "#0A0A0A", textDecoration: "none" }}>
            <span style={{ color: "#7C3AED" }}>b</span>izula
          </a>
          <button type="button" className="link-btn" onClick={() => { logout(); navigate("/login"); }}>Sign out</button>
        </div>
        <div className="steps" aria-label={`Step ${step + 1} of 4`}>
          {[0, 1, 2, 3].map((i) => <span key={i} className={i <= step ? "on" : ""} />)}
        </div>
        <div className="card stack">
          <Alert kind="error">{error}</Alert>

          {step === 0 && (
            <>
              <div><h1 style={{ fontSize: "1.5rem" }}>Welcome, {session.user.name?.split(" ")[0]}</h1>
                <p className="muted">Let&apos;s set up your business. This takes about a minute.</p></div>
              <Field label="Business name" error={errors.name}>
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Amaka Pharmacy" autoFocus />
              </Field>
              <div className="field">
                <span className="label">What kind of business is it?</span>
                <div className="choice">
                  <button type="button" className={form.type === "retail" ? "selected" : ""} onClick={() => setForm({ ...form, type: "retail" })}>
                    <strong>Retail</strong><span className="muted small">Shops, pharmacies, supermarkets — physical products with stock.</span>
                  </button>
                  <button type="button" className={form.type === "service" ? "selected" : ""} onClick={() => setForm({ ...form, type: "service" })}>
                    <strong>Service</strong><span className="muted small">Salons, clinics, agencies — services without stock.</span>
                  </button>
                </div>
                {errors.type && <span className="error-text">{errors.type}</span>}
              </div>
              <div className="row" style={{ justifyContent: "flex-end" }}><button type="button" className="btn btn-primary" onClick={next}>Continue</button></div>
            </>
          )}

          {step === 1 && (
            <>
              <div><h2>Where do you operate?</h2><p className="muted">Used for prices and receipts. You can change this later in Settings.</p></div>
              <Field label="Country" error={errors.country}>
                <select className="select" value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value, currency: DEFAULT_CURRENCY[e.target.value] || form.currency })}>
                  {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Currency" error={errors.currency}>
                <select className="select" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
                </select>
              </Field>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setStep(0)}>Back</button>
                <button type="button" className="btn btn-primary" onClick={next}>Continue</button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div><h2>Staff sales tracking</h2><p className="muted">Do you want to know which staff member made each sale?</p></div>
              <div className="stack" role="radiogroup">
                {TRACKING.map(([value, label, desc]) => (
                  <label key={value} className="card" style={{ display: "flex", gap: ".75rem", cursor: "pointer", padding: ".9rem", borderColor: form.staffSalesTracking === value ? "#7C3AED" : undefined }}>
                    <input type="radio" name="tracking" checked={form.staffSalesTracking === value} onChange={() => setForm({ ...form, staffSalesTracking: value })} />
                    <span><strong>{label}</strong><br /><span className="muted small">{desc}</span></span>
                  </label>
                ))}
              </div>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setStep(1)}>Back</button>
                <button type="button" className="btn btn-accent" onClick={submit} disabled={saving}>{saving ? "Saving…" : "Finish setup"}</button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <Alert kind="success">{session.business?.name} is set up.</Alert>
              <h2>Your next steps</h2>
              <ol className="stack" style={{ paddingLeft: "1.2rem" }}>
                <li><strong>Build your catalogue.</strong> Create a department (e.g. “Groceries”), a category inside it (e.g. “Beverages”), then add {session.business?.type === "service" ? "your services" : "products with prices and opening stock"}.</li>
                {form.staffSalesTracking !== "off" && <li><strong>Add staff</strong> so sales can be attributed to them.</li>}
                <li><strong>Record your first sale.</strong> Stock and totals update automatically.</li>
                <li><strong>Choose a subscription plan</strong> from the Subscription page.</li>
              </ol>
              <div className="row">
                <Link className="btn btn-primary" to="/app/inventory">Set up inventory</Link>
                <Link className="btn btn-secondary" to="/app">Go to dashboard</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
