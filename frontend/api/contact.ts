// Vercel serverless function for the contact form: POST /api/contact.
//
// Lives inside the frontend so the whole site deploys as ONE standard Vite
// project on Vercel (no monorepo "Services" split, no Go runtime). Same shape
// as the Go handler in /backend (which stays for local dev / reference): it
// validates the body and emails it via SMTP using the same env vars.
import type { VercelRequest, VercelResponse } from "@vercel/node";
import nodemailer from "nodemailer";

type Body = { name?: string; email?: string; message?: string };

function validate(name: string, email: string, message: string): string {
  if (!name) return "name is required";
  if (!email || !email.includes("@") || !email.includes(".")) return "a valid email is required";
  if (message.length < 5) return "message is too short";
  if (message.length > 5000) return "message is too long";
  return "";
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", process.env.CORS_ALLOW_ORIGIN ?? "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "method not allowed" });

  const raw: Body = typeof req.body === "string" ? safeParse(req.body) : req.body ?? {};
  const name = (raw.name ?? "").trim();
  const email = (raw.email ?? "").trim();
  const message = (raw.message ?? "").trim();

  const invalid = validate(name, email, message);
  if (invalid) return res.status(400).json({ error: invalid });

  const { SMTP_HOST, SMTP_USER, SMTP_PASS } = process.env;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const to = process.env.CONTACT_TO ?? SMTP_USER;
  const from = process.env.CONTACT_FROM ?? SMTP_USER;

  // No SMTP configured → log and succeed (dev fallback, mirrors the Go handler).
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    console.log(`contact (unsent — no SMTP): ${name} <${email}>: ${message}`);
    return res.status(200).json({ ok: true });
  }

  try {
    const transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port,
      secure: port === 465, // 587 uses STARTTLS, not implicit TLS
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
    await transport.sendMail({
      from,
      to,
      replyTo: `${name} <${email}>`,
      subject: `Portfolio contact — ${name}`,
      text: `${message}\n\n— ${name} <${email}>`,
    });
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("contact: delivery failed:", e);
    return res.status(502).json({ error: "could not send message, please email directly" });
  }
}

function safeParse(s: string): Body {
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
