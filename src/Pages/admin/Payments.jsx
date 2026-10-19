import { useState } from "react";
import useFetch from "../../lib/useFetch";
import { formatDate, formatMoney } from "../../lib/format";
import { Badge, Empty, Loader, PageHeader } from "../../components/app/ui";
import { Pager } from "./Users";

export default function Payments() {
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const list = useFetch(`/admin/payments?page=${page}${status ? `&status=${status}` : ""}`);
  return (
    <>
      <PageHeader title="Subscription payments" subtitle="Paystack transactions initiated by businesses" />
      <div className="card">
        <select className="select" style={{ maxWidth: 200, marginBottom: ".75rem" }} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Status filter">
          <option value="">All statuses</option>{["initialized", "success", "failed"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <Loader state={list}>{(d) => d.payments.length === 0 ? <Empty title="No payments" /> : (
          <>
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Created</th><th>Business</th><th>Payer</th><th>Plan</th><th>Amount</th><th>Status</th><th>Paid</th><th>Reference</th></tr></thead>
              <tbody>{d.payments.map((p) => (
                <tr key={p._id}><td>{formatDate(p.createdAt, true)}</td><td>{p.business?.name}</td><td>{p.user?.email}</td><td>{p.plan}</td>
                  <td>{formatMoney(p.amount, p.currency)}</td><td><Badge value={p.status} />{p.failureReason && <div className="muted small">{p.failureReason}</div>}</td>
                  <td>{formatDate(p.paidAt)}</td><td className="small">{p.reference}</td></tr>
              ))}</tbody>
            </table></div>
            <Pager d={d} page={page} setPage={setPage} />
          </>
        )}</Loader>
      </div>
    </>
  );
}
