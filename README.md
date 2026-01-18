#  Trey's Second Brain (PT Trey's Agent)

##  System Status: "High Speed / Operational"
- **Engine:** OpenRouter API (Replaced local Codex for speed).
- **Model:** `google/gemini-2.0-flash-001` (Paid Tier - High Performance).
- **Latency:** ~2-6 seconds per answer.
- **Knowledge:** Context folder is active and searchable.

---

##  How to Use (Quick Start)
1.  **Add Notes:**
    * Open this folder (`pt-study-sop/context`) in **Obsidian**.
    * Write your class notes, plans, or anatomy lists here.
2.  **Start the Agent:**
    * Double-click **`ask.bat`** on your Desktop.
3.  **Chat:**
    * *"Quiz me on the Humerus using the 3-pass style."*
    * *"Summarize my lecture notes from today."*
    * *"Create a Sprint plan for next week."*

---

##  The "Pick Up Where We Left Off" Plan
**When you get home from work:**
1.  **Start using it.** The system is done. You don't need to code anymore.
2.  **Load your Content:** Your main job now is just copy-pasting your real school notes into the `context/` folder.
3.  **Verify:** Ask *"What is in my context folder?"* to see if it reads your new files.

---

##  Troubleshooting
- **If it says "Rate Limited" (429):** Open `src/agents/base.py` and switch the model line to `meta-llama/llama-3.2-11b-vision-instruct:free`.
- **If it says "API Error":** Check your OpenRouter credit balance (you are using the paid Gemini model, which costs pennies).
- **If it can't find a file:** Ensure the file is inside `context/` and is a `.md` file.

---
*Created: Jan 2026 | Architecture: Python + OpenRouter API + RAG*

