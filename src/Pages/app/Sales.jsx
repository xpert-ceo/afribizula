import { useMemo, useState } from "react";
import api from "../../lib/api";
import useFetch from "../../lib/useFetch";
import useAction from "../../lib/useAction";
import { useAuth } from "../../context/AuthContext";
import { formatMoney, formatDate } from "../../lib/format";
import { Alert, Badge, Empty, Field, Loader, PageHeader } from "../../components/app/ui";

const METHODS = [["cash", "Cash"], ["transfer", "Bank transfer"], ["card", "Card / POS"], ["other", "Other"]];

export default function Sales() {
  const { session } = useAuth();
  const isOwner = session.user.role === "owner";
  const currency = session.business?.currency || "NGN";
  const tracking = session.business?.settings?.staffSalesTracking || "off";
  const products = useFetch("/inventory/products?active=true");
  const staff = useFetch(isOwner && tracking !== "off" ? "/staff" : null);
  const [page, setPage] = useState(1);
  const sales = useFetch(`/sales?page=${page}&limit=20`);
  const act = useAction();

  const [lines, setLines] = useState([]);
  const [pick, setPick] = useState({ product: "", quantity: "1" });
  const [form, setForm] = useState({ paymentMethod: "cash", staff: "", note: "" });

  const byId = useMemo(() => Object.fromEntries((products.data?.products || []).map((p) => [p._id, p])), [products.data]);
  const estimate = lines.reduce((s, l) => s + (byId[l.product]?.price || 0) * l.quantity, 0);

  const addLine = (e) => {
    e.preventDefault();
    const q = Number(pick.quantity);
    if (!pick.product) return act.fail("Choose a product");
    if (!Number.isInteger(q) || q < 1) return act.fail("Quantity must be a whole number of 1 or more");
    act.clear();
    setLines((ls) => {
      const existing = ls.find((l) => l.product === pick.product);
      return existing ? ls.map((l) => (l.product === pick.product ? { ...l, quantity: l.quantity + q } : l)) : [...ls, { product: pick.product, quantity: q }];
    });
    setPick({ product: "", quantity: "1" });
  };

  const submit = () => act.run(async () => {
    const { data } = await api.post("/sales", {
      items: lines, paymentMethod: form.paymentMethod, note: form.note || undefined,
      staff: isOwner && form.staff ? form.staff : undefined,
    });
    setLines([]); setForm({ ...form, note: "" });
    sales.reload(); products.reload();
    return data.sale;
  }, (sale) => `Sale recorded: ${formatMoney(sale.total, sale.currency)}`);

  const voidSale = (s) => {
    if (!window.confirm(`Void this sale of ${formatMoney(s.total, s.currency)}? Stock will be returned.`)) return;
    act.run(async () => { await api.post(`/sales/${s._id}/void`); sales.reload(); products.reload(); }, "Sale voided and stock returned");
  };

  return (
    <>
      <PageHeader title="Sales" subtitle={isOwner ? "Record sales and review history" : "Record sales and see the sales you made"} />
      <Alert kind={act.msg.kind} onClose={act.clear}>{act.msg.text}</Alert>
      {act.msg.kind === "error" && act.errors.staff && <Alert kind="error">{act.errors.staff}</Alert>}

      <div className="card stack" style={{ marginBottom: "1rem" }}>
        <h2>New sale</h2>
        <Loader state={products}>{(d) => d.products.length === 0 ? (
          <Empty title="No products to sell yet">{isOwner ? "Add products in Inventory first." : "Ask the owner to add products."}</Empty>
        ) : (
          <>
            <form className="row" onSubmit={addLine} style={{ alignItems: "flex-end" }}>
              <Field label="Product">
                <select className="select" value={pick.product} onChange={(e) => setPick({ ...pick, product: e.target.value })}>
                  <option value="">Select…</option>
                  {d.products.map((p) => (
                    <option key={p._id} value={p._id} disabled={p.trackStock && p.stockQuantity < 1}>
                      {p.name} — {formatMoney(p.price, currency)}{p.trackStock ? ` (${p.stockQuantity} in stock)` : ""}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Qty"><input className="input" style={{ width: 90 }} inputMode="numeric" value={pick.quantity} onChange={(e) => setPick({ ...pick, quantity: e.target.value })} /></Field>
              <button className="btn btn-secondary">Add item</button>
            </form>

            {lines.length > 0 && (
              <div className="table-wrap"><table className="table">
                <thead><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Line total</th><th></th></tr></thead>
                <tbody>{lines.map((l) => (
                  <tr key={l.product}>
                    <td>{byId[l.product]?.name}</td><td>{l.quantity}</td>
                    <td>{formatMoney(byId[l.product]?.price, currency)}</td>
                    <td>{formatMoney((byId[l.product]?.price || 0) * l.quantity, currency)}</td>
                    <td><button type="button" className="btn btn-sm btn-secondary" onClick={() => setLines(lines.filter((x) => x.product !== l.product))}>Remove</button></td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}

            <div className="row" style={{ alignItems: "flex-end" }}>
              <Field label="Payment method">
                <select className="select" value={form.paymentMethod} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                  {METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </Field>
              {isOwner && tracking !== "off" && (
                <Field label={`Staff member${tracking === "required" ? " (required)" : " (optional)"}`} error={act.errors.staff}>
                  <select className="select" value={form.staff} onChange={(e) => setForm({ ...form, staff: e.target.value })}>
                    <option value="">{tracking === "required" ? "Select…" : "Not attributed"}</option>
                    <option value={session.user._id}>Me ({session.user.name})</option>
                    {(staff.data?.staff || []).filter((s) => s.status === "active").map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>
                </Field>
              )}
              {!isOwner && tracking !== "off" && <p className="muted small">This sale will be attributed to you.</p>}
              <Field label="Note (optional)"><input className="input" value={form.note} maxLength={300} onChange={(e) => setForm({ ...form, note: e.target.value })} /></Field>
            </div>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <span>Estimated total: <strong>{formatMoney(estimate, currency)}</strong> <span className="muted small">(final total is calculated by the server from current prices)</span></span>
              <button type="button" className="btn btn-accent" onClick={submit} disabled={act.busy || lines.length === 0}>{act.busy ? "Saving…" : "Record sale"}</button>
            </div>
          </>
        )}</Loader>
      </div>

      <div className="card">
        <h2>{isOwner ? "Sales history" : "My sales"}</h2>
        <Loader state={sales}>{(d) => d.sales.length === 0 ? <Empty title="No sales recorded yet" /> : (
          <>
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Date</th><th>Items</th><th>Total</th><th>Payment</th>{tracking !== "off" && <th>Staff</th>}<th>Recorded by</th><th>Status</th>{isOwner && <th></th>}</tr></thead>
              <tbody>{d.sales.map((s) => (
                <tr key={s._id}>
                  <td>{formatDate(s.createdAt, true)}</td>
                  <td>{s.items.map((i) => `${i.quantity} × ${i.name}`).join(", ")}</td>
                  <td>{formatMoney(s.total, s.currency)}</td><td>{s.paymentMethod}</td>
                  {tracking !== "off" && <td>{s.staff?.name || "—"}</td>}
                  <td>{s.recordedBy?.name || "—"}</td>
                  <td><Badge value={s.status} /></td>
                  {isOwner && <td>{s.status === "completed" && <button type="button" className="btn btn-sm btn-danger" onClick={() => voidSale(s)} disabled={act.busy}>Void</button>}</td>}
                </tr>
              ))}</tbody>
            </table></div>
            <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginTop: ".75rem" }}>
              <span className="muted small">{d.total} sale(s)</span>
              <div className="row">
                <button type="button" className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
                <button type="button" className="btn btn-sm btn-secondary" disabled={page * d.limit >= d.total} onClick={() => setPage(page + 1)}>Next</button>
              </div>
            </div>
          </>
        )}</Loader>
      </div>
    </>
  );
}
