import GlassCard from "../ui/GlassCard";

// Shared layout for sign-in / sign-up / password pages (keeps the original design).
export default function AuthLayout({ badge, title, subtitle, cardTitle, children }) {
  return (
    <section className="auth-page">
      <div className="auth-container">
        <div className="auth-left">
          <span className="auth-badge">{badge}</span>
          <h1 className="auth-title">
            {title.map((w) => (<span key={w}>{w}<br /></span>))}
          </h1>
          <p className="auth-subtitle">{subtitle}</p>
        </div>
        <div className="auth-card">
          <GlassCard>
            <h2 className="auth-card-title">{cardTitle}</h2>
            {children}
          </GlassCard>
        </div>
      </div>
      <style>{authStyles}</style>
    </section>
  );
}

const authStyles = `
.auth-page{min-height:100vh;background:#fafafa;display:flex;align-items:center;justify-content:center;padding:2rem;}
.auth-container{width:100%;max-width:1100px;display:grid;grid-template-columns:1fr 500px;gap:4rem;align-items:center;}
.auth-title{font-size:4rem;line-height:1;font-weight:700;color:#111;margin:1rem 0;letter-spacing:-3px;}
.auth-subtitle{color:#666;max-width:500px;line-height:1.7;}
.auth-badge{color:#7C3AED;font-weight:600;}
.auth-card-title{margin-bottom:1.5rem;color:#111;font-size:1.8rem;font-weight:600;}
.form-group{display:flex;flex-direction:column;gap:1rem;}
.input-wrap{position:relative;display:flex;align-items:center;}
.input-wrap > svg:first-child{position:absolute;left:15px;color:#777;}
.input-wrap input{width:100%;padding:1rem 3rem;border-radius:14px;border:1px solid rgba(0,0,0,.12);outline:none;font-size:16px;background:white;box-sizing:border-box;}
.input-wrap input:focus{border-color:#7C3AED;}
.input-wrap.invalid input{border-color:#dc2626;}
.field-error{color:#b91c1c;font-size:.83rem;margin-top:-.6rem;}
.eye-btn{position:absolute;right:15px;border:none;background:none;cursor:pointer;display:flex;}
.auth-link,.purple-link{color:#7C3AED;text-decoration:none;font-weight:500;}
.bottom-text{text-align:center;color:#666;}
.form-alert{padding:.75rem 1rem;border-radius:12px;font-size:.92rem;}
.form-alert.error{background:#fef2f2;color:#991b1b;border:1px solid #fecaca;}
.form-alert.success{background:#f0fdf4;color:#166534;border:1px solid #bbf7d0;}
.form-alert.info{background:#eff6ff;color:#1e40af;border:1px solid #bfdbfe;}
.account-type{display:grid;grid-template-columns:1fr 1fr;gap:.5rem;}
.account-type button{padding:.75rem;border-radius:12px;border:1px solid rgba(0,0,0,.12);background:#fff;cursor:pointer;font:inherit;text-align:left;}
.account-type button.on{border-color:#7C3AED;outline:2px solid #ddd6fe;}
.account-type small{display:block;color:#666;font-size:.78rem;}
@media(max-width:1024px){.auth-container{grid-template-columns:1fr;gap:2.5rem;}.auth-title{font-size:3rem;}}
@media(max-width:600px){.auth-page{padding:1.25rem;}.auth-title{font-size:2.2rem;}}
`;
