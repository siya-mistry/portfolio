import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { sections, site } from "../data/site";
import { useScrollSpy } from "../lib/useScrollSpy";
import { SocialLinks } from "./SocialLinks";

const ids = sections.map((s) => s.id);

export function Navbar() {
  const active = useScrollSpy(ids);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled
          ? "border-b border-border bg-bg/80 backdrop-blur-md"
          : "border-b border-transparent"
      }`}
    >
      <nav className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6">
        <a
          href="#top"
          className="font-display text-lg font-semibold tracking-tight text-ink"
        >
          {site.name.split(" ")[0]}
          <span className="text-accent">.</span>
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className={`relative rounded-full px-4 py-2 text-sm transition-colors ${
                active === s.id ? "text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {active === s.id && (
                <motion.span
                  layoutId="nav-pill"
                  className="absolute inset-0 -z-10 rounded-full bg-surface-2"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
              {s.label}
            </a>
          ))}
        </div>

        <SocialLinks className="hidden sm:flex" />
      </nav>
    </motion.header>
  );
}
