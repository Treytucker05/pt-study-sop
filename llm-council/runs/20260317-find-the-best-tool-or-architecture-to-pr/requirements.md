# Requirements and Constraints

## 1. Disruption and Success Metrics

### "No Cursor Hijack" Threshold
*   **Ideal State:** Zero physical mouse movement or blocking of user input.
*   **Acceptable Fallback:** Brief, explicit opt-in cursor hijacking only when background input (UIA/SendMessage) fundamentally fails for a specific UI element, but it must immediately return control.
*   **Focus Changes:** The automation should attempt to operate on windows in the background without stealing foreground focus. If a window must be brought to the foreground, it should not interrupt active typing.

### User Interaction Concurrency
*   The user must be able to continue typing and clicking on their primary monitor or foreground app while the LLM configures tools or interacts with background apps on a secondary screen or in the background.

## 2. Top Apps and Workflow Priorities

### Primary Workflows (Must Support)
1.  **File Explorer & Shell/Terminal:** Navigating directories, executing and modifying `.bat` files to set up and manage MCP servers.
2.  **Code/Text Editors:** Opening configuration files, reading logs, and fixing server scripts.
3.  **UI Programs:** General interaction with native Windows desktop UIs (e.g., installers, configuration wizards, system settings).
4.  **Web Browsers (OAuth context):** Attaching to existing authenticated browser sessions to bypass login flows when configuring web-connected services.

### Prioritization
1.  **Terminal/File System Execution:** The core ability to run scripts and fix setups seamlessly.
2.  **Native UI Interaction:** The ability to click buttons and read text in standard Windows UI applications without taking the mouse.
3.  **Browser Session Reuse:** Utilizing existing OAuth states to avoid constant re-authentication.