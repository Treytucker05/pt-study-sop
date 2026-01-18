import os
import platform
import subprocess
import sys

# The user's specific vault path
DEFAULT_VAULT_PATH = r"C:\Users\treyt\OneDrive\Desktop\pt-study-sop\PT School Semester 2"


def create_symlink():
    print(" UNIVERSAL SYSTEM <-> OBSIDIAN BRIDGE")
    print("---------------------------------------")

    # 1. Get Source (Current Folder)
    project_path = os.getcwd()
    folder_name = os.path.basename(project_path)
    print(f" Source Code: {project_path}")

    # 2. Get Destination (Vault)
    print(f"\nTarget Vault: {DEFAULT_VAULT_PATH}")
    user_input = input("Press [ENTER] to use this path, or paste a new one: ").strip()

    vault_path = user_input if user_input else DEFAULT_VAULT_PATH

    # Remove quotes if user pasted them
    vault_path = vault_path.strip('"').strip("'")

    if not os.path.exists(vault_path):
        print(f"[ERROR] Path not found: {vault_path}")
        return

    # 3. Create the Link
    # We create a folder named 'Dev_Projects' in the vault, and link THIS project inside it
    # Result: Vault/Dev_Projects/treys-agent
    dev_folder = os.path.join(vault_path, "Dev_Projects")
    if not os.path.exists(dev_folder):
        os.makedirs(dev_folder)

    link_path = os.path.join(dev_folder, folder_name)

    print(f"\n Creating link at: {link_path}")

    try:
        if os.path.exists(link_path):
            print("[WARN] Link already exists. Skipping.")
            return

        if platform.system() == "Windows":
            # Use mklink /J (Junction) which doesn't require Admin rights usually
            cmd = f'mklink /J "{link_path}" "{project_path}"'
            subprocess.run(cmd, shell=True, check=True)
        else:
            os.symlink(project_path, link_path)

        print("\n[SUCCESS] Go check your Obsidian Vault.")
        print(f"   Look for folder: Dev_Projects/{folder_name}")

    except subprocess.CalledProcessError as e:
        print(f"\n[ERROR] Windows Error: {e}")
        print("   Try running VS Code as Administrator.")
    except Exception as e:
        print(f"\n[ERROR] Error: {e}")


if __name__ == "__main__":
    create_symlink()
