import { Link } from "react-router-dom";
import useFetch from "../../lib/useFetch";
import { formatMoney } from "../../lib/format";
import { describePolicy } from "../../lib/policy";
import { Alert, Loader, PageHeader, Stat } from "../../components/app/ui";

const sumBy = (rows, status) => rows.filter((r) => r.status === status).map((r) => formatMoney(r.amount, r.currency)).join(" + ") || "0";

export default function Overview() {
  const state = useFetch("/admin/stats");
  return (
    <>
      <PageHeader title="Platform overview" subtitle="Main admin" />
      <Loader state={state}>{(d) => (
        <div className="stack">
          {!d.commissionPolicy && <Alert kind="warn">No commission policy is set. Ambassador commissions are recorded as “awaiting policy”. <Link to="/admin/settings">Set the policy</Link> once the owner has approved the rate.</Alert>}
          {d.pendingAmbassadors > 0 && <Alert kind="info">{d.pendingAmbassadors} ambassador application(s) awaiting review. <Link to="/admin/ambassadors">Review</Link></Alert>}
          <div className="grid grid-4">
            <Stat label="Users" value={d.users} hint={Object.entries(d.usersByRole).map(([r, n]) => `${n} ${r}`).join(" · ")} />
            <Stat label="New users (7 days)" value={d.newUsersLast7Days} />
            <Stat label="Businesses" value={d.businesses} hint={`${d.activeSubscriptions} with active subscription`} />
            <Stat label="Sales recorded" value={d.salesRecorded} />
            <Stat label="Subscription revenue" value={d.subscriptionRevenue.map((r) => formatMoney(r.amount, r.currency)).join(" + ") || "0"} hint={`${d.subscriptionRevenue.reduce((s, r) => s + r.count, 0)} successful payment(s)`} />
            <Stat label="Ambassadors" value={d.ambassadors} hint={`${d.pendingAmbassadors} pending`} />
            <Stat label="Referrals" value={d.referrals} hint={`${d.convertedReferrals} converted`} />
            <Stat label="Commissions owed (approved)" value={sumBy(d.commissions, "approved")} hint={`Pending review: ${sumBy(d.commissions, "pending")}`} />
          </div>
          <div className="card"><h2>Commission policy</h2><p>{describePolicy(d.commissionPolicy) || "Not set."}</p></div>
        </div>
      )}</Loader>
    </>
  );
}
