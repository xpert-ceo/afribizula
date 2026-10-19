import { useState } from "react";
import api from "../../lib/api";
import useFetch from "../../lib/useFetch";
import useAction from "../../lib/useAction";
import { formatDate } from "../../lib/format";
import { Alert, Badge, Empty, Loader, PageHeader } from "../../components/app/ui";
import { Pager } from "./Users";

export default function Businesses() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const list = useFetch(`/admin/businesses?page=${page}${search ? `&search=${encodeURIComponent(search)}` : ""}`);
  const act = useAction();

  const setStatus = (b, status) => {
    const reason = window.prompt(`Reason for setting ${b.name} to ${status} (recorded in the audit log):`, "");
    if (reason === null) return;
    act.run(async () => { await api.patch(`/admin/businesses/${b._id}/status`, { status, reason }); list.reload(); }, `${b.name} is now ${status}`);
  };

  return (
    <>
      <PageHeader title="Businesses" subtitle="Suspending a business blocks its owner and staff from business features" />
      <Alert kind={act.msg.kind} onClose={act.clear}>{act.msg.text}</Alert>
      <div className="card">
        <input className="input" style={{ maxWidth: 280, marginBottom: ".75rem" }} placeholder="Search business name" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <Loader state={list}>{(d) => d.businesses.length === 0 ? <Empty title="No businesses" /> : (
          <>
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Name</th><th>Type</th><th>Owner</th><th>Country / currency</th><th>Staff tracking</th><th>Subscription</th><th>Status</th><th>Created</th><th></th></tr></thead>
              <tbody>{d.businesses.map((b) => (
                <tr key={b._id}>
                  <td>{b.name}</td><td>{b.type}</td><td>{b.owner?.name}<div className="muted small">{b.owner?.email}</div></td>
                  <td>{b.country} / {b.currency}</td><td>{b.settings?.staffSalesTracking}</td>
                  <td><Badge value={b.subscription.status} /> {b.subscription.plan || ""}{b.subscription.currentPeriodEnd && <div className="muted small">to {formatDate(b.subscription.currentPeriodEnd)}</div>}</td>
                  <td><Badge value={b.status} /></td><td>{formatDate(b.createdAt)}</td>
                  <td>{b.status === "active"
                    ? <button type="button" className="btn btn-sm btn-danger" onClick={() => setStatus(b, "suspended")} disabled={act.busy}>Suspend</button>
                    : <button type="button" className="btn btn-sm btn-secondary" onClick={() => setStatus(b, "active")} disabled={act.busy}>Activate</button>}</td>
                </tr>
              ))}</tbody>
            </table></div>
            <Pager d={d} page={page} setPage={setPage} />
          </>
        )}</Loader>
      </div>
    </>
  );
}
