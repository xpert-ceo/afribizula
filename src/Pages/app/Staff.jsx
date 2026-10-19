import { useState } from "react";
import { Link } from "react-router-dom";
import api from "../../lib/api";
import useFetch from "../../lib/useFetch";
import useAction from "../../lib/useAction";
import { useAuth } from "../../context/AuthContext";
import { formatDate } from "../../lib/format";
import { Alert, Badge, Empty, Field, Loader, PageHeader } from "../../components/app/ui";

export default function Staff() {
  const { session } = useAuth();
  const list = useFetch("/staff");
  const act = useAction();
  const blank = { name: "", email: "", password: "" };
  const [f, setF] = useState(blank);
  const tracking = session.business?.settings?.staffSalesTracking;

  const create = (e) => {
    e.preventDefault();
    act.run(async () => { const { data } = await api.post("/staff", f); setF(blank); list.reload(); return data.staff; },
      (s) => `${s.name} can now sign in with ${s.email} and the temporary password you set. They will be asked to change it.`);
  };
  const setStatus = (s, status) => act.run(async () => { await api.patch(`/staff/${s._id}`, { status }); list.reload(); },
    status === "suspended" ? `${s.name} can no longer sign in` : `${s.name} has been reactivated`);

  return (
    <>
      <PageHeader title="Staff" subtitle="Staff can record sales and view products. They cannot change inventory, settings or billing." />
      {tracking === "off" && <Alert kind="info">Staff sales tracking is off, so sales will not be attributed to staff. <Link to="/app/settings">Change in Settings</Link></Alert>}
      <Alert kind={act.msg.kind} onClose={act.clear}>{act.msg.text}</Alert>
      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <form className="card stack" onSubmit={create} noValidate>
          <h2>Add a staff member</h2>
          <Field label="Full name" error={act.errors.name}><input className="input" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Email" error={act.errors.email}><input className="input" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Temporary password" error={act.errors.password} hint="At least 8 characters with a letter and a number. Share it with them privately.">
            <input className="input" type="text" autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          </Field>
          <button className="btn btn-primary" disabled={act.busy}>Add staff member</button>
        </form>
        <div className="card">
          <h2>Team</h2>
          <Loader state={list}>{(d) => d.staff.length === 0 ? <Empty title="No staff yet" /> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Name</th><th>Email</th><th>Status</th><th>Last sign-in</th><th></th></tr></thead>
              <tbody>{d.staff.map((s) => (
                <tr key={s._id}>
                  <td>{s.name}{s.mustChangePassword && <div className="muted small">Has not changed temporary password</div>}</td>
                  <td>{s.email}</td><td><Badge value={s.status} /></td><td>{formatDate(s.lastLoginAt, true)}</td>
                  <td>{s.status === "active"
                    ? <button type="button" className="btn btn-sm btn-danger" onClick={() => setStatus(s, "suspended")} disabled={act.busy}>Suspend</button>
                    : <button type="button" className="btn btn-sm btn-secondary" onClick={() => setStatus(s, "active")} disabled={act.busy}>Reactivate</button>}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}</Loader>
        </div>
      </div>
    </>
  );
}
