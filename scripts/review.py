# In a real scenario this would load recent output from logs and score it.
print("Review Mode")
choice = input("Pass or Fail? [P/F]: ").strip().lower()
if choice == "p":
    print("Recorded: PASS")
elif choice == "f":
    print("Recorded: FAIL")
else:
    print("Recorded: UNKNOWN")
