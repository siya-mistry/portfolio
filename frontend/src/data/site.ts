export const site = {
  name: "Siyona Mistry",
  role: "Software Engineer",
  tagline: "I build clean, reliable software, from React frontends to FastAPI and Go backends.",
  email: "siyonamistry@gmail.com",
  emailAlt: "smistry48@gatech.edu",
  calendly: "https://calendly.com/siyonamistry/30min",
  location: "Birmingham, AL",
  portrait: "/media/portrait.webp",
  heroTags: ["React", "FastAPI", "Python", "AWS"],
  resumeUrl: "",
  socials: {
    github: "https://github.com/siya-mistry",
    linkedin: "https://www.linkedin.com/in/siyapmistry",
  },
} as const;

export const sections = [
  { id: "about", label: "about" },
  { id: "projects", label: "projects" },
  { id: "experience", label: "experience" },
  { id: "contact", label: "contact" },
] as const;
