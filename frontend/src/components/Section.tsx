import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { fadeUp, stagger, viewportOnce } from "../lib/motion";

type SectionProps = {
  id: string;
  eyebrow?: string;
  title: string;
  children: ReactNode;
  className?: string;
};

export function Section({ id, eyebrow, title, children, className = "" }: SectionProps) {
  return (
    <section
      id={id}
      className={`relative scroll-mt-24 overflow-hidden py-24 sm:py-32 ${className}`}
    >
      <div className="relative mx-auto w-full max-w-6xl px-6">
        <motion.div
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={viewportOnce}
        >
          <motion.div variants={fadeUp} className="mb-12">
            {eyebrow && (
              <p className="mb-2 font-display text-sm font-medium uppercase tracking-[0.25em] text-accent">
                {eyebrow}
              </p>
            )}
            <h2 className="font-display text-4xl font-semibold text-ink sm:text-5xl">
              {title}
            </h2>
          </motion.div>
          {children}
        </motion.div>
      </div>
    </section>
  );
}
