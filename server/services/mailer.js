import nodemailer from "nodemailer";

let transport = null;
export const sentMail = []; // populated only by the JSON test transport

export function mailConfigured(config) {
  return Boolean(config.smtp.jsonTransport || config.smtp.host);
}

function getTransport(config) {
  if (transport) return transport;
  if (config.smtp.jsonTransport) transport = nodemailer.createTransport({ jsonTransport: true });
  else
    transport = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    });
  return transport;
}

export async function sendMail(config, { to, subject, text }) {
  if (!mailConfigured(config)) throw new Error("Email is not configured");
  const info = await getTransport(config).sendMail({ from: config.smtp.from, to, subject, text });
  if (config.smtp.jsonTransport) sentMail.push({ to, subject, text });
  return info;
}
