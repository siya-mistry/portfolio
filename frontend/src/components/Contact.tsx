import { useState, type FormEvent } from "react";
import { motion } from "framer-motion";
import { Section } from "./Section";
import { site } from "../data/site";
import { fadeUp } from "../lib/motion";

type Status = "idle" | "submitting" | "success" | "error";

export function Contact() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string>("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError("");

    const form = e.currentTarget;
    const data = new FormData(form);
    const payload = {
      name: String(data.get("name") ?? "").trim(),
      email: String(data.get("email") ?? "").trim(),
      message: String(data.get("message") ?? "").trim(),
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error || `Request failed (${res.status})`);
      }
      setStatus("success");
      form.reset();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const inputCls =
    "w-full rounded-xl border border-white/60 bg-white/55 backdrop-blur px-4 py-3 text-ink placeholder:text-muted/60 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30";

  return (
    <Section id="contact" eyebrow="Let's talk" title="Get in touch">
      <div className="grid gap-10 lg:grid-cols-2">
        <motion.div variants={fadeUp}>
          <p className="text-lg leading-relaxed text-muted">
            I'm open to new-grad and internship software engineering roles, freelance
            web work, and interesting collaborations. The fastest way to reach me is the
            form — or email me directly.
          </p>
          <a
            href={`mailto:${site.email}`}
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold text-ink transition hover:border-accent hover:bg-surface"
          >
            {site.email}
          </a>
        </motion.div>

        <motion.form variants={fadeUp} onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <input name="name" required placeholder="Your name" className={inputCls} />
            <input
              name="email"
              type="email"
              required
              placeholder="Your email"
              className={inputCls}
            />
          </div>
          <textarea
            name="message"
            required
            rows={5}
            placeholder="Your message"
            className={`${inputCls} resize-none`}
          />

          <button
            type="submit"
            disabled={status === "submitting"}
            className="w-full rounded-xl bg-accent px-6 py-3 font-semibold text-white transition hover:shadow-[0_10px_30px_rgba(255,77,141,0.35)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === "submitting" ? "Sending…" : "Send message"}
          </button>

          {status === "success" && (
            <p className="text-sm font-medium text-accent">
              Thanks — your message is on its way. I'll get back to you soon.
            </p>
          )}
          {status === "error" && (
            <p className="text-sm text-red-400">{error}</p>
          )}
        </motion.form>
      </div>
    </Section>
  );
}
