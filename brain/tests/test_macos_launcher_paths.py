from pathlib import Path


def test_macos_launcher_prefers_onedrive_pt_school_before_plain_desktop():
    repo_root = Path(__file__).resolve().parents[2]
    script = (repo_root / "scripts" / "start_dashboard_macos.sh").read_text(
        encoding="utf-8"
    )

    onedrive_path = "$HOME/Library/CloudStorage/OneDrive-Personal/Desktop/PT School"
    desktop_path = "$HOME/Desktop/PT School"

    assert onedrive_path in script
    assert script.index(onedrive_path) < script.index(desktop_path)
