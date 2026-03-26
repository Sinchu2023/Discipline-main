const ANALOG_IC_ROADMAP_TEMPLATE = [
  {
    module: "MODULE 1 — DIODES",
    days: [
      "Basic Semiconductor Physics",
      "Different Models of Diodes",
      "Operating Point & Small Signal Analysis of Diode",
      "Zener Diode as Voltage Regulator",
      "Series Clipper & Clamper Circuits",
    ],
  },
  {
    module: "MODULE 2 — MOSFET FUNDAMENTALS",
    days: [
      "MOS Physics Fundamentals",
      "MOS Devices: Depletion & Enhancement",
      "Simple MOS Circuits",
      "MOS Non-linear Circuit Concepts",
    ],
  },
  {
    module: "MODULE 3 — MOS BIASING",
    days: [
      "Biasing MOS for Amplification",
      "Small Signal Model of MOS",
      "MOSFET Current Mirrors",
      "Bias Stability Practice",
    ],
  },
  {
    module: "MODULE 4 — MOS AMPLIFIERS",
    days: [
      "Common Source Amplifier",
      "Miller Effect in Amplifiers",
      "Cascode Amplifiers",
      "Amplifier Gain Review",
    ],
  },
  {
    module: "MODULE 5 — MOS PARASITICS",
    days: [
      "MOSFET Capacitances",
      "Noise Fundamentals",
      "Noise in Simple Circuits",
    ],
  },
  {
    module: "MODULE 6 — DIFFERENTIAL PAIR",
    days: [
      "Mismatch: Systematic & Random",
      "Differential Pair Fundamentals",
      "Differential Offset Analysis",
    ],
  },
  {
    module: "MODULE 7 — FEEDBACK",
    days: [
      "Types & Effects of Feedback",
      "Negative Feedback Design",
      "Stability & Dominant Pole Compensation",
    ],
  },
  {
    module: "MODULE 8 — OPAMP BASICS",
    days: [
      "OpAmp Basics",
      "OpAmp with Active Load",
      "Differential Amplifier using OpAmp\nActive Load",
    ],
  },
  {
    module: "MODULE 9 — TELESCOPIC OPAMP",
    days: [
      "Telescopic OpAmp Structure",
      "Telescopic OpAmp Biasing",
      "Telescopic OpAmp Gain Analysis",
      "Telescopic OpAmp Limitations",
    ],
  },
  {
    module: "MODULE 10 — FOLDED CASCODE OPAMP",
    days: [
      "Folded Cascode Concept",
      "Folded Cascode Biasing",
      "Folded Cascode Gain Analysis",
      "Folded Cascode Advantages",
    ],
  },
  {
    module: "MODULE 11 — TWO STAGE OPAMP",
    days: [
      "Two Stage OpAmp Architecture",
      "Gain Distribution",
      "Miller Compensation",
      "Frequency Stability",
    ],
  },
  {
    module: "MODULE 12 — ANALOG BLOCK PROJECTS",
    days: [
      "Common Source Amplifier Simulation",
      "Current Mirror Design",
      "Differential Pair Simulation",
      "Cascode Amplifier Simulation",
      "Two Stage OpAmp Simulation",
      "Bandgap Reference Concept",
      "LDO Regulator Concept",
    ],
  },
];

const MISSION_THRESHOLDS = {
  default: 30,
  "project work": 180,
  revision: 120,
};
const CATEGORY_DEFINITIONS = {
  Sleep: ["Night Sleep", "Nap", "Recovery"],
  "Productive Work": [
    "Analog",
    "PCB",
    "Coding",
    "Control Systems",
    "Planning",
    "Execution",
  ],
  "Physical Training": [
    "Chest",
    "Back",
    "Legs",
    "Arms",
    "Conditioning",
    "Mobility",
  ],
  "Study / Skill Development": [
    "Reading",
    "Course",
    "Practice",
    "Research",
  ],
  "Time Waste / Distraction": [
    "Social Media",
    "Streaming",
    "Gaming",
    "Browsing",
    "Idle",
  ],
  Miscellaneous: ["Admin", "Commute", "Family", "Other"],
};
const CATEGORY_ALIASES = {
  sleep: "Sleep",
  rest: "Sleep",
  productive: "Productive Work",
  work: "Productive Work",
  training: "Physical Training",
  physical: "Physical Training",
  workout: "Physical Training",
  study: "Study / Skill Development",
  skill: "Study / Skill Development",
  learning: "Study / Skill Development",
  waste: "Time Waste / Distraction",
  distraction: "Time Waste / Distraction",
  misc: "Miscellaneous",
  miscellaneous: "Miscellaneous",
};
const PRODUCTIVE_CATEGORIES = new Set([
  "Productive Work",
  "Physical Training",
  "Study / Skill Development",
]);
// Logical schema (local + cloud payload)
// activity_entry: {
//   id, category, subcategory, startTime, endTime, duration, date,
//   description(optional), sourceDevice, createdAt, updatedAt
// }
const MOTIVATION_LINES = [
  "Excellence is not a singular act, but a habit. You are what you repeatedly do.",
  "Discipline is the bridge between goals and accomplishment.",
  "The comeback is always stronger than the setback. Keep grinding.",
  "No shortcuts. No excuses. Just relentless execution.",
  "Consistency beats intensity every single time. Show up daily.",
  "Pain is temporary. Quitting lasts forever. Choose your hard.",
  "Your discipline today is your freedom tomorrow.",
  "Grind in silence, let success make the noise.",
  "Fall seven times, stand up eight. This is discipline.",
  "Small daily improvements lead to staggering long-term results.",
  "The only limit is the one you set yourself. Break it.",
  "Action is the antidote to anxiety. Keep moving forward.",
  "Don't stop when you're tired. Stop when you're done.",
  "The only bad workout is the one that didn't happen.",
  "Success is the sum of small efforts, repeated day in and day out.",
  "Your future is created by what you do today, not tomorrow.",
  "The harder you work for something, the greater you'll feel when you achieve it.",
  "Discipline is doing what needs to be done even when you don't want to.",
  "Be so good they can't ignore you. Master your craft.",
  "The only way to achieve the impossible is to believe it is possible.",
];
const STREAK_MESSAGES = {
  1: "Day one. This is where it begins.",
  3: "Three days strong. Momentum is building.",
  7: "One week! Discipline is becoming a habit.",
  14: "Two weeks. You're building something real.",
  21: "Three weeks. This is who you are now.",
  30: "One month of discipline. Elite status.",
  60: "Two months. You've transformed.",
  90: "Three months. Unstoppable.",
  100: "Century streak. This is your identity.",
  365: "One year. You've mastered yourself.",
};
