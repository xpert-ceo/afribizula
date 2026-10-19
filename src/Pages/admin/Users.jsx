import { useState } from "react";
import api from "../../lib/api";
import useFetch from "../../lib/useFetch";
import useAction from "../../lib/useAction";
import { formatDate } from "../../lib/format";
import { Alert, Badge, Empty, Loader, PageHeader } from "../../components/app/ui";

export default function Users() {
  const [q, setQ] = useState({ search: "", role: "", status: "", page: 1 });
  const params = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== ""));
  const list = useFetch(`/admin/users?${params}`);
  const act = useAction();
  const [link, setLink] = useState(null);

  const setStatus = (u, status) => {
    const reason = window.prompt(`Reason for ${status === "suspended" ? "suspending" : "reactivating"} ${u.email} (recorded in the audit log):`, "");
    if (reason === null) return;
    act.run(async () => { await api.patch(`/admin/users/${u._id}/status`, { status, reason }); list.reload(); }, `${u.email} is now ${status}`);
  };
  const resetLink = (u) => act.run(async () => { const { data } = await api.post(`/admin/users/${u._id}/password-reset-link`); setLink({ email: u.email, ...data }); });

  return (
    <>
      <PageHeader title="Users" />
      <Alert kind={act.msg.kind} onClose={act.clear}>{act.msg.text}</Alert>
      {link && (
        <div className="card stack" style={{ marginBottom: "1rem" }}>
          <strong>One-time password reset link for {link.email}</strong>
          <span className="code-box" style={{ wordBreak: "break-all" }}>{link.link}</span>
          <span className="muted small">Valid for {link.expiresInMinutes} minutes. Deliver it to the user through a trusted channel. It is not shown again.</span>
          <div><button type="button" className="btn btn-sm btn-secondary" onClick={() => setLink(null)}>Hide</button></div>
        </div>
      )}
      <div className="card">
        <div className="row" style={{ marginBottom: ".75rem" }}>
          <input className="input" style={{ maxWidth: 260 }} placeholder="Search name or email" value={q.search} onChange={(e) => setQ({ ...q, search: e.target.value, page: 1 })} />
          <select className="select" style={{ maxWidth: 160 }} value={q.role} onChange={(e) => setQ({ ...q, role: e.target.value, page: 1 })} aria-label="Role">
            <option value="">All roles</option>{["owner", "staff", "ambassador", "admin"].map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select className="select" style={{ maxWidth: 160 }} value={q.status} onChange={(e) => setQ({ ...q, status: e.target.value, page: 1 })} aria-label="Status">
            <option value="">All statuses</option><option value="active">active</option><option value="suspended">suspended</option>
          </select>
        </div>
        <Loader state={list}>{(d) => d.users.length === 0 ? <Empty title="No users match" /> : (
          <>
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Business</th><th>Status</th><th>Joined</th><th>Last sign-in</th><th></th></tr></thead>
              <tbody>{d.users.map((u) => (
                <tr key={u._id}>
                  <td>{u.name}</td><td>{u.email}</td><td>{u.role}</td><td>{u.business?.name || "—"}</td><td><Badge value={u.status} /></td>
                  <td>{formatDate(u.createdAt)}</td><td>{formatDate(u.lastLoginAt)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>{u.role !== "admin" && (<>
                    {u.status === "active"
                      ? <button type="button" className="btn btn-sm btn-danger" onClick={() => setStatus(u, "suspended")} disabled={act.busy}>Suspend</button>
                      : <button type="button" className="btn btn-sm btn-secondary" onClick={() => setStatus(u, "active")} disabled={act.busy}>Activate</button>}{" "}
                    <button type="button" className="btn btn-sm btn-secondary" onClick={() => resetLink(u)} disabled={act.busy}>Reset link</button>
                  </>)}</td>
                </tr>
              ))}</tbody>
            </table></div>
            <Pager d={d} page={q.page} setPage={(page) => setQ({ ...q, page })} />
          </>
        )}</Loader>
      </div>
    </>
  );
}

export function Pager({ d, page, setPage }) {
  return (
    <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginTop: ".75rem" }}>
      <span className="muted small">{d.total} total</span>
      <div className="row">
        <button type="button" className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <button type="button" className="btn btn-sm btn-secondary" disabled={page * d.limit >= d.total} onClick={() => setPage(page + 1)}>Next</button>
      </div>
    </div>
  );
}
