# brain/tests/test_vault_artifact_parser.py
"""Tests for vault artifact command parsing from LLM output."""


def test_parse_single_create_command():
    from vault_artifact_parser import parse_vault_artifacts
    text = '''Here's your note structure:

:::vault:create
name: Lecture 1 - Gait Analysis
folder: Movement Science/Lower Body/Biomechanics
template: Study Session
:::

I've set up the first lecture note.'''

    artifacts = parse_vault_artifacts(text)
    assert len(artifacts) == 1
    assert artifacts[0]["operation"] == "create"
    assert artifacts[0]["params"]["name"] == "Lecture 1 - Gait Analysis"
    assert artifacts[0]["params"]["template"] == "Study Session"


def test_parse_multiple_commands():
    from vault_artifact_parser import parse_vault_artifacts
    text = '''Setting up your vault:

:::vault:create
name: _Index
folder: Movement Science/Lower Body
:::

:::vault:property
file: _Index
key: status
value: in-progress
:::

Done!'''

    artifacts = parse_vault_artifacts(text)
    assert len(artifacts) == 2
    assert artifacts[0]["operation"] == "create"
    assert artifacts[1]["operation"] == "property"


def test_parse_replace_section_with_multiline_content():
    from vault_artifact_parser import parse_vault_artifacts
    text = '''Updating your LOs:

:::vault:replace-section
file: _Index
heading: ## Learning Objectives
content: |
  - [ ] LO1: Describe [[gait cycle]]
  - [ ] LO2: Explain [[joint moments]]
  - [ ] LO3: Identify [[hip complex]] muscles
:::

These objectives are extracted from your slides.'''

    artifacts = parse_vault_artifacts(text)
    assert len(artifacts) == 1
    assert artifacts[0]["operation"] == "replace-section"
    assert "gait cycle" in artifacts[0]["params"]["content"]
    assert artifacts[0]["params"]["content"].count("- [ ]") == 3


def test_parse_no_artifacts():
    from vault_artifact_parser import parse_vault_artifacts
    text = "Just a regular response with no vault commands."
    artifacts = parse_vault_artifacts(text)
    assert artifacts == []


def test_parse_search_command():
    from vault_artifact_parser import parse_vault_artifacts
    text = ''':::vault:search
query: lower body biomechanics
limit: 5
:::'''

    artifacts = parse_vault_artifacts(text)
    assert len(artifacts) == 1
    assert artifacts[0]["operation"] == "search"
    assert artifacts[0]["params"]["query"] == "lower body biomechanics"
    assert artifacts[0]["params"]["limit"] == "5"


def test_strip_artifacts_from_text():
    from vault_artifact_parser import strip_vault_artifacts
    text = '''Before text.

:::vault:create
name: Test
:::

After text.'''

    clean = strip_vault_artifacts(text)
    assert ":::vault:" not in clean
    assert "Before text." in clean
    assert "After text." in clean


def test_parse_append_command():
    from vault_artifact_parser import parse_vault_artifacts
    text = ''':::vault:append
file: My Note
content: |
  ## New Section
  Content with [[wiki links]]
:::'''

    artifacts = parse_vault_artifacts(text)
    assert len(artifacts) == 1
    assert artifacts[0]["operation"] == "append"
    assert "wiki links" in artifacts[0]["params"]["content"]


def test_parse_move_command():
    from vault_artifact_parser import parse_vault_artifacts
    text = ''':::vault:move
path: Old/Path/Note.md
name: New Name
folder: New/Folder
:::'''

    artifacts = parse_vault_artifacts(text)
    assert len(artifacts) == 1
    assert artifacts[0]["operation"] == "move"
    assert artifacts[0]["params"]["path"] == "Old/Path/Note.md"
