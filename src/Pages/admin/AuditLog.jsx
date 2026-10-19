import { useState } from "react";
import useFetch from "../../lib/useFetch";
import { formatDate } from "../../lib/format";
import { Empty, Loader, PageHeader } from "../../components/app/ui";
import { Pager } from "./Users";

export default function AuditLog() {
  const [page, setPage] = useState(1);
  const list = useFetch(`/admin/audit-log?page=${page}`);
  return (
    <>
      <PageHeader title="Audit log" subtitle="Administrative and security-relevant actions" />
      <div className="card">
        <Loader state={list}>{(d) => d.entries.length === 0 ? <Empty title="No entries yet" /> : (
          <>
            <div className="table-wrap"><table className="table">
              <thead><tr><th>When</th><th>Actor</th><th>Action</th><th>Target</th><th>Details</th></tr></thead>
              <tbody>{d.entries.map((e) => (
                <tr key={e._id}><td>{formatDate(e.createdAt, true)}</td><td>{e.actor?.email || "system"}<div className="muted small">{e.actor?.role}</div></td>
                  <td><code>{e.action}</code></td><td className="small">{e.targetType} {e.targetId ? String(e.targetId).slice(-6) : ""}</td>
                  <td className="small" style={{ maxWidth: 320, wordBreak: "break-word" }}>{e.details && Object.keys(e.details).length ? JSON.stringify(e.details) : ""}</td></tr>
              ))}</tbody>
            </table></div>
            <Pager d={d} page={page} setPage={setPage} />
          </>
        )}</Loader>
      </div>
    </>
  );
}
