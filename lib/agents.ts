export type Category = {
  id: string;
  label: string;
};

export type AgentExample =
  | { type: "text"; title: string; body: string }
  | { type: "image"; title: string; url: string; caption?: string }
  | { type: "code"; title: string; language: string; code: string };

export type AgentReview = {
  id: string;
  user: string;
  rating: number;
  comment: string;
};

export type Agent = {
  id: string;
  name: string;
  author: string;
  description: string;
  price: number;
  rating: number;
  category: string;
  score: number;
  examples?: AgentExample[];
  reviews?: AgentReview[];
};

export const categories: Category[] = [
  { id: "ppt", label: "Presentation & PPT" },
  { id: "dev", label: "Development" },
  { id: "resume", label: "Resume" },
  { id: "marketing", label: "Marketing" },
  { id: "analysis", label: "Analysis" },
  { id: "ops", label: "Operations" },
  { id: "toon", label: "Cartoon" },
  { id: "research", label: "Research" },
];

export const agents: Agent[] = [
  {
    id: "ppt-1",
    name: "PPT Agent 1",
    author: "Alice",
    description: "Specialized in creating academic PowerPoint presentations.",
    price: 0.001,
    rating: 4.5,
    category: "ppt",
    score: 9.7,
    examples: [
      {
        type: "text",
        title: "Academic presentation outline",
        body: "Created a 15-slide academic deck with structured agenda, methodology visuals, and conclusion summaries tailored for a university demo day.",
      },
      {
        type: "image",
        title: "Slide visual sample",
        url: "https://via.placeholder.com/640x360.png?text=Sample+Slide",
        caption:
          "Placeholder preview for a slide visual (replace with real asset).",
      },
    ],
    reviews: [
      {
        id: "r1",
        user: "Jin",
        rating: 4.7,
        comment: "Crisp flow, good academic tone.",
      },
      {
        id: "r2",
        user: "Sara",
        rating: 4.5,
        comment: "Clear slide hierarchy and pacing.",
      },
    ],
  },
  {
    id: "ppt-2",
    name: "PPT Agent 2",
    author: "Bruno",
    description: "Great for concise pitch decks with strong visuals.",
    price: 0.0008,
    rating: 4.4,
    category: "ppt",
    score: 9.1,
    examples: [
      {
        type: "code",
        title: "Auto-visual script",
        language: "python",
        code: `import pptx\n\n# Generate slide bullets from a brief\nbrief = "AI startup pitch"\nprint("Generating structure for:", brief)`,
      },
    ],
    reviews: [
      {
        id: "r3",
        user: "Mo",
        rating: 4.4,
        comment: "Concise decks, quick turnaround.",
      },
    ],
  },
  {
    id: "ppt-3",
    name: "PPT Agent 3",
    author: "Cara",
    description: "Focuses on storytelling decks for product launches.",
    price: 0.0012,
    rating: 4.6,
    category: "ppt",
    score: 9.0,
  },
  {
    id: "dev-1",
    name: "Dev Agent",
    author: "Diego",
    description: "Builds small prototypes and API connectors quickly.",
    price: 0.0015,
    rating: 4.3,
    category: "dev",
    score: 8.9,
  },
  {
    id: "resume-1",
    name: "Resume Agent",
    author: "Ella",
    description: "Crafts ATS-friendly resumes with tailored bullets.",
    price: 0.0006,
    rating: 4.4,
    category: "resume",
    score: 9.2,
  },
];
