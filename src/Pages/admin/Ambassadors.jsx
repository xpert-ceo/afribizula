import { useState } from "react";
import api from "../../lib/api";
import useFetch from "../../lib/useFetch";
import useAction from "../../lib/useAction";
import { formatDate, formatMoney } from "../../lib/format";
import { Alert, Badge, Empty, Loader, PageHeader } from "../../components/app/ui";

const money = (c, s) => (c?.[s] ? formatMoney(c[s].amount, "NGN") : "—");

export default function Ambassadors() {
  const [status, setStatus] = useState("");
  const list = useFetch(`/admin/ambassadors${status ? `?status=${status}` : ""}`);
  const [refFor, setRefFor] = useState(null);
  const refs = useFetch(refFor ? `/admin/referrals?ambassador=${refFor._id}` : null);
  const act = useAction();

  const change = (a, next) => {
    const reason = next === "active" ? "" : window.prompt(`Reason for setting ${a.user?.email} to ${next}:`, "");
    if (reason === null) return;
    act.run(async () => { await api.patch(`/admin/ambassadors/${a._id}`, { status: next, reason }); list.reload(); }, `Ambassador ${a.code} is now ${next}`);
  };

  return (
    <>
      <PageHeader title="Ambassadors" subtitle="Approve applications, suspend accounts and inspect referrals" />
      <Alert kind={act.msg.kind} onClose={act.clear}>{act.msg.text}</Alert>
      <div className="card">
        <select className="select" style={{ maxWidth: 200, marginBottom: ".75rem" }} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status filter">
          <option value="">All statuses</option><option value="pending">pending</option><option value="active">active</option><option value="suspended">suspended</option>
        </select>
        <Loader state={list}>{(d) => d.ambassadors.length === 0 ? <Empty title="No ambassadors" /> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Ambassador</th><th>Code</th><th>Status</th><th>Referrals</th><th>Pending</th><th>Approved</th><th>Paid</th><th>Payout details</th><th>Applied</th><th></th></tr></thead>
            <tbody>{d.ambassadors.map((a) => (
              <tr key={a._id}>
                <td>{a.user?.name}<div className="muted small">{a.user?.email}</div></td><td><code>{a.code}</code></td><td><Badge value={a.status} /></td>
                <td><button type="button" className="link-btn" onClick={() => setRefFor(a)}>{a.referrals} ({a.converted} converted)</button></td>
                <td>{money(a.commissions, "pending")}</td><td>{money(a.commissions, "approved")}</td><td>{money(a.commissions, "paid")}</td>
                <td className="small" style={{ maxWidth: 220, whiteSpace: "pre-wrap" }}>{a.payoutDetails || <span className="muted">Not provided</span>}</td>
                <td>{formatDate(a.createdAt)}</td>
                <td style={{ whiteSpace: "nowrap" }}>
                  {a.status !== "active" && <button type="button" className="btn btn-sm btn-primary" onClick={() => change(a, "active")} disabled={act.busy}>{a.status === "pending" ? "Approve" : "Reactivate"}</button>}{" "}
                  {a.status !== "suspended" && <button type="button" className="btn btn-sm btn-danger" onClick={() => change(a, "suspended")} disabled={act.busy}>Suspend</button>}
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}</Loader>
      </div>

      {refFor && (
        <div className="card" style={{ marginTop: "1rem" }}>
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h2 style={{ margin: 0 }}>Referrals for {refFor.code}</h2>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setRefFor(null)}>Close</button>
          </div>
          <Loader state={refs}>{(d) => d.referrals.length === 0 ? <Empty title="No referrals" /> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Signed up</th><th>User</th><th>Business</th><th>Status</th><th>Converted</th></tr></thead>
              <tbody>{d.referrals.map((r) => (
                <tr key={r._id}><td>{formatDate(r.createdAt)}</td><td>{r.referredUser?.name}<div className="muted small">{r.referredUser?.email}</div></td>
                  <td>{r.business?.name || "—"}</td><td><Badge value={r.status} /></td><td>{formatDate(r.convertedAt)}</td></tr>
              ))}</tbody>
            </table></div>
          )}</Loader>
        </div>
      )}
    </>
  );
}
