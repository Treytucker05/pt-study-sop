#  Universal System Manual (Part 1: Core & Defense)

## 1. The Core Philosophy ("Boris Cherny" OS)
This system is a **Factory**. You do not just "write code"; you operate the factory using specific commands defined in `CLAUDE.md`.

* **The Brain (`CLAUDE.md`):** The root constitution. It enforces *"Plan first, Code second"* and *"Verify everything."*
* **The Team (`.claude/subagents/`):**
    * `architect.md`: Plans folder structures.
    * `critic.md`: Finds logic holes.
    * `judge.md`: Scores agent performance.

## 2. The Workflow (Slash Commands)
Use these commands in chat to control the factory:

| Command | Description |
| :--- | :--- |
| **`/plan [goal]`** | **START HERE.** Creates a blueprint before coding. |
| **`/review`** | Wakes up the Critic/Architect to check code. |
| **`/commit`** | **The Gatekeeper.** Runs Evals. If Pass -> Git Push. If Fail -> Block. |
| **`/capture-fail`** | Captures the last conversation as a regression test. |

## 3. The Defense System (AI Evals)
Located in: `projects/[project-name]/evals/`

* **Structure:**
    * `unit/`: Basic checks (formatting, valid JSON).
    * `functional/`: Task simulations (The "User" Simulator).
    * `adversarial/`: Safety & Bias checks.
    * `regression/`: The "Graveyard" of past failures (from `/capture-fail`).
    * `gold_set/`: Perfect answers used to calibrate the Judge.

* **The Flywheel:**
    1.  **Playground (`context/playground.md`):** Experiment with prompts here.
    2.  **Promote:** Use `/promote-to-eval` to turn a playground win into a permanent test.

## 4. The Automation Tools
* **Auto-Logger:** All interactions are saved to `logs/` automatically.
* **Speed Reviewer:** Run `python scripts/review.py` to quickly grade agent outputs (Pass/Fail) from the terminal.

## 5. The Obsidian Bridge
To see your code and docs inside your Second Brain:
1.  Run `python scripts/connect_to_obsidian.py`.
2.  Enter your Vault path.
3.  A folder `Dev_Projects` will appear in Obsidian.

Next Step
Run the command above.

Run the script: Type python scripts/connect_to_obsidian.py in your terminal and paste your Vault path.

Check Obsidian: You should see your entire project folder appear there.

Once you confirm the link is working, please paste the material for System #3.

## 5. The Obsidian Bridge
Your code is now linked to your notes.
1.  Run `python scripts/connect_to_obsidian.py`.
2.  Press Enter to accept your default vault path.
3.  A folder `Dev_Projects` will appear in your Obsidian "PT School Semester 2" vault.

## 6. System 3 (Knowledge Base)
System 3 lives under `projects/treys-agent/context/SOPs/` and `context/input/`.
Start with:
- `SOPs/system_3_obsidian_bridge.md`
- `SOPs/system_3_README.md`
- `input/system_3_source_notes.md`
- `input/system_3_checklist.md`

## 7. System 4 (Intro to Agents)
System 4 lives under `projects/treys-agent/context/SOPs/` and `context/input/`.
Start with:
- `SOPs/system_4_intro_agents.md`
- `SOPs/system_4_README.md`
- `input/system_4_source_notes.md`
- `input/system_4_checklist.md`
