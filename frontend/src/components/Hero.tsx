import { site } from "../data/site";
import { SocialLinks } from "./SocialLinks";

const firstName = site.name.split(" ")[0];
const lastName = site.name.split(" ").slice(1).join(" ");

export function Hero() {
  return (
    <section
      id="top"
      className="relative flex min-h-screen items-center overflow-hidden pt-24"
    >
      <div className="glow pointer-events-none absolute inset-0" />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-6 pb-16 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="order-2 lg:order-1">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-accent-soft px-4 py-1.5 text-sm font-medium text-accent">
            <span className="h-2 w-2 rounded-full bg-accent" />
            {site.location} · Available for work
          </div>

          <h1 className="font-display text-6xl font-bold leading-[0.95] tracking-tight sm:text-7xl">
            <span className="text-ink">{firstName}</span>
            <br />
            <span className="text-gradient">{lastName}</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            <span className="font-medium text-ink">{site.role}.</span> {site.tagline}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a
              href="#projects"
              className="rounded-full bg-accent px-6 py-3 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(255,77,141,0.35)]"
            >
              View my work
            </a>
            <a
              href="#contact"
              className="rounded-full border border-border bg-surface px-6 py-3 text-sm font-semibold text-ink transition hover:border-accent hover:text-accent"
            >
              Get in touch
            </a>
            <SocialLinks />
          </div>
        </div>

        <div className="relative order-1 mx-auto w-full max-w-xs lg:order-2">
          <div
            aria-hidden
            className="absolute inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-accent/30 to-accent-2/40 blur-3xl"
          />

          <div className="glass relative overflow-hidden rounded-[2rem]">
            <div className="grid-texture absolute inset-0 opacity-50" />
            <img
              src={site.portrait}
              alt={`${site.name}, ${site.role}`}
              loading="eager"
              width={894}
              height={1581}
              className="relative z-10 mx-auto block w-full object-contain object-bottom"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-20 bg-gradient-to-t from-surface to-transparent" />
          </div>
        </div>
      </div>
    </section>
  );
}
