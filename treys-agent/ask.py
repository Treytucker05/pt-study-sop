import sys
import os

# --- FORCE SPEED SETTING ---
# We set this environment variable to force the CLI to use the fast model.
os.environ["CODEX_MODEL"] = "gpt-5.1-codex-mini"

# Fix path to ensure we can import 'src'
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.append(current_dir)

from src.agents.architect import Architect

def main():
    # Clear screen (Windows/Linux compatible)
    os.system('cls' if os.name == 'nt' else 'clear')

    print("==========================================")
    print("      TREY'S AGENT (Fast Mode)            ")
    print("==========================================")
    print("Initializing...")

    try:
        bot = Architect("Trey's Agent")
        print("\n[System]: Ready! Fast mode active.")
        print("[System]: Type 'exit' to close.\n")
        print("-" * 40)

        while True:
            try:
                user_input = input("You: ")
                if user_input.lower() in ["exit", "quit"]:
                    break
                if not user_input.strip():
                    continue

                print("...") 
                response = bot.think(user_input)
                print(f"\n[Agent]:\n{response}\n")
                print("-" * 40)

            except KeyboardInterrupt:
                break

    except Exception as e:
        print(f"\n[CRITICAL ERROR] {e}")
        input("Press Enter to close...")

if __name__ == "__main__":
    main()
