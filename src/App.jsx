import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

import Home from "./Pages/Home";
import Login from "./Pages/auth/Login";
import Register from "./Pages/auth/Register";
import ForgotPassword from "./Pages/auth/ForgotPassword";
import ResetPassword from "./Pages/auth/ResetPassword";
import NotFound from "./Pages/NotFound";
import { RequireAuth, GuestOnly } from "./components/routing/Guards";
import { FullPageSpinner } from "./components/app/ui";

// Signed-in areas are code-split so the marketing page stays light.
const AppShell = lazy(() => import("./components/app/AppShell"));
const Onboarding = lazy(() => import("./Pages/Onboarding"));
const Account = lazy(() => import("./Pages/Account"));
const Dashboard = lazy(() => import("./Pages/app/Dashboard"));
const Inventory = lazy(() => import("./Pages/app/Inventory"));
const Sales = lazy(() => import("./Pages/app/Sales"));
const Staff = lazy(() => import("./Pages/app/Staff"));
const Settings = lazy(() => import("./Pages/app/Settings"));
const Billing = lazy(() => import("./Pages/app/Billing"));
const BillingCallback = lazy(() => import("./Pages/app/BillingCallback"));
const AmbassadorDashboard = lazy(() => import("./Pages/ambassador/AmbassadorDashboard"));
const AdminOverview = lazy(() => import("./Pages/admin/Overview"));
const AdminUsers = lazy(() => import("./Pages/admin/Users"));
const AdminBusinesses = lazy(() => import("./Pages/admin/Businesses"));
const AdminAmbassadors = lazy(() => import("./Pages/admin/Ambassadors"));
const AdminCommissions = lazy(() => import("./Pages/admin/Commissions"));
const AdminPayouts = lazy(() => import("./Pages/admin/Payouts"));
const AdminPayments = lazy(() => import("./Pages/admin/Payments"));
const AdminSettings = lazy(() => import("./Pages/admin/Settings"));
const AdminAuditLog = lazy(() => import("./Pages/admin/AuditLog"));

const guest = (el) => <GuestOnly>{el}</GuestOnly>;
const ownerOnly = (el) => <RequireAuth roles={["owner"]}>{el}</RequireAuth>;

export default function App() {
  return (
    <Suspense fallback={<FullPageSpinner />}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={guest(<Login />)} />
        <Route path="/register" element={guest(<Register />)} />
        <Route path="/forgot-password" element={guest(<ForgotPassword />)} />
        {/* Not guest-only: an admin-generated link may be opened in any browser. */}
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/onboarding" element={<RequireAuth roles={["owner"]} allowUnonboarded><Onboarding /></RequireAuth>} />

        <Route path="/app" element={<RequireAuth roles={["owner", "staff"]}><AppShell /></RequireAuth>}>
          <Route index element={<Dashboard />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="sales" element={<Sales />} />
          <Route path="staff" element={ownerOnly(<Staff />)} />
          <Route path="settings" element={ownerOnly(<Settings />)} />
          <Route path="billing" element={ownerOnly(<Billing />)} />
          <Route path="billing/callback" element={ownerOnly(<BillingCallback />)} />
          <Route path="account" element={<Account />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/ambassador" element={<RequireAuth roles={["ambassador"]}><AppShell /></RequireAuth>}>
          <Route index element={<AmbassadorDashboard />} />
          <Route path="account" element={<Account />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="/admin" element={<RequireAuth roles={["admin"]}><AppShell /></RequireAuth>}>
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="businesses" element={<AdminBusinesses />} />
          <Route path="ambassadors" element={<AdminAmbassadors />} />
          <Route path="commissions" element={<AdminCommissions />} />
          <Route path="payouts" element={<AdminPayouts />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="audit" element={<AdminAuditLog />} />
          <Route path="account" element={<Account />} />
          <Route path="*" element={<NotFound />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
