import { useState } from "react";
import api from "../../lib/api";
import useAction from "../../lib/useAction";
import useFetch from "../../lib/useFetch";
import { useAuth } from "../../context/AuthContext";
import { formatMoney, toMinor, fromMinor } from "../../lib/format";
import { Alert, Empty, Field, Loader, PageHeader, Badge } from "../../components/app/ui";

export default function Inventory() {
  const { session } = useAuth();
  const isOwner = session.user.role === "owner";
  const currency = session.business?.currency || "NGN";
  const isService = session.business?.type === "service";
  const depts = useFetch("/inventory/departments");
  const cats = useFetch("/inventory/categories");
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const products = useFetch(`/inventory/products?active=${showInactive ? "all" : "true"}${search ? `&search=${encodeURIComponent(search)}` : ""}`);
  const [selDept, setSelDept] = useState("");
  const [selCat, setSelCat] = useState("");
  const act = useAction();

  const [deptName, setDeptName] = useState("");
  const [catName, setCatName] = useState("");
  const blank = { name: "", sku: "", price: "", costPrice: "", stockQuantity: "0", trackStock: !isService };
  const [pf, setPf] = useState(blank);
  const [editing, setEditing] = useState(null); // product id
  const [edit, setEdit] = useState({});

  const reloadAll = () => { depts.reload(); cats.reload(); products.reload(); };

  const addDept = (e) => { e.preventDefault(); act.run(async () => { const { data } = await api.post("/inventory/departments", { name: deptName }); setDeptName(""); setSelDept(data.department._id); reloadAll(); }, "Department created"); };
  const addCat = (e) => { e.preventDefault(); act.run(async () => { const { data } = await api.post("/inventory/categories", { name: catName, department: selDept }); setCatName(""); setSelCat(data.category._id); reloadAll(); }, "Category created"); };
  const addProduct = (e) => {
    e.preventDefault();
    const price = toMinor(pf.price, currency);
    const costPrice = pf.costPrice === "" ? undefined : toMinor(pf.costPrice, currency);
    const stockQuantity = Number(pf.stockQuantity || 0);
    if (price === null) return act.fail("Enter a valid price, e.g. 1500 or 1500.50");
    if (costPrice === null) return act.fail("Enter a valid cost price or leave it empty");
    if (pf.trackStock && (!Number.isInteger(stockQuantity) || stockQuantity < 0)) return act.fail("Opening stock must be a whole number of 0 or more");
    act.run(async () => {
      await api.post("/inventory/products", { name: pf.name, sku: pf.sku || undefined, price, costPrice, trackStock: pf.trackStock, stockQuantity: pf.trackStock ? stockQuantity : 0, category: selCat });
      setPf(blank); reloadAll();
    }, "Product added");
  };
  const delDept = (id) => act.run(async () => { await api.delete(`/inventory/departments/${id}`); if (selDept === id) setSelDept(""); reloadAll(); }, "Department deleted");
  const delCat = (id) => act.run(async () => { await api.delete(`/inventory/categories/${id}`); if (selCat === id) setSelCat(""); reloadAll(); }, "Category deleted");
  const saveEdit = (p) => act.run(async () => {
    const price = toMinor(edit.price, currency);
    if (price === null) throw new Error("Enter a valid price");
    if (edit.adjust && !Number.isInteger(Number(edit.adjust))) throw new Error("Stock adjustment must be a whole number, e.g. 10 or -3");
    await api.patch(`/inventory/products/${p._id}`, { name: edit.name, price, active: edit.active });
    if (edit.adjust && Number(edit.adjust) !== 0) await api.post(`/inventory/products/${p._id}/stock`, { adjustment: Number(edit.adjust) });
    setEditing(null); products.reload();
  }, "Product updated");
  const removeProduct = (p) => {
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    act.run(async () => { const { data } = await api.delete(`/inventory/products/${p._id}`); products.reload(); cats.reload(); return data; },
      (data) => (data.deactivated ? `"${p.name}" has sales history, so it was deactivated instead of deleted.` : "Product deleted"));
  };

  const deptCats = (cats.data?.categories || []).filter((c) => c.department?._id === selDept);

  return (
    <>
      <PageHeader title={isOwner ? "Inventory" : "Products"} subtitle={isOwner ? "Departments → Categories → Products" : "Read-only product list"} />
      <Alert kind={act.msg.kind} onClose={act.clear}>{act.msg.text}</Alert>

      {isOwner && (
        <div className="grid grid-3" style={{ marginBottom: "1rem" }}>
          <div className="card stack">
            <h2>1. Departments</h2>
            <Loader state={depts}>{(d) => d.departments.length === 0 ? <Empty title="No departments yet">e.g. Groceries, Pharmacy, Hair</Empty> : (
              <div className="stack" style={{ gap: ".35rem" }}>
                {d.departments.map((x) => (
                  <div key={x._id} className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
                    <button type="button" className={`btn btn-sm ${selDept === x._id ? "btn-primary" : "btn-secondary"}`} onClick={() => { setSelDept(x._id); setSelCat(""); }}>{x.name} ({x.categoryCount})</button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => delDept(x._id)} disabled={act.busy} aria-label={`Delete ${x.name}`}>Delete</button>
                  </div>
                ))}
              </div>
            )}</Loader>
            <form className="row" onSubmit={addDept}>
              <Field label="New department" error={act.errors.name && !selDept ? act.errors.name : ""}><input className="input" value={deptName} onChange={(e) => setDeptName(e.target.value)} /></Field>
              <button className="btn btn-primary" disabled={act.busy || !deptName.trim()}>Add</button>
            </form>
          </div>

          <div className="card stack">
            <h2>2. Categories</h2>
            {!selDept ? <Empty title="Select a department" /> : (
              <>
                {deptCats.length === 0 ? <Empty title="No categories in this department" /> : deptCats.map((c) => (
                  <div key={c._id} className="row" style={{ alignItems: "center", justifyContent: "space-between" }}>
                    <button type="button" className={`btn btn-sm ${selCat === c._id ? "btn-primary" : "btn-secondary"}`} onClick={() => setSelCat(c._id)}>{c.name} ({c.productCount})</button>
                    <button type="button" className="btn btn-sm btn-danger" onClick={() => delCat(c._id)} disabled={act.busy} aria-label={`Delete ${c.name}`}>Delete</button>
                  </div>
                ))}
                <form className="row" onSubmit={addCat}>
                  <Field label="New category"><input className="input" value={catName} onChange={(e) => setCatName(e.target.value)} /></Field>
                  <button className="btn btn-primary" disabled={act.busy || !catName.trim()}>Add</button>
                </form>
              </>
            )}
          </div>

          <div className="card stack">
            <h2>3. {isService ? "Add a service" : "Add a product"}</h2>
            {!selCat ? <Empty title="Select a category" /> : (
              <form className="stack" onSubmit={addProduct}>
                <Field label="Name" error={act.errors.name}><input className="input" value={pf.name} onChange={(e) => setPf({ ...pf, name: e.target.value })} /></Field>
                <div className="row">
                  <Field label={`Price (${currency})`} error={act.errors.price}><input className="input" inputMode="decimal" value={pf.price} onChange={(e) => setPf({ ...pf, price: e.target.value })} /></Field>
                  <Field label="Cost (optional)" error={act.errors.costPrice}><input className="input" inputMode="decimal" value={pf.costPrice} onChange={(e) => setPf({ ...pf, costPrice: e.target.value })} /></Field>
                </div>
                <div className="row">
                  <Field label="SKU (optional)" error={act.errors.sku}><input className="input" value={pf.sku} onChange={(e) => setPf({ ...pf, sku: e.target.value })} /></Field>
                  {pf.trackStock && <Field label="Opening stock" error={act.errors.stockQuantity}><input className="input" inputMode="numeric" value={pf.stockQuantity} onChange={(e) => setPf({ ...pf, stockQuantity: e.target.value })} /></Field>}
                </div>
                <label className="row small" style={{ alignItems: "center" }}><input type="checkbox" checked={pf.trackStock} onChange={(e) => setPf({ ...pf, trackStock: e.target.checked })} /> Track stock for this item</label>
                <button className="btn btn-accent" disabled={act.busy || !pf.name.trim() || !pf.price}>Add</button>
              </form>
            )}
          </div>
        </div>
      )}

      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: ".75rem" }}>
          <h2 style={{ margin: 0 }}>All {isService ? "items" : "products"}</h2>
          <div className="row" style={{ alignItems: "center" }}>
            {isOwner && <label className="small row" style={{ alignItems: "center" }}><input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} /> Show inactive</label>}
            <input className="input" style={{ width: 220 }} placeholder="Search name or SKU" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </div>
        <Loader state={products}>{(d) => d.products.length === 0 ? <Empty title="No products found">{isOwner ? "Create a department and category above, then add products." : "Ask the business owner to add products."}</Empty> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Name</th><th>Department / Category</th><th>SKU</th><th>Price</th>{isOwner && <th>Cost</th>}<th>Stock</th><th>Status</th>{isOwner && <th></th>}</tr></thead>
            <tbody>{d.products.map((p) => editing === p._id ? (
              <tr key={p._id}>
                <td><input className="input" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></td>
                <td className="muted">{p.department?.name} / {p.category?.name}</td><td>{p.sku}</td>
                <td><input className="input" style={{ width: 110 }} value={edit.price} onChange={(e) => setEdit({ ...edit, price: e.target.value })} /></td>
                <td>{formatMoney(p.costPrice, currency)}</td>
                <td>{p.trackStock ? (<>{p.stockQuantity} <input className="input" style={{ width: 90 }} placeholder="+/- qty" aria-label="Stock adjustment" value={edit.adjust} onChange={(e) => setEdit({ ...edit, adjust: e.target.value })} /></>) : "—"}</td>
                <td><label className="small"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Active</label></td>
                <td style={{ whiteSpace: "nowrap" }}><button type="button" className="btn btn-sm btn-primary" onClick={() => saveEdit(p)} disabled={act.busy}>Save</button> <button type="button" className="btn btn-sm btn-secondary" onClick={() => setEditing(null)}>Cancel</button></td>
              </tr>
            ) : (
              <tr key={p._id}>
                <td>{p.name}</td><td className="muted">{p.department?.name} / {p.category?.name}</td><td>{p.sku || "—"}</td>
                <td>{formatMoney(p.price, currency)}</td>{isOwner && <td>{formatMoney(p.costPrice, currency)}</td>}
                <td>{p.trackStock ? p.stockQuantity : "n/a"}</td><td><Badge value={p.active ? "active" : "suspended"} /></td>
                {isOwner && <td style={{ whiteSpace: "nowrap" }}>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={() => { setEditing(p._id); setEdit({ name: p.name, price: fromMinor(p.price, currency), active: p.active, adjust: "" }); }}>Edit</button>{" "}
                  <button type="button" className="btn btn-sm btn-danger" onClick={() => removeProduct(p)} disabled={act.busy}>Delete</button>
                </td>}
              </tr>
            ))}</tbody>
          </table></div>
        )}</Loader>
      </div>
    </>
  );
}
