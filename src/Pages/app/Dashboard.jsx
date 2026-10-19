import { Link } from "react-router-dom";
import useFetch from "../../lib/useFetch";
import { useAuth } from "../../context/AuthContext";
import { formatMoney, formatDate } from "../../lib/format";
import { Loader, PageHeader, Stat, Alert, Empty, Badge } from "../../components/app/ui";

export default function Dashboard() {
  const { session } = useAuth();
  const state = useFetch("/business/summary");
  const isOwner = session.user.role === "owner";

  return (
    <>
      <PageHeader title={isOwner ? "Dashboard" : `Hello, ${session.user.name?.split(" ")[0] || ""}`}
        subtitle={session.business?.name}
        actions={<Link className="btn btn-primary" to="/app/sales">Record a sale</Link>} />
      <Loader state={state}>
        {(d) => {
          const cur = d.currency;
          const remaining = d.checklist.filter((c) => !c.done);
          return (
            <div className="stack">
              {isOwner && d.subscription.status !== "active" && (
                <Alert kind="warn">
                  {d.subscription.status === "expired"
                    ? `Your ${d.subscription.plan} subscription expired on ${formatDate(d.subscription.currentPeriodEnd)}.`
                    : "You do not have an active subscription yet."}{" "}
                  <Link to="/app/billing">View plans</Link>
                </Alert>
              )}
              <div className="grid grid-4">
                <Stat label={isOwner ? "Sales today" : "My sales today"} value={formatMoney(d.sales.today.total, cur)} hint={`${d.sales.today.count} sale(s)`} />
                <Stat label={isOwner ? "Last 7 days" : "My last 7 days"} value={formatMoney(d.sales.last7Days.total, cur)} hint={`${d.sales.last7Days.count} sale(s)`} />
                <Stat label="Active products" value={d.counts.products} hint={`${d.counts.departments} departments · ${d.counts.categories} categories`} />
                {isOwner ? <Stat label="Staff" value={d.counts.staff} /> : <Stat label="Low stock items" value={d.lowStock.length} />}
              </div>

              <div className="grid grid-2">
                {isOwner && (
                  <div className="card">
                    <h2>{remaining.length ? "Next steps" : "Setup complete"}</h2>
                    <ul className="checklist">
                      {d.checklist.map((c) => (
                        <li key={c.key} className={c.done ? "done" : ""}>
                          <span className="tick">{c.done ? "✓" : ""}</span>
                          {c.done ? <span className="text">{c.label}</span> : <Link to={c.to}>{c.label}</Link>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="card">
                  <h2>Low stock</h2>
                  {d.lowStock.length === 0 ? <Empty title="No low-stock items" /> : (
                    <table className="table"><tbody>
                      {d.lowStock.map((p) => (<tr key={p._id}><td>{p.name}</td><td className="muted">{p.sku}</td><td><Badge value={p.stockQuantity === 0 ? "failed" : "pending"} /> {p.stockQuantity} left</td></tr>))}
                    </tbody></table>
                  )}
                </div>
                {isOwner && session.business?.settings?.staffSalesTracking !== "off" && (
                  <div className="card">
                    <h2>Sales by staff (last 7 days)</h2>
                    {d.salesByStaff.length === 0 ? <Empty title="No attributed sales yet" /> : (
                      <table className="table"><thead><tr><th>Staff</th><th>Sales</th><th>Total</th></tr></thead><tbody>
                        {d.salesByStaff.map((r) => (<tr key={r._id}><td>{r.name || "—"}</td><td>{r.count}</td><td>{formatMoney(r.total, cur)}</td></tr>))}
                      </tbody></table>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        }}
      </Loader>
    </>
  );
}
