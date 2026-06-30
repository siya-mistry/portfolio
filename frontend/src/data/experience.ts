export type ExperienceItem = {
  role: string;
  org: string;
  period: string;
  details: string[];
  url?: string;
  photo?: string;
  polaroids?: Array<{ src: string; caption?: string }>;
};

export const experience: ExperienceItem[] = [
  {
    role: "Software Engineer",
    org: "Krown Petroleum",
    period: "Feb 2026 – Present",
    url: "https://krownpetro.com",
    details: [
      "Develop fuel technology products for the convenience industry.",
      "Own Krown Connect end to end as the sole engineer, a production operations platform supportingc cross-team use.",
      "Build and deploy full-stack apps with React, FastAPI, Python, and PostgreSQL on AWS.",
      "Reduce inventory tracking time by 80% by replacing manual workflows with centralized software.",
    ],
  },
  {
    role: "Software Engineer Intern",
    org: "Guidewire Software",
    period: "May 2025 – Aug 2025",
    url: "https://www.guidewire.com",
    photo: "/media/exp/guidewire.webp",
    details: [
      "Developed cloud-native infrastructure and backend tooling using Go on AWS and Kubernetes.",
      "Supported production deployments and CI/CD workflows for enterprise insurance platforms.",
    ],
  },
  {
    role: "Computer Science Teaching Assistant",
    org: "University of Alabama at Birmingham",
    period: "Jun 2024 – Dec 2024",
    url: "https://www.uab.edu",
    details: [
      "Mentored students through core computer science coursework in office hours and lab sessions.",
      "Reviewed and graded assignments, guiding students through debugging and problem-solving.",
    ],
  },
  {
    role: "Data Intern",
    org: "Black Warrior Riverkeeper",
    period: "Aug 2022 – May 2023",
    url: "https://blackwarriorriver.org",
    polaroids: [
      { src: "/media/exp/bwr-waders.webp", caption: "owning data" },
      { src: "/media/exp/bwr-sample.webp", caption: "from the source" },
      { src: "/media/exp/bwr.webp", caption: "to the report" },
    ],
    details: [
      "Built Python scripts to extract and organize data from 300+ environmental reports.",
      "Analyzed datasets and regulatory documents to flag potential Clean Water Act violations.",
    ],
  },
];
