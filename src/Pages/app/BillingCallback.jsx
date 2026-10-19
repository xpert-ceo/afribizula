import { Link, useSearchParams } from "react-router-dom";
import useFetch from "../../lib/useFetch";
import { formatDate, formatMoney } from "../../lib/format";
import { Alert, PageHeader, Spinner } from "../../components/app/ui";

// Paystack redirects here with ?reference=… after checkout. The server re-verifies with Paystack.
export default function BillingCallback() {
  const [params] = useSearchParams();
  const reference = params.get("reference") || params.get("trxref");
  const state = useFetch(reference ? `/billing/verify?reference=${encodeURIComponent(reference)}` : null);

  return (
    <>
      <PageHeader title="Payment result" />
      <div className="card stack" style={{ maxWidth: 560 }}>
        {!reference && <Alert kind="error">No payment reference was supplied.</Alert>}
        {reference && state.loading && <Spinner label="Confirming your payment with Paystack…" />}
        {state.error && <Alert kind="error">{state.error}</Alert>}
        {state.data && state.data.payment.status !== "success" && (
          <Alert kind="error">This payment was not successful{state.data.payment.failureReason ? `: ${state.data.payment.failureReason}` : ""}. You have not been charged for a new period.</Alert>
        )}
        {state.data && state.data.payment.status === "success" && (
          <Alert kind="success">
            Payment of {formatMoney(state.data.payment.amount, state.data.payment.currency)} confirmed. Your {state.data.subscription.plan} plan is active until {formatDate(state.data.subscription.currentPeriodEnd)}.
          </Alert>
        )}
        <div><Link className="btn btn-secondary" to="/app/billing">Back to subscription</Link></div>
      </div>
    </>
  );
}
