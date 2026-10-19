import { useState } from "react";
import api from "../../lib/api";
import useFetch from "../../lib/useFetch";
import useAction from "../../lib/useAction";
import { formatDate, formatMoney } from "../../lib/format";
import { describePolicy } from "../../lib/policy";
import { Alert, Badge, Empty, Field, Loader, PageHeader, Stat } from "../../components/app/ui";

const STATUS_ORDER = ["awaiting_policy", "pending", "approved", "paid", "void"];

function totalsBy(totals, status) {
  const rows = totals.filter((t) => t.status === status);
  if (!rows.length) return formatMoney(0, "NGN");
  return rows.map((r) => formatMoney(r.amount, r.currency)).join(" + ");
}

export default function AmbassadorDashboard() {
  const me = useFetch("/ambassador/me");
  const referrals = useFetch("/ambassador/referrals");
  const commissions = useFetch("/ambassador/commissions");
  const payouts = useFetch("/ambassador/payouts");
  const act = useAction();
  const [copied, setCopied] = useState("");
  const [details, setDetails] = useState(null); // null = untouched, use server value

  const copy = async (text, what) => {
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(""), 2000); }
    catch { act.fail("Could not copy automatically. Select the text and copy it manually."); }
  };

  return (
    <>
      <PageHeader title="Ambassador dashboard" subtitle="Refer businesses to Bizula and track your commissions" />
      <Alert kind={act.msg.kind} onClose={act.clear}>{act.msg.text}</Alert>
      <Loader state={me}>{(d) => {
        const a = d.ambassador;
        const policyText = describePolicy(d.policy);
        const payoutValue = details ?? a.payoutDetails;
        return (
          <div className="stack">
            {a.status === "pending" && <Alert kind="warn">Your ambassador account is awaiting approval by the Bizula team. Your referral link becomes active once you are approved.</Alert>}
            {a.status === "suspended" && <Alert kind="error">Your ambassador account is suspended. New sign-ups cannot use your code and no new commissions are earned. Contact Bizula support.</Alert>}

            <div className="card stack">
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <h2 style={{ margin: 0 }}>Your referral code</h2><Badge value={a.status} />
              </div>
              <div className="row" style={{ alignItems: "center" }}>
                <span className="code-box">{a.code}</span>
                <button type="button" className="btn btn-sm btn-secondary" onClick={() => copy(a.code, "code")}>{copied === "code" ? "Copied" : "Copy code"}</button>
              </div>
              {d.referralLink ? (
                <div className="row" style={{ alignItems: "center" }}>
                  <span className="code-box" style={{ wordBreak: "break-all" }}>{d.referralLink}</span>
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => copy(d.referralLink, "link")}>{copied === "link" ? "Copied" : "Copy link"}</button>
                </div>
              ) : <p className="muted small">Your shareable link will appear here once your account is active.</p>}
              <p className="muted small">A referral is counted when a new business owner signs up with your link or code. Sign-ups using your own email address are not counted.</p>
            </div>

            <div className="grid grid-4">
              <Stat label="Sign-ups referred" value={d.stats.referrals} />
              <Stat label="Converted (paid)" value={d.stats.converted} />
              <Stat label="Approved, unpaid" value={totalsBy(d.totals, "approved")} />
              <Stat label="Paid to you" value={totalsBy(d.totals, "paid")} />
            </div>

            <div className="card">
              <h2>Commission terms</h2>
              {policyText ? <p>{policyText} Commissions are reviewed by Bizula before approval and are paid out manually.</p>
                : <Alert kind="info">The commission rate has not been set by Bizula yet. Qualifying payments are still recorded and will show as “awaiting policy” until the rate is published.</Alert>}
              <div className="row small">
                {STATUS_ORDER.map((s) => <span key={s}><Badge value={s} /> {totalsBy(d.totals, s)}</span>)}
              </div>
            </div>

            <div className="card stack">
              <h2>Payout details</h2>
              <p className="muted small">Tell Bizula how to pay you (for example bank name, account name and account number). Only Bizula admins can see this.</p>
              <Field label="Payout details" error={act.errors.payoutDetails}>
                <textarea className="textarea" rows={3} maxLength={500} value={payoutValue} onChange={(e) => setDetails(e.target.value)} />
              </Field>
              <div><button type="button" className="btn btn-primary" disabled={act.busy || details === null}
                onClick={() => act.run(async () => { await api.patch("/ambassador/me", { payoutDetails: payoutValue }); setDetails(null); me.reload(); }, "Payout details saved")}>Save payout details</button></div>
            </div>
          </div>
        );
      }}</Loader>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h2>Referrals</h2>
        <Loader state={referrals}>{(d) => d.referrals.length === 0 ? <Empty title="No referrals yet">Share your link with business owners to get started.</Empty> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Signed up</th><th>Name</th><th>Email</th><th>Business</th><th>Status</th><th>Converted</th></tr></thead>
            <tbody>{d.referrals.map((r) => (
              <tr key={r._id}><td>{formatDate(r.createdAt)}</td><td>{r.name}</td><td>{r.email}</td>
                <td>{r.business ? `${r.business.name} (${r.business.type})` : <span className="muted">Not set up yet</span>}</td>
                <td><Badge value={r.status} /></td><td>{formatDate(r.convertedAt)}</td></tr>
            ))}</tbody>
          </table></div>
        )}</Loader>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h2>Commissions</h2>
        <Loader state={commissions}>{(d) => d.commissions.length === 0 ? <Empty title="No commissions yet">Commissions are created when a referred business pays for a subscription.</Empty> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Date</th><th>Subscription payment</th><th>Commission</th><th>Status</th><th>Notes</th></tr></thead>
            <tbody>{d.commissions.map((c) => (
              <tr key={c._id}><td>{formatDate(c.createdAt)}</td>
                <td>{formatMoney(c.baseAmount, c.currency)}{c.isFirstPayment && <span className="muted small"> (first payment)</span>}</td>
                <td>{c.amount === null ? "—" : formatMoney(c.amount, c.currency)}</td><td><Badge value={c.status} /></td>
                <td className="small">{c.voidReason || ""}</td></tr>
            ))}</tbody>
          </table></div>
        )}</Loader>
      </div>

      <div className="card" style={{ marginTop: "1rem" }}>
        <h2>Payouts received</h2>
        <Loader state={payouts}>{(d) => d.payouts.length === 0 ? <Empty title="No payouts yet" /> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Paid on</th><th>Amount</th><th>Method</th><th>Reference</th><th>Commissions</th></tr></thead>
            <tbody>{d.payouts.map((p) => (
              <tr key={p._id}><td>{formatDate(p.paidAt)}</td><td>{formatMoney(p.amount, p.currency)}</td><td>{p.method || "—"}</td><td>{p.reference || "—"}</td><td>{p.commissions.length}</td></tr>
            ))}</tbody>
          </table></div>
        )}</Loader>
      </div>
    </>
  );
}
