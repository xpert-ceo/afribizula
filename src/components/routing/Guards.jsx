import { Navigate, useLocation } from "react-router-dom";
import { useAuth, homeFor } from "../../context/AuthContext";
import { FullPageSpinner } from "../app/ui";

/**
 * Client-side routing guard. It improves UX only — every API route enforces
 * the same rules on the server.
 */
export function RequireAuth({ roles, allowUnonboarded = false, children }) {
  const { session, loading, bootError } = useAuth();
  const location = useLocation();

  if (loading) return <FullPageSpinner />;
  if (bootError && !session)
    return <div className="center-page"><div className="alert alert-error">{bootError}</div></div>;
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;

  const { user } = session;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(session)} replace />;
  if (user.role === "owner" && !user.onboardingCompleted && !allowUnonboarded) return <Navigate to="/onboarding" replace />;
  if (user.mustChangePassword && !location.pathname.endsWith("/account")) {
    const base = user.role === "staff" || user.role === "owner" ? "/app" : `/${user.role}`;
    return <Navigate to={`${base}/account`} replace />;
  }
  return children;
}

/** For login/register pages: signed-in users go to their home. */
export function GuestOnly({ children }) {
  const { session, loading } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (session) return <Navigate to={homeFor(session)} replace />;
  return children;
}
