import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

const NAV = {
  owner: [
    ["/app", "Dashboard", true], ["/app/inventory", "Inventory"], ["/app/sales", "Sales"],
    ["/app/staff", "Staff"], ["/app/billing", "Subscription"], ["/app/settings", "Settings"], ["/app/account", "Account"],
  ],
  staff: [["/app", "Dashboard", true], ["/app/sales", "Sales"], ["/app/inventory", "Products"], ["/app/account", "Account"]],
  ambassador: [["/ambassador", "Ambassador dashboard", true], ["/ambassador/account", "Account"]],
  admin: [
    ["/admin", "Overview", true], ["/admin/users", "Users"], ["/admin/businesses", "Businesses"],
    ["/admin/ambassadors", "Ambassadors"], ["/admin/commissions", "Commissions"], ["/admin/payouts", "Payouts"],
    ["/admin/payments", "Payments"], ["/admin/settings", "Commission policy"], ["/admin/audit", "Audit log"], ["/admin/account", "Account"],
  ],
};

export default function AppShell() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const role = session.user.role;
  const items = NAV[role] || [];
  const subtitle =
    role === "admin" ? "Main admin" : role === "ambassador" ? "Ambassador" : session.business?.name || "Business";

  return (
    <div className={`shell ${role === "admin" ? "shell-admin" : ""}`}>
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-head">
          <a href="/" className="brand"><span>b</span>izula</a>
          <button type="button" className="menu-btn" onClick={() => setOpen(!open)} aria-label="Toggle menu">☰</button>
        </div>
        <div className="sidebar-sub">{subtitle}</div>
        <nav onClick={() => setOpen(false)}>
          {items.map(([to, label, end]) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? "active" : "")}>{label}</NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="muted small">{session.user.email}</div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => { logout(); navigate("/login"); }}>Sign out</button>
        </div>
      </aside>
      <main className="main"><Outlet /></main>
    </div>
  );
}
