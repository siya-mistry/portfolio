export type EducationItem = {
  degree: string;
  school: string;
  details: string[];
};

export const education: EducationItem[] = [
  {
    degree: "M.S. in Computer Science",
    school: "Georgia Institute of Technology",
    details: ["Specialization: Artificial Intelligence"],
  },
  {
    degree: "B.A. in Computer Science",
    school: "University of Alabama at Birmingham",
    details: ["4.0 GPA", "Minors: Economics, Business Administration"],
  },
];

export const languages: string[] = ["Python", "TypeScript"];

export const tools: string[] = ["React", "AWS", "PostgreSQL", "Docker", "Git"];

// Tech used a while back; quick to pick things back up.
export const priorTech: string[] = ["Go", "C++", "Java"];

export const aboutBlurb =
  "Software engineer focused on building production software, cloud infrastructure, and products that deliver measurable business impact. I work end to end: React for the front, FastAPI for the back, Postgres for the data, deployed on AWS.";
