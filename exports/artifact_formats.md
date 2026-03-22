# Artifact Formats

"
    "## Anki card draft format (from facilitation prompts)

"
    "Source: `brain/data/seed_methods.py` → `generate_facilitation_prompt()`

"
    "````
"
    "```
"
    "CARD 1:
"
    "TYPE: basic
"
    "FRONT: [question]
"
    "BACK: [answer]
"
    "TAGS: [comma-separated]

"
    "CARD 2:
"
    "TYPE: cloze
"
    "FRONT: The {{c1::answer}} is important because...
"
    "BACK: [answer word/phrase]
"
    "TAGS: [comma-separated]
"
    "```
"
    "````

"
    "Rules (from the prompt builder):
"
    "- TYPE must be `basic` or `cloze`.
"
    "- FRONT and BACK are required.
"
    "- Cloze cards must use `{{c1::...}}` syntax in FRONT.

"
    "## Anki card parsing rules (WRAP parser)

"
    "Source: `brain/wrap_parser.py` → `extract_anki_cards()`

"
    "Accepted lines (regex): `front|back|tags|source` preceded by optional bullet and/or bold.
"
    "Examples that parse:

"
    "````
"
    "```
"
    "Front: What is the insertion of the sartorius?
"
    "Back: Pes anserinus (medial proximal tibia).
"
    "Tags: anatomy, hip
"
    "```
"
    "````

"
    "Card separators recognized:
"
    "- `**1**`, `1.`, `Card 1:` (starts a new card).

"
    "## Mermaid diagram format (from facilitation prompts)

"
    "Source: `brain/data/seed_methods.py` → `generate_facilitation_prompt()`

"
    "````
"
    "```mermaid
"
    "graph LR
"
    "    A["Main Topic"]
"
    "    B["Subtopic 1"]
"
    "    A -->|relates to| B
"
    "```
"
    "````

"
    "Rules:
"
    "- Use `graph` (NOT `flowchart`).
"
    "- Concept maps use `graph LR`, flowcharts/decision trees use `graph TD`.
"
    "- Node labels must use the `A["Label"]` form.
"
    "- Edges use `A --> B` or `A -->|text| B`.
"
    