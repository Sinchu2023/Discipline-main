## AI Roadmap Generator System — JSON Based Workflow (FIX API ERROR)

Improve the AI Roadmap Generator system and fix the Gemini API request failure.

---

## 1. Roadmap Output Format (STRICT JSON)

All generated roadmaps must follow this JSON schema exactly.

{
"topic": "Analog IC Design",
"modules": [
{
"moduleNumber": 1,
"moduleTitle": "DIODES",
"days": [
{
"day": 1,
"title": "Basic Semiconductor Physics",
"status": "completed"
},
{
"day": 2,
"title": "Different Models of Diodes",
"status": "active"
},
{
"day": 3,
"title": "Operating Point & Small Signal Analysis of Diode",
"status": "locked"
}
]
}
]
}

Rules:

• Day 1 → completed
• Day 2 → active
• Remaining days → locked
• Day numbers must continue sequentially across modules

AI must return **only JSON** without explanations.

---

## 2. Two Roadmap Creation Methods

Add two buttons in UI.

[ Generate with AI ]
[ Import JSON Roadmap ]

---

## 3. Import JSON Roadmap (Manual)

If user selects **Import JSON Roadmap**:

1. Show a large text editor
2. User pastes JSON roadmap
3. Validate JSON structure
4. If valid → save roadmap to database
5. Render roadmap in roadmap console

Validation rules:

• topic must exist
• modules must be array
• moduleNumber must exist
• each module must contain days array
• each day must contain day, title, status

---

## 4. Database Storage

Store roadmap JSON directly.

users
└── userId
└── roadmaps
└── roadmapId
• topic
• roadmapJSON
• progress
• type (ai or imported)
• createdAt

---

## 5. Prevent Duplicate Roadmaps

Before generating or saving roadmap:

Check database.

IF roadmap for topic exists → load existing roadmap

ELSE → allow AI generation or JSON import

---

## 6. Fix Gemini API Request Failure

The system currently shows:

Error: API request failed. Check your key.

Fix the Gemini API integration.

### Use correct endpoint (even though i have used the correct one okay )

POST
https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent

### Pass API key in header OR query parameter

Example request:

POST https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=API_KEY

### Correct request body

{
"contents": [
{
"parts": [
{
"text": "Generate a learning roadmap for {{TOPIC}} in the required JSON schema."
}
]
}
]
}

### Important Implementation Rules

• Use model **gemini-1.5-flash**
• Do NOT use deprecated model **gemini-pro**
• Validate API key before request
• Add try/catch error handling
• Display clear error message if request fails

Example errors:

Invalid API key
API quota exceeded
Network request failed

---

## 7. Loading Indicators

Add loading indicators.

Checking existing roadmap...
Generating roadmap using AI...
Validating JSON roadmap...
Saving roadmap...

---

## 8. Final Expected Behaviour

• Users can generate roadmaps using Gemini AI
• Users can import roadmap JSON manually
• Roadmaps are stored permanently
• Duplicate roadmaps are prevented
• Roadmaps sync across devices
• API request failures are handled correctly
( and same firebase read and write limit it till now its okay)