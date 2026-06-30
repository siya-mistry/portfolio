import { site } from "../data/site";
import { SocialLinks } from "./SocialLinks";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 sm:flex-row">
        <p className="text-sm text-muted">
          © {new Date().getFullYear()} {site.name}. Built with React, TypeScript & Go.
        </p>
        <SocialLinks />
      </div>
    </footer>
  );
}
