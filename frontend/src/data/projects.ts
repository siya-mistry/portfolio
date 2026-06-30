export type Project = {
  title: string;
  blurb: string;
  details?: string[];
  tech: string[];
  link?: string;
  repo?: string;
  highlight?: boolean;
};

export const projects: Project[] = [
  {
    title: "PJ Gas",
    blurb:
      "Customer-facing site for live gas prices, deals, and store info. Mobile-friendly and SEO-focused.",
    details: [
      
      "Live gas prices, deals, offers, and store information for a local gas station, all customer facing.",
      "An admin side to configure custom ads and deals on the fly.",
      "Mobile-friendly, SEO-focused interface built to improve customer engagement and online visibility.",
    ],
    tech: ["Python", "FastAPI", "PostgreSQL", "React", "TypeScript"],
    link: "https://pjgas.com",
    highlight: true,
  },
  {
    title: "Krown Connect",
    blurb:
      "Production platform I built for cross-team use at Krown Petroleum. Cut inventory tracking time by 80%.",
    details: [
      "Sole engineer on a production company wide operations platform, owning architecture, deployment, and the full software lifecycle.",
      "Full-stack apps in React, FastAPI, Python, and PostgreSQL on AWS (EC2, RDS, S3, IAM), with scalable schemas and REST APIs for inventory, receipts, and workflow automation.",
      "Cut inventory tracking time by 80% and saved about 30 minutes per form by replacing manual workflows with centralized software and automated document generation.",
      "Secure auth with JWT, RBAC, HTTPS, and AWS IAM, plus containerized services with Docker, Nginx, and SSL/TLS.",
      "Hybrid cloud and on-prem setup using WebSockets, a Raspberry Pi, and a NAS for real-time printing and document management.",
    ],
    tech: ["React", "TypeScript", "FastAPI", "PostgreSQL", "AWS", "Docker"],
    link: "https://krownconnect.com",
    highlight: true,
  },
  {
    title: "Chemical Inventory Management System",
    blurb:
      "Full-stack lab inventory app with an iOS frontend and Flask backend, with auth, barcode generation, and REST APIs.",
    details: [
      "Full-stack lab inventory app with an iOS frontend and a Flask backend, built as a senior capstone project.",
      "Authentication, barcode generation, inventory tracking, and REST APIs for chemical and lab inventory.",
    ],
    tech: ["Swift", "Python", "Flask"],
    repo: "https://github.com/siya-mistry/cs499",
  },
  {
    title: "This Portfolio",
    blurb:
      "A React + TypeScript site rendered as a 3D, flippable magazine, with a serverless Go contact API.",
    details: [
      "The whole portfolio is a scroll-driven, flippable magazine built with custom Three.js shaders that curl and turn each page.",
      "Pages are drawn to canvas and used as GPU textures, with a serverless Go contact API for the message form.",
    ],
    tech: ["React", "TypeScript", "Three.js", "Go"],
    repo: "https://github.com/siya-mistry",
  },
];
