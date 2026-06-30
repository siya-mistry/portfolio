import { motion } from "framer-motion";
import { Section } from "./Section";
import { experience } from "../data/experience";
import { fadeUp } from "../lib/motion";

export function Experience() {
  return (
    <Section id="experience" eyebrow="Where I've worked" title="Experience">
      <div className="relative">
        <div className="absolute left-0 top-2 hidden h-full w-px bg-border sm:block" />

        <div className="space-y-10">
          {experience.map((item) => (
            <motion.div
              key={`${item.role}-${item.org}`}
              variants={fadeUp}
              className="relative sm:pl-10"
            >
              <span className="absolute left-[-5px] top-2 hidden h-2.5 w-2.5 rounded-full bg-accent ring-4 ring-bg sm:block" />

              <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <h3 className="font-display text-xl font-semibold text-ink">{item.role}</h3>
                <span className="text-sm text-muted">{item.period}</span>
              </div>
              <p className="text-accent">{item.org}</p>
              <ul className="mt-3 space-y-1.5">
                {item.details.map((d) => (
                  <li key={d} className="flex gap-2 text-muted">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-muted" />
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </Section>
  );
}
