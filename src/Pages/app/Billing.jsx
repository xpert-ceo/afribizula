import api from "../../lib/api";
import useFetch from "../../lib/useFetch";
import useAction from "../../lib/useAction";
import { formatMoney, formatDate } from "../../lib/format";
import { Alert, Badge, Empty, Loader, PageHeader } from "../../components/app/ui";

export default function Billing() {
  const state = useFetch("/billing");
  const act = useAction();

  const checkout = (plan) => act.run(async () => {
    const { data } = await api.post("/billing/checkout", { plan });
    window.location.assign(data.authorizationUrl);
  });

  return (
    <>
      <PageHeader title="Subscription" subtitle="Monthly plans, paid securely through Paystack" />
      <Alert kind={act.msg.kind} onClose={act.clear}>{act.msg.text}</Alert>
      <Loader state={state}>{(d) => {
        const sub = d.subscription;
        return (
          <div className="stack">
            <div className="card">
              <h2>Current subscription</h2>
              {sub.status === "none" ? <p className="muted">You have not subscribed yet.</p> : (
                <p><Badge value={sub.status} /> <strong style={{ textTransform: "capitalize" }}>{sub.plan}</strong> plan ·{" "}
                  {sub.status === "active" ? "renews manually; paid up to" : "ended"} {formatDate(sub.currentPeriodEnd)}</p>
              )}
              {!d.enforcement && <p className="muted small">Subscription enforcement is currently turned off by Bizula, so all features remain available while you decide.</p>}
            </div>

            {!d.paymentsEnabled && <Alert kind="warn">Online payments are not configured on this server yet, so plans cannot be purchased. Please contact Bizula support.</Alert>}
            {d.plans.some((p) => !p.priceConfirmed) && <Alert kind="info">Plan prices shown are provisional and still awaiting confirmation by Bizula.</Alert>}

            <div className="grid grid-3">
              {d.plans.map((p) => (
                <div key={p.id} className="card stack">
                  <h2 style={{ margin: 0 }}>{p.name}</h2>
                  <div><strong style={{ fontSize: "1.6rem" }}>{formatMoney(p.amount, p.currency)}</strong> <span className="muted">/ month</span></div>
                  <p className="muted small">All MVP features are included on every plan. Paying {sub.status === "active" ? "now extends your current period by one month" : "starts a one-month period"}.</p>
                  <button type="button" className="btn btn-primary" disabled={!d.paymentsEnabled || act.busy} onClick={() => checkout(p.id)}>
                    {sub.status === "active" && sub.plan === p.id ? "Renew for one month" : `Pay for ${p.name}`}
                  </button>
                </div>
              ))}
            </div>

            <div className="card">
              <h2>Payment history</h2>
              {d.payments.length === 0 ? <Empty title="No payments yet" /> : (
                <div className="table-wrap"><table className="table">
                  <thead><tr><th>Date</th><th>Plan</th><th>Amount</th><th>Status</th><th>Period</th><th>Reference</th></tr></thead>
                  <tbody>{d.payments.map((p) => (
                    <tr key={p._id}>
                      <td>{formatDate(p.paidAt || p.createdAt)}</td><td>{p.plan}</td><td>{formatMoney(p.amount, p.currency)}</td>
                      <td><Badge value={p.status} />{p.failureReason && <div className="muted small">{p.failureReason}</div>}</td>
                      <td>{p.periodStart ? `${formatDate(p.periodStart)} – ${formatDate(p.periodEnd)}` : "—"}</td>
                      <td className="small">{p.reference}</td>
                    </tr>
                  ))}</tbody>
                </table></div>
              )}
            </div>
          </div>
        );
      }}</Loader>
    </>
  );
}
