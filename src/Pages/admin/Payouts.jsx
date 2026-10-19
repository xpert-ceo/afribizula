import useFetch from "../../lib/useFetch";
import { formatDate, formatMoney } from "../../lib/format";
import { Empty, Loader, PageHeader } from "../../components/app/ui";

export default function Payouts() {
  const list = useFetch("/admin/payouts");
  return (
    <>
      <PageHeader title="Payouts" subtitle="Payouts recorded after paying ambassadors outside Bizula. Record new payouts from Commissions → Approved." />
      <div className="card">
        <Loader state={list}>{(d) => d.payouts.length === 0 ? <Empty title="No payouts recorded" /> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Paid on</th><th>Ambassador</th><th>Amount</th><th>Commissions</th><th>Method</th><th>Reference</th><th>Note</th><th>Recorded by</th></tr></thead>
            <tbody>{d.payouts.map((p) => (
              <tr key={p._id}><td>{formatDate(p.paidAt)}</td>
                <td>{p.ambassador?.user?.name}<div className="muted small">{p.ambassador?.code}</div></td>
                <td>{formatMoney(p.amount, p.currency)}</td><td>{p.commissions.length}</td><td>{p.method || "—"}</td><td>{p.reference || "—"}</td>
                <td className="small">{p.note || ""}</td><td className="small">{p.recordedBy?.email}</td></tr>
            ))}</tbody>
          </table></div>
        )}</Loader>
      </div>
    </>
  );
}
