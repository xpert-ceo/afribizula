import { Link } from "react-router-dom";
import { useAuth, homeFor } from "../context/AuthContext";
import "../styles/app.css";

export default function NotFound() {
  const { session } = useAuth();
  return (
    <div className="center-page">
      <div className="card stack" style={{ maxWidth: 420, textAlign: "center" }}>
        <h1>Page not found</h1>
        <p className="muted">The page you are looking for does not exist or has moved.</p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Link className="btn btn-primary" to={session ? homeFor(session) : "/"}>{session ? "Go to my dashboard" : "Go to the homepage"}</Link>
        </div>
      </div>
    </div>
  );
}
