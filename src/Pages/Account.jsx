import { useState } from "react";
import api from "../lib/api";
import useAction from "../lib/useAction";
import { useAuth } from "../context/AuthContext";
import { Alert, Field, PageHeader } from "../components/app/ui";

export default function Account() {
  const { session, applySession } = useAuth();
  const act = useAction();
  const [f, setF] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const forced = session.user.mustChangePassword;

  const submit = (e) => {
    e.preventDefault();
    if (f.newPassword !== f.confirm) return act.fail("The new passwords do not match");
    act.run(async () => {
      const { data } = await api.post("/auth/change-password", { currentPassword: f.currentPassword, newPassword: f.newPassword });
      applySession(data);
      setF({ currentPassword: "", newPassword: "", confirm: "" });
    }, "Password changed");
  };

  return (
    <>
      <PageHeader title="My account" subtitle={`${session.user.name} · ${session.user.email} · ${session.user.role}`} />
      {forced && <Alert kind="warn">You are using a temporary password. Please choose a new one to continue.</Alert>}
      <Alert kind={act.msg.kind} onClose={act.clear}>{act.msg.text}</Alert>
      <form className="card stack" style={{ maxWidth: 480 }} onSubmit={submit} noValidate>
        <h2>Change password</h2>
        <Field label="Current password" error={act.errors.currentPassword}><input className="input" type="password" autoComplete="current-password" value={f.currentPassword} onChange={(e) => setF({ ...f, currentPassword: e.target.value })} /></Field>
        <Field label="New password" error={act.errors.newPassword} hint="At least 8 characters with a letter and a number"><input className="input" type="password" autoComplete="new-password" value={f.newPassword} onChange={(e) => setF({ ...f, newPassword: e.target.value })} /></Field>
        <Field label="Confirm new password"><input className="input" type="password" autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} /></Field>
        <div><button className="btn btn-primary" disabled={act.busy}>{act.busy ? "Saving…" : "Change password"}</button></div>
      </form>
    </>
  );
}
