/**
 * Structured syllabus content for courses that have rich docx syllabi.
 * Matched to Directus courses by a key derived from the course name
 * (first segment before ":" lowercased with spaces → hyphens).
 *
 * e.g. "LLM 101: Language Models & You"  → "llm-101"
 *      "NLM 101: Intelligence Without Words" → "nlm-101"
 */

export type SessionContent = {
  number: string;
  title: string;
  concepts: string[];
  activity: string[];
  activityLabel?: string; // defaults to "Hands-On Activity"
};

export type WeekContent = {
  title: string;
  sessions: SessionContent[];
};

export type RichCourseContent = {
  about: string[];                               // paragraphs
  details: { label: string; value: string }[];   // course details table
  weeks: WeekContent[];
  capstone: {
    quote: string;
    requirements: string[];
    demoCriteria: string[];
  };
  outcomes: { num: string; text: string }[];
};

const content: Record<string, RichCourseContent> = {
  "llm-101": {
    about: [
      "LLM 101 is a two-week, hands-on introduction to the technology reshaping every industry. No coding, no prerequisites — just clear thinking and curiosity. Students leave with a real understanding of how large language models work, why they sometimes fail, and how to build with them intentionally. This isn't a course about using AI. It's a course about understanding it.",
      "Over four sessions, we move from concept to creation. The first week covers the fundamentals — how LLMs are trained, what tokens and context windows actually mean, and why prompting is a design skill, not a technical one. The second week goes deeper into retrieval-augmented generation (RAG), the system architecture that makes AI useful for real-world knowledge work.",
      "The course culminates in a capstone project: each student builds their own no-code RAG chatbot powered by documents about the future of their chosen field — media, technology, business, or the arts. They present it live, explain how it works, and deliberately show where it breaks. Because understanding failure is the beginning of mastery.",
    ],
    details: [
      { label: "Duration",      value: "2 weeks, 4 sessions" },
      { label: "Format",        value: "Live sessions (instructor-led)" },
      { label: "Prerequisites", value: "None — curiosity is the only requirement" },
      { label: "Tools Used",    value: "Claude Projects or NotebookLM (no accounts needed during class)" },
      { label: "Disciplines",   value: "Media · Technology · Business · Arts" },
      { label: "Capstone",      value: "No-code RAG chatbot + live demo presentation" },
    ],
    weeks: [
      {
        title: "Week 1 — Understanding the Machine",
        sessions: [
          {
            number: "Session 1",
            title: "How LLMs Think (and How They Don't)",
            concepts: [
              "What training actually means — in plain English",
              "Tokens and context windows — the basic unit of how LLMs read and respond",
              "Why models hallucinate — pattern completion vs. factual retrieval",
              "The pattern-completer mental model — smart but not thinking",
            ],
            activity: [
              "Prompt experiments in the browser — observe how small wording changes shift outputs dramatically",
              "Group discussion: where did the model get it right? Where did it fail, and why?",
            ],
          },
          {
            number: "Session 2",
            title: "Prompting as Design",
            concepts: [
              "Prompting is a design discipline — not a technical skill",
              "System prompts, personas, and constraints",
              "Few-shot examples and how to frame context",
              "Temperature and creativity as system levers",
            ],
            activity: [
              "Prompt redesign workshop — students receive a poorly written prompt and rewrite it",
              "Compare outputs before and after redesign; discuss what changed and why",
            ],
          },
        ],
      },
      {
        title: "Week 2 — Building with Structure",
        sessions: [
          {
            number: "Session 3",
            title: "What RAG Actually Is",
            concepts: [
              "Why prompting alone isn't enough — the hallucination problem at scale",
              "What \"grounding\" means and why it matters",
              "Embeddings as a way of measuring meaning — no math, just the concept of similarity",
              "Vector stores as organized memory",
              "The full RAG pipeline as a system — ingest → retrieve → generate",
            ],
            activity: [
              "Visual mapping exercise — students diagram the RAG pipeline for a real-world use case",
              "Group Q&A: where does retrieval fail? What kinds of questions can't it answer?",
            ],
          },
          {
            number: "Session 4",
            title: "Demo Day — Present Your Chatbot",
            concepts: [],
            activityLabel: "Format",
            activity: [
              "Each student presents their RAG chatbot (10 minutes per student)",
              "Explain the document set you chose and why",
              "Show the chatbot answering questions well",
              "Intentionally break it — show a question it gets wrong and explain why",
              "Group feedback and discussion after each demo",
            ],
          },
        ],
      },
    ],
    capstone: {
      quote: "Build a chatbot that can answer questions about the future of your field — using retrieval-augmented generation.",
      requirements: [
        "Select 3–5 documents focused on the future of your chosen discipline (Media, Tech, Business, or Arts)",
        "Documents can be articles, reports, essays, or transcripts — PDFs and text preferred",
        "Build your chatbot using Claude Projects or NotebookLM (no coding required)",
        "Test it thoroughly before Demo Day — find its limits",
      ],
      demoCriteria: [
        "Explain your document set and the question you were trying to answer",
        "Demonstrate at least 3 strong responses from your chatbot",
        "Demonstrate at least 1 failure — and explain why it failed",
        "Share one insight about AI or your field that building this taught you",
      ],
    },
    outcomes: [
      { num: "1", text: "Explain how large language models work at a conceptual level" },
      { num: "2", text: "Write clear, effective prompts for a range of real-world tasks" },
      { num: "3", text: "Understand the RAG architecture and why it matters for knowledge work" },
      { num: "4", text: "Build and evaluate a no-code RAG chatbot over their own document set" },
      { num: "5", text: "Identify where AI systems succeed and where they fail — and why" },
    ],
  },

  "nlm-101": {
    about: [
      "NLM 101 is the counterpart to LLM 101. Where LLM 101 explores how AI thinks with language, NLM explores how intelligence emerges without it. From ant colonies to social media feeds, from slime molds to city traffic — most of the intelligence shaping our world doesn't use a single word.",
      "This course is built around three interconnected ideas. First, that the world is full of sensors — IoT devices generating real-time data about movement, temperature, presence, and behavior. Second, that intelligence often emerges from simple rules followed by many simple agents — the physics of flocking, swarming, and collective behavior. Third, that the architects of modern marketing and platform design already know this: they have been using NUDGE theory — from Thaler and Sunstein's landmark book — to steer those swarms deliberately, designing environments that shape behavior without anyone noticing.",
      "Students will spend the course inside Slimehive, a live simulation playground where they configure drone behaviors, introduce nudges, and watch intelligence emerge in real time. The course closes with a capstone — students design, observe, and present their own emergent system, including where it fails. Because understanding failure is the beginning of mastery.",
    ],
    details: [
      { label: "Duration",      value: "2 weeks, 4 sessions" },
      { label: "Format",        value: "Live sessions (instructor-led)" },
      { label: "Prerequisites", value: "None — curiosity is the only requirement. LLM 101 recommended but not required." },
      { label: "Tools Used",    value: "Slimehive (playground simulation — no account needed during class)" },
      { label: "Disciplines",   value: "Media · Technology · Business · Arts" },
      { label: "Capstone",      value: "Slimehive simulation + live demo + nudge analysis" },
    ],
    weeks: [
      {
        title: "Week 1 — Emergence & the Swarm",
        sessions: [
          {
            number: "Session 1",
            title: "The Intelligence Beneath the Words",
            concepts: [
              "What intelligence looks like when there is no language — and why that matters",
              "Emergent behavior: how simple rules followed by many agents produce complex outcomes",
              "BOIDS: the three rules behind all flocking — separation, alignment, and cohesion",
              "IoT as a distributed nervous system: sensors everywhere, data always flowing",
              "The difference between centralized decision-making and emergent behavior",
            ],
            activityLabel: "Hands-On Activity (Slimehive)",
            activity: [
              "First contact: spin up a basic flock, adjust drone count, observe what changes",
              "Group challenge: find the minimum rule configuration that produces interesting behavior",
              "Discussion: where did the \"intelligence\" come from? Who programmed that?",
            ],
          },
          {
            number: "Session 2",
            title: "The Nudge — Steering the Swarm",
            concepts: [
              "The book Nudge (Thaler & Sunstein): choice architecture and the power of defaults",
              "Why marketing moved from persuasion to nudging — and what that shift means",
              "How a nudge shapes a swarm differently than a direct command",
              "Platform algorithms as nudges: recommendation feeds, notification timing, attention design",
              "The ethical line between a nudge and a shove",
            ],
            activityLabel: "Hands-On Activity (Slimehive)",
            activity: [
              "Add an attractor or obstacle to an existing simulation — watch the swarm reorganize",
              "Design challenge: what is the smallest change you can make to steer behavior toward a different outcome?",
              "Group discussion: where have you been nudged today? Name three real examples from your life",
            ],
          },
        ],
      },
      {
        title: "Week 2 — Seeing & Designing Intelligence",
        sessions: [
          {
            number: "Session 3",
            title: "The Eye That Doesn't Think — Computer Vision Basics",
            concepts: [
              "How machines see: pixels → gradients → edges → features (no math, just the concept)",
              "What a neural network actually is — a pattern recognizer, not a thinker",
              "Edge detection and line finding: how computer vision finds structure in noise",
              "What IoT cameras detect versus what they understand",
              "The gap between pattern recognition and comprehension — the NLM paradox",
            ],
            activityLabel: "Hands-On Activity (Slimehive)",
            activity: [
              "Observe the trails and movement paths your simulation produces over time",
              "Group exercise: sketch what a computer vision system would \"see\" in your simulation — edges, lines, vectors",
              "Compare: what does the machine see versus what you see as a human observer? Where do they diverge?",
            ],
          },
          {
            number: "Session 4",
            title: "Demo Day — Present Your Intelligence",
            concepts: [],
            activityLabel: "Format",
            activity: [
              "Each student presents their Slimehive simulation (10 minutes per student)",
              "Explain your configuration: drone count, behaviors selected, nudge design",
              "Show the emergence: what behavior appeared that you did not explicitly program?",
              "Break it: demonstrate a parameter change that collapses or inverts the behavior",
              "Connect it: what does your simulation reveal about intelligence, marketing, or systems design in the real world?",
              "Group feedback and discussion after each demo",
            ],
          },
        ],
      },
    ],
    capstone: {
      quote: "Build a simulation that produces behavior you didn't directly program — then design a nudge that steers it.",
      requirements: [
        "Configure a Slimehive simulation with at least two behavioral parameters (for example: flocking + obstacle avoidance)",
        "Introduce at least one nudge — an attractor, obstacle, or environmental asymmetry — and document how the swarm responds",
        "Save your simulation so it can be replayed and demonstrated live",
        "Identify one real-world parallel: a market, a social platform, a city, or a natural system that behaves similarly",
        "Test edge cases: find where your simulation breaks, collapses, or produces a result you did not expect",
      ],
      demoCriteria: [
        "Explain your simulation configuration and your original design intent",
        "Show the emergent behavior — what the swarm does that you did not program directly",
        "Demonstrate your nudge and its measurable effect on swarm behavior",
        "Show at least one failure or surprise: a result you did not anticipate, and why it happened",
        "Connect it: what does this simulation tell you about intelligence, marketing, or collective behavior in the real world?",
      ],
    },
    outcomes: [
      { num: "1", text: "Explain what emergent intelligence is and how it differs from centralized, language-based AI" },
      { num: "2", text: "Describe the BOIDS model and demonstrate how three simple rules produce complex flocking behavior in Slimehive" },
      { num: "3", text: "Connect NUDGE theory to swarm behavior, platform design, and the mechanics of modern marketing" },
      { num: "4", text: "Explain how computer vision systems detect edges, lines, and patterns — and where recognition ends and understanding begins" },
      { num: "5", text: "Design, run, save, and analyze a behavioral simulation that produces genuine emergent behavior" },
    ],
  },
};

/**
 * Derive a lookup key from a Directus course name.
 * "LLM 101: Language Models & You" → "llm-101"
 */
export function courseKey(name: string): string {
  return name
    .split(":")[0]          // take part before colon
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");  // spaces → hyphens
}

export function getRichContent(name: string): RichCourseContent | null {
  return content[courseKey(name)] ?? null;
}
