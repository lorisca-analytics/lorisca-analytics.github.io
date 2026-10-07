/* ============================================================
   content.js — lorisca-analytics.github.io
   THE ONLY FILE YOU EDIT FOR CONTENT CHANGES.
   Lanes = the three work lanes. Pipeline titles are real titles
   from the working inventory; each graduates to a full card.
   ============================================================ */

const SITE = {
  org: "lorisca-analytics",
  orgLabel: "Analytics Work",
  owner: "Lorisca Cessia",
  mainSite: "https://lori-sca.github.io",
  githubOrg: "https://github.com/lorisca-analytics",
  email: "loriscatuuk@gmail.com",
};

const HERO = {
  eyebrow: "LORISCA-ANALYTICS · CASE STUDIES",
  headline: "Work that shows its mechanism.",
  lede: "The obvious metric points one way; the mechanism underneath points the other. These case studies are the search for the mechanism — in hiring systems, in data, in operations.",
};

const LANES = [
  {
    id: "talent",
    name: "Talent Systems",
    blurb:
      "Hiring, retention, and workforce data — built so the people deciding can see what's actually happening. The deepest bench: this is where the systems ran for years.",
    projects: [
      {
        id: "h1b-sponsorship",
        title: "Which Employers Reliably Sponsor H-1B Business Roles",
        hook: "SQL analysis of 3.47M H-1B filings (2020–2023). The business-role wage premium survives on medians — then breaks honestly when IT managers are excluded.",
        metric: "3.47M filings · 8 queries",
        visual:
          "https://raw.githubusercontent.com/lorisca-analytics/h1b-sponsorship-sql-analysis/main/visuals/02-wage-premium-by-year.png",
        visualAlt: "Wage premium by year, business vs data roles",
        diagram:
          "https://raw.githubusercontent.com/lorisca-analytics/h1b-sponsorship-sql-analysis/main/visuals/03-durable-business-sponsors.png",
        diagramAlt: "Top durable business-role sponsors, 2020–2023",
        status: "live",
        links: [
          {
            label: "Repo",
            url: "https://github.com/lorisca-analytics/h1b-sponsorship-sql-analysis",
            kind: "github",
          },
        ],
        body: {
          problem:
            "International graduates pick a track first and ask about visa risk later — on anecdote. Nobody could say whether business and analytics tracks differ on approval odds, or which employers sponsor every year rather than once.",
          approach:
            "Normalized 3.47M federal filings into a five-table MySQL database, then ran eight queries on volume, approval, pay, and four-year employer durability.",
          hers: "Reported the median that broke my own headline finding — the premium flips when IT managers are excluded.",
          result:
            "Approval gap never passed 1.7 points. Business volume +9.1% while analytics fell 6.1%. 77 durable business sponsors identified — EY leads with 13,329 filings at 97.8%.",
          lesson:
            "Visa risk is the wrong variable. The decision turns on market direction and pay, not approval odds.",
        },
      },
    ],
    pipeline: [
      { title: "Cleaning a visa dataset without deleting the signal" },
      { title: "The recruitment single source of truth (Bank Mega)" },
      { title: "Attrition was a promotion problem" },
      { title: "Making a gender-gap contradiction visible" },
    ],
  },
  {
    id: "models",
    name: "Analytics & Models",
    blurb:
      "SQL, machine learning, and BI — models and dashboards built to support one decision, with their limits stated. Weak results published, not buried.",
    projects: [],
    pipeline: [
      { title: "Predicting income bracket, and knowing when to stop" },
      { title: "Where a vaccine supply strategy should point" },
      { title: "Where the next advertising dollar should go" },
      { title: "A board bonus that looked already lost" },
      { title: "A sales peak that was not growth" },
      { title: "Forecasting a seasonal business three ways" },
      { title: "Testing a straight-line forecast against reality" },
    ],
  },
  {
    id: "strategy-ops",
    name: "Strategy & Operations",
    blurb:
      "Business cases, pricing, and delivery — testing the story against its own numbers before anyone funds it, and fixing the stage where the work actually stops flowing.",
    projects: [],
    pipeline: [
      { title: "Two identical-looking tech giants with opposite economics" },
      { title: "Cost of capital for a company that barely borrows" },
      { title: "Whether a Chilean neobank is actually revolutionary" },
      { title: "A brand that outgrew its own positioning" },
      { title: "Auditing an AI transformation pitch as the person funding it" },
      { title: "A delivery loss that routing could not fix" },
      { title: "Scoring a hardware launch before planning it" },
      { title: "Designing a scorecard for a firm that only measured revenue" },
    ],
  },
];
