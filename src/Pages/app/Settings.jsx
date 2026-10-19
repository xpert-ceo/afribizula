import { useState } from "react";
import api from "../../lib/api";
import useAction from "../../lib/useAction";
import { useAuth } from "../../context/AuthContext";
import { COUNTRIES, CURRENCIES } from "../../lib/geo";
import { Alert, Field, PageHeader } from "../../components/app/ui";

export default function Settings() {
  const { session, refresh } = useAuth();
  const b = session.business;
  const act = useAction();
  const [f, setF] = useState({
    name: b.name, country: b.country, currency: b.currency,
    staffSalesTracking: b.settings?.staffSalesTracking || "off",
    lowStockThreshold: String(b.settings?.lowStockThreshold ?? 5),
  });

  const save = (e) => {
    e.preventDefault();
    const t = Number(f.lowStockThreshold);
    if (!Number.isInteger(t) || t < 0) return act.fail("Low-stock threshold must be a whole number of 0 or more");
    act.run(async () => { await api.patch("/business", { ...f, lowStockThreshold: t }); await refresh(); }, "Settings saved");
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Business profile and preferences" />
      <Alert kind={act.msg.kind} onClose={act.clear}>{act.msg.text}</Alert>
      <form className="card stack" style={{ maxWidth: 640 }} onSubmit={save} noValidate>
        <Field label="Business name" error={act.errors.name}><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
        <p className="muted small">Business type: <strong>{b.type}</strong> (set during onboarding)</p>
        <div className="row">
          <Field label="Country" error={act.errors.country}>
            <select className="select" value={f.country} onChange={(e) => setF({ ...f, country: e.target.value })}>
              {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </Field>
          <Field label="Currency" error={act.errors.currency} hint="Existing prices are not converted when you change currency.">
            <select className="select" value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}>
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.code} — {c.name}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Staff sales tracking" error={act.errors.staffSalesTracking}>
          <select className="select" value={f.staffSalesTracking} onChange={(e) => setF({ ...f, staffSalesTracking: e.target.value })}>
            <option value="off">Off — sales are not linked to staff</option>
            <option value="optional">Optional — a staff member can be attached to a sale</option>
            <option value="required">Required — every sale must name a staff member</option>
          </select>
        </Field>
        <Field label="Low-stock alert threshold" error={act.errors.lowStockThreshold}>
          <input className="input" inputMode="numeric" value={f.lowStockThreshold} onChange={(e) => setF({ ...f, lowStockThreshold: e.target.value })} />
        </Field>
        <div><button className="btn btn-primary" disabled={act.busy}>{act.busy ? "Saving…" : "Save settings"}</button></div>
      </form>
    </>
  );
}
