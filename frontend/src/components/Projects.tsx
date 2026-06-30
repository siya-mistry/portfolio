import { motion } from "framer-motion";
import { Section } from "./Section";
import { projects, type Project } from "../data/projects";
import { fadeUp } from "../lib/motion";

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M7 17 17 7M7 7h10v10" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <motion.article
      variants={fadeUp}
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="glass group relative flex flex-col overflow-hidden rounded-card p-6"
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-accent/0 blur-3xl transition-all duration-500 group-hover:bg-accent/20" />

      <div className="relative flex items-start justify-between gap-4">
        <h3 className="font-display text-2xl font-semibold text-ink">{project.title}</h3>
        <div className="flex gap-2 text-muted">
          {project.repo && (
            <a
              href={project.repo}
              target="_blank"
              rel="noreferrer"
              aria-label={`${project.title} source`}
              className="transition hover:text-ink"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                <path d="M12 .5C5.73.5.5 5.74.5 12.02c0 5.1 3.29 9.42 7.86 10.95.58.11.79-.25.79-.56 0-.27-.01-1.16-.02-2.1-3.2.7-3.88-1.36-3.88-1.36-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.16.08 1.77 1.2 1.77 1.2 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.04 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.58.23 2.75.11 3.04.74.81 1.19 1.83 1.19 3.09 0 4.42-2.69 5.39-5.25 5.68.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A11.53 11.53 0 0 0 23.5 12C23.5 5.74 18.27.5 12 .5Z" />
              </svg>
            </a>
          )}
        </div>
      </div>

      <p className="relative mt-3 flex-1 text-muted">{project.blurb}</p>

      <div className="relative mt-5 flex flex-wrap gap-2">
        {project.tech.map((t) => (
          <span
            key={t}
            className="rounded-full bg-surface-2 px-2.5 py-1 text-xs font-medium text-muted"
          >
            {t}
          </span>
        ))}
      </div>

      {project.link && (
        <a
          href={project.link}
          target="_blank"
          rel="noreferrer"
          className="relative mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-accent transition group-hover:gap-2.5"
        >
          Visit site <ArrowIcon />
        </a>
      )}
    </motion.article>
  );
}

export function Projects() {
  return (
    <Section
      id="projects"
      eyebrow="Things I've built"
      title="Projects"
      className="bg-surface-2/50"
    >
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <ProjectCard key={p.title} project={p} />
        ))}
      </div>
    </Section>
  );
}
