Design a transition flow from “Wheel of Life Assessment” to “Goal Setting (SMART)” for the Dear Our Future web platform.

Goal:
Create a clear system where user input (Wheel of Life scores) is processed and transformed into meaningful output (recommended focus area and goal creation flow).

Style:
- Soft pink background (#FDF2F8 or similar)
- White cards with large rounded corners
- Clean, minimal, Gen Z friendly
- Primary button: Purple–Pink gradient
- Consistent typography and spacing

-----------------------------------

1. TRANSITION SCREEN (OUTPUT FROM WHEEL OF LIFE)

Trigger:
After user clicks “Complete Assessment”

Input:
- User’s Wheel of Life scores

Process:
- Identify the lowest scoring life area

Output (must be clear and visible):
- Show a small radar chart summary
- Highlight the lowest area

Content:
Title: “Your Life Insight”
Message:
“Based on your Wheel of Life, your [lowest area] needs the most attention right now.”

Sub-message:
“Let’s turn this into a clear and achievable goal.”

Buttons:
- Primary (Gradient): “Start Goal Setup”
- Secondary (Text/Outline): “Go to Dashboard”

-----------------------------------

2. FEASIBILITY CHECK SCREEN (INPUT VALIDATION STEP)

Purpose:
Collect clear input about user readiness before creating a goal

Structure:
- Centered white card
- Progress bar (Step 1/5)

Title:
“Are you ready to work on this?”

Dynamic logic:
- If coming from Wheel → personalize question:
  “To improve [selected area], how ready are you?”
- If coming from Goal Tracker → general version

Questions (1 per step, multiple choice):
1. How much time can you commit?
2. How clear is your goal?
3. What is your biggest obstacle?
4. How consistent are you currently?
5. How committed are you?

Input:
User answers

Output:
- Readiness level (Low / Medium / High)
- Used to guide next step (SMART suggestion)

Buttons:
- Next
- Back

-----------------------------------

3. SMART GOAL SETUP SCREEN (FINAL OUTPUT)

Purpose:
Convert user input into a structured, actionable goal

Structure:
Multi-step form (S-M-A-R-T)

Sections:
- Specific
- Measurable
- Achievable
- Relevant
- Time-bound

UI Detail:
- Small tag: “Linked to: [Life Area]”
- Show readiness level (from previous step)

Output (must be clear):
- A completed SMART goal
- Ready to be added into dashboard / tracker

Primary Button:
“Create My Goal”

-----------------------------------

FLOW LOGIC (IMPORTANT)

Input:
- Wheel of Life scores
- Feasibility answers

Process:
- Detect weakest life area
- Evaluate readiness level

Output:
- Personalized insight
- Recommended focus area
- Structured SMART goal

-----------------------------------

UX NOTE

Also improve Dashboard:
- In “Life Balance” section → add button “Improve Now”
- This button leads directly to Feasibility Check
- Ensure closed-loop flow:
Dashboard → Insight → Goal → Tracking