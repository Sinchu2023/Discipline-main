### Account Personalization & Per-User Data Isolation

We need to fix two issues in the system:

1. The account dropdown currently shows a fixed name ("Sinchan Chandrashekhar") instead of the logged-in user's name.
2. The productivity graph and daily mission data appear identical across different user accounts instead of showing each user's own data.

---

### 1. Display Logged-In User Name Dynamically

The user profile dropdown must display the currently authenticated user's name instead of a hardcoded value.

Implementation requirements:

• When a user logs in, fetch the user's name from the authentication system or database.
• Replace the static text with the authenticated user's display name.

Example logic:

User Login → Fetch User Data → Display user.name in UI

Example UI binding:

userDropdownName = currentUser.name

The dropdown should display:

Logged-in user's name
Import
Export
Credits
Logout

This ensures the correct name appears for every account.

---

### 2. Store Data Per User (Fix Shared Data Problem)

Currently the productivity graph and daily mission data are shared across all accounts.
We must isolate all user data using the userId.

All user-specific data must be stored under the user's unique ID.

Database structure example:

users
└── userId
├── profile
│    • name
│    • email
│
├── roadmap
│    • roadmapJSON
│
├── productivity
│    • dailyScores
│    • weeklyStats
│
└── missions
• dailyMission
• missionScore

Each logged-in user must read and write data only inside their own userId node.

---

### 3. Load Productivity Data Based on Logged-In User

When a user logs in:

1. Get currentUser.uid
2. Fetch productivity data from:

users/{uid}/productivity

3. Render the graph using only that user's data.

Example flow:

User Login
→ get currentUser.uid
→ fetch users/{uid}/productivity
→ render graph

This ensures each account sees its own statistics.

---

### 4. Save Daily Mission Progress Per User

When a mission checkbox is updated:

Save progress under the current user's record.

Example path:

users/{uid}/missions/dailyMission

Example stored data:

{
"projectWork": true,
"revision": false,
"score": 50
}

This prevents one user's progress from affecting another user.

---

### 5. Reset State When Account Changes

When switching accounts:

• Clear previous user's cached data
• Fetch new user's roadmap
• Fetch new user's productivity stats
• Update UI with the new user's name and data

Flow:

Logout → Clear local state → Login new user → Load new user's data.

---

### Expected Final Behaviour

• The profile dropdown displays the logged-in user's name.
• Each account has its own roadmap, productivity graph, and mission data.
• Switching accounts loads different data.
• No data is shared across users.
• Productivity graphs update based on each user's activity.
