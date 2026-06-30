import { motion } from "framer-motion";
import { Section } from "./Section";
import { aboutBlurb, education, languages, tools } from "../data/about";
import { fadeUp } from "../lib/motion";

function Pill({ children }: { children: string }) {
  return (
    <span className="rounded-full border border-border bg-surface-2 px-3 py-1 text-sm text-muted">
      {children}
    </span>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      variants={fadeUp}
      className="glass rounded-card p-6 transition hover:-translate-y-1 hover:border-accent/40"
    >
      {children}
    </motion.div>
  );
}

export function About() {
  return (
    <Section id="about" eyebrow="Who I am" title="About Me">
      <motion.p
        variants={fadeUp}
        className="mb-12 max-w-3xl text-lg leading-relaxed text-muted"
      >
        {aboutBlurb}
      </motion.p>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <h3 className="mb-4 font-display text-xl font-semibold text-ink">Education</h3>
          <div className="space-y-5">
            {education.map((e) => (
              <div key={e.degree}>
                <p className="font-medium text-ink">{e.degree}</p>
                <p className="text-sm text-accent">{e.school}</p>
                <ul className="mt-2 space-y-1 text-sm text-muted">
                  {e.details.map((d) => (
                    <li key={d}>{d}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 font-display text-xl font-semibold text-ink">Languages</h3>
          <div className="flex flex-wrap gap-2">
            {languages.map((l) => (
              <Pill key={l}>{l}</Pill>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="mb-4 font-display text-xl font-semibold text-ink">Tools & Methods</h3>
          <div className="flex flex-wrap gap-2">
            {tools.map((t) => (
              <Pill key={t}>{t}</Pill>
            ))}
          </div>
        </Card>
      </div>
    </Section>
  );
}
