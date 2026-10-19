import { useState } from "react";
import api from "../../lib/api";
import useFetch from "../../lib/useFetch";
import useAction from "../../lib/useAction";
import { formatDate, formatMoney } from "../../lib/format";
import { Alert, Badge, Empty, Field, Loader, PageHeader } from "../../components/app/ui";

export default function Commissions() {
  const [status, setStatus] = useState("pending");
  const list = useFetch(`/admin/commissions${status ? `?status=${status}` : ""}`);
  const act = useAction();
  const [selected, setSelected] = useState([]);
  const [pay, setPay] = useState({ method: "", reference: "", note: "", paidAt: "" });

  const rows = list.data?.commissions || [];
  const chosen = rows.filter((c) => selected.includes(c._id));
  const ambassadorIds = [...new Set(chosen.map((c) => c.ambassador?._id))];
  const currencies = [...new Set(chosen.map((c) => c.currency))];
  const payTotal = chosen.reduce((s, c) => s + (c.amount || 0), 0);

  const toggle = (id) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const approve = (c) => act.run(async () => { await api.patch(`/admin/commissions/${c._id}`, { action: "approve" }); list.reload(); }, "Commission approved");
  const voidIt = (c) => {
    const reason = window.prompt("Reason for voiding this commission (shown to the ambassador):", "");
    if (reason === null) return;
    if (!reason.trim()) return act.fail("A reason is required to void a commission");
    act.run(async () => { await api.patch(`/admin/commissions/${c._id}`, { action: "void", reason }); list.reload(); }, "Commission voided");
  };
  const recordPayout = (e) => {
    e.preventDefault();
    if (ambassadorIds.length !== 1) return act.fail("Select approved commissions for exactly one ambassador");
    if (currencies.length !== 1) return act.fail("A payout can only include one currency");
    if (!window.confirm(`Record a payout of ${formatMoney(payTotal, currencies[0])} to ${chosen[0].ambassador?.user?.email}? Only do this after you have actually paid them.`)) return;
    act.run(async () => {
      await api.post("/admin/payouts", { ambassadorId: ambassadorIds[0], commissionIds: selected, ...pay, paidAt: pay.paidAt || undefined });
      setSelected([]); setPay({ method: "", reference: "", note: "", paidAt: "" }); list.reload();
    }, "Payout recorded and commissions marked as paid");
  };

  return (
    <>
      <PageHeader title="Commissions" subtitle="Review ambassador commissions, approve them, and record payouts made outside Bizula" />
      <Alert kind={act.msg.kind} onClose={act.clear}>{act.msg.text}</Alert>
      <div className="tabs" role="tablist">
        {[["awaiting_policy", "Awaiting policy"], ["pending", "Pending review"], ["approved", "Approved (unpaid)"], ["paid", "Paid"], ["void", "Void"], ["", "All"]].map(([v, l]) => (
          <button key={v} type="button" role="tab" aria-selected={status === v} className={status === v ? "active" : ""} onClick={() => { setStatus(v); setSelected([]); }}>{l}</button>
        ))}
      </div>
      {status === "awaiting_policy" && <Alert kind="info">These commissions have no amount yet because no commission policy is set. Setting the policy calculates them and moves them to pending review.</Alert>}

      {status === "approved" && selected.length > 0 && (
        <form className="card stack" style={{ marginBottom: "1rem" }} onSubmit={recordPayout}>
          <h2 style={{ margin: 0 }}>Record payout: {chosen.length} commission(s), {currencies.length === 1 ? formatMoney(payTotal, currencies[0]) : "mixed currencies"}</h2>
          {ambassadorIds.length > 1 && <Alert kind="error">Selected commissions belong to more than one ambassador. A payout is recorded per ambassador.</Alert>}
          <div className="row">
            <Field label="Method"><input className="input" placeholder="e.g. Bank transfer" value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })} /></Field>
            <Field label="Reference"><input className="input" placeholder="Transfer reference" value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} /></Field>
            <Field label="Paid on"><input className="input" type="date" value={pay.paidAt} onChange={(e) => setPay({ ...pay, paidAt: e.target.value })} /></Field>
          </div>
          <Field label="Note"><input className="input" value={pay.note} onChange={(e) => setPay({ ...pay, note: e.target.value })} /></Field>
          <div><button className="btn btn-accent" disabled={act.busy || ambassadorIds.length !== 1}>Record payout</button></div>
        </form>
      )}

      <div className="card">
        <Loader state={list}>{() => rows.length === 0 ? <Empty title="No commissions in this view" /> : (
          <div className="table-wrap"><table className="table">
            <thead><tr>{status === "approved" && <th></th>}<th>Created</th><th>Ambassador</th><th>Referred business</th><th>Payment</th><th>Commission</th><th>Status</th><th></th></tr></thead>
            <tbody>{rows.map((c) => (
              <tr key={c._id}>
                {status === "approved" && <td><input type="checkbox" aria-label="Select for payout" checked={selected.includes(c._id)} onChange={() => toggle(c._id)} /></td>}
                <td>{formatDate(c.createdAt)}</td>
                <td>{c.ambassador?.user?.name}<div className="muted small">{c.ambassador?.code} · {c.ambassador?.user?.email}</div></td>
                <td>{c.referral?.business?.name || "—"}<div className="muted small">{c.referral?.referredUser?.email}</div></td>
                <td>{formatMoney(c.baseAmount, c.currency)}<div className="muted small">{c.payment?.plan} · {c.payment?.reference}{c.isFirstPayment ? " · first" : ""}</div></td>
                <td>{c.amount === null ? "—" : formatMoney(c.amount, c.currency)}</td>
                <td><Badge value={c.status} />{c.voidReason && <div className="muted small">{c.voidReason}</div>}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {c.status === "pending" && <button type="button" className="btn btn-sm btn-primary" onClick={() => approve(c)} disabled={act.busy}>Approve</button>}{" "}
                  {!["paid", "void"].includes(c.status) && <button type="button" className="btn btn-sm btn-danger" onClick={() => voidIt(c)} disabled={act.busy}>Void</button>}
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}</Loader>
      </div>
    </>
  );
}
