import { useState } from "react";
import api from "../../lib/api";
import useFetch from "../../lib/useFetch";
import useAction from "../../lib/useAction";
import { describePolicy } from "../../lib/policy";
import { fromMinor, toMinor } from "../../lib/format";
import { Alert, Field, Loader, PageHeader } from "../../components/app/ui";

function PolicyForm({ policy, onSaved }) {
  const act = useAction();
  const [f, setF] = useState({
    type: policy?.type || "percent",
    value: policy ? (policy.type === "fixed" ? fromMinor(policy.value, "NGN") : String(policy.value)) : "",
    basis: policy?.basis || "first_payment",
  });

  const save = (e) => {
    e.preventDefault();
    const value = f.type === "fixed" ? toMinor(f.value, "NGN") : Number(f.value);
    if (value === null || !Number.isFinite(value) || value < 0 || (f.type === "percent" && value > 100))
      return act.fail(f.type === "percent" ? "Enter a percentage between 0 and 100" : "Enter a valid amount");
    const next = { type: f.type, value, basis: f.basis };
    if (!window.confirm(`Set the commission policy to: ${describePolicy(next)}\n\nCommissions awaiting a policy will be calculated now. Continue?`)) return;
    // The parent shows the confirmation: this form re-mounts with the new policy after saving.
    act.run(async () => {
      const { data } = await api.put("/admin/settings/commission-policy", next);
      onSaved(`Policy saved. ${data.applied.priced} commission(s) awaiting policy were calculated and moved to pending review; ${data.applied.voided} were not eligible and were voided.`);
    });
  };

  return (
    <form className="card stack" style={{ maxWidth: 560 }} onSubmit={save} noValidate>
      <Alert kind={act.msg.kind} onClose={act.clear}>{act.msg.text}</Alert>
      <Field label="Commission type">
        <select className="select" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
          <option value="percent">Percentage of the subscription payment</option>
          <option value="fixed">Fixed amount per qualifying payment (NGN)</option>
        </select>
      </Field>
      <Field label={f.type === "percent" ? "Percentage (0–100)" : "Amount (₦)"}>
        <input className="input" inputMode="decimal" value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} />
      </Field>
      <Field label="Which payments qualify?">
        <select className="select" value={f.basis} onChange={(e) => setF({ ...f, basis: e.target.value })}>
          <option value="first_payment">Only the referred business's first subscription payment</option>
          <option value="every_payment">Every subscription payment by the referred business</option>
        </select>
      </Field>
      <p className="muted small">Changing the policy does not recalculate commissions that already have an amount. Each commission stores a snapshot of the policy used.</p>
      <div><button className="btn btn-primary" disabled={act.busy}>Save policy</button></div>
    </form>
  );
}

export default function AdminSettings() {
  const state = useFetch("/admin/settings/commission-policy");
  const [notice, setNotice] = useState("");
  return (
    <>
      <PageHeader title="Commission policy" subtitle="Controls how ambassador commissions are calculated" />
      <Alert kind="warn">The commission rate and rules are a business decision for the Bizula owner. Only enter values the owner has approved.</Alert>
      <Alert kind="success" onClose={() => setNotice("")}>{notice}</Alert>
      <Loader state={state}>{(d) => (
        <div className="stack">
          <div className="card"><strong>Current policy:</strong> {describePolicy(d.policy) || "Not set — commissions are recorded as “awaiting policy”."}</div>
          <PolicyForm key={JSON.stringify(d.policy)} policy={d.policy} onSaved={(text) => { setNotice(text); state.reload(); }} />
        </div>
      )}</Loader>
    </>
  );
}
