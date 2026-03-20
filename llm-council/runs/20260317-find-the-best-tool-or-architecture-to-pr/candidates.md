# Candidate Survey

## Mechanism Overview for Non-Blocking Windows Computer Use

To achieve "Computer Use" without hijacking the physical mouse or capturing obscured windows, an architecture must leverage two specific layers of the Windows API:

1.  **Vision (Capture):** Instead of standard screen-scraping (which captures the entire monitor, including overlaid windows), the tool must use the **PrintWindow API** or the modern **Windows Graphics Capture API**. These APIs can capture the visual state of a *specific* application window, even if it is partially or completely covered by another window.
2.  **Action (Interaction):** Instead of raw coordinate clicks (which move the cursor), the tool must use **UIAutomation (UIA)** patterns or **SendMessage/PostMessage** APIs to send click and keyboard events directly to the target window's message queue in the background.

## Candidate Architectures

### 1. Pywinauto (Python)
*   **Mechanism:** Python wrapper around Windows UIAutomation (UIA) and MS UI Automation frameworks.
*   **Capture Behavior:** Supports capturing specific window handles (`hwnd`), avoiding full-screen obstruction issues.
*   **Cursor Behavior:** Supports `click()` methods that do not move the physical mouse if used with the UIA backend. It interacts directly with the control elements.
*   **OAuth Session Reuse:** Can attach to existing application processes (e.g., an open Chrome window) without launching a new, unauthenticated instance.
*   **Maintenance Status:** Mature, highly used, though development has slowed slightly.

### 2. FlaUI (C# / .NET)
*   **Mechanism:** A modern .NET library wrapping UIA2 and UIA3.
*   **Capture Behavior:** Excellent support for capturing specific elements or windows directly to bitmaps, ignoring foreground overlays.
*   **Cursor Behavior:** Highly reliable background interaction using UIA Invoke patterns. It only moves the mouse if explicitly told to use the `Mouse.Click()` API instead of the element's `Invoke()`.
*   **OAuth Session Reuse:** Excellent. It can attach to any running process PID or window handle.
*   **Maintenance Status:** Very active, modern, and robust.

### 3. Playwright / Puppeteer (Web-Specific Fallback)
*   **Mechanism:** Browser automation via Chrome DevTools Protocol (CDP).
*   **Capture Behavior:** Captures the DOM and page screenshots internally; completely immune to overlapping Windows applications.
*   **Cursor Behavior:** 100% background execution. Zero physical mouse movement.
*   **OAuth Session Reuse:** Supports connecting to an existing browser instance over a debug port (`--remote-debugging-port`), allowing full reuse of OAuth cookies.
*   **Maintenance Status:** Industry standard.
*   **Constraint Note:** *Only solves the web portion.* Cannot interact with File Explorer, `.bat` files, or native UI programs.

### 4. Direct Windows API (C++ / Rust / Python ctypes)
*   **Mechanism:** Directly calling `User32.dll` for `SendMessage` and `PrintWindow`.
*   **Capture Behavior:** `PrintWindow` with the `PW_RENDERFULLCONTENT` flag captures hidden/obscured windows.
*   **Cursor Behavior:** `SendMessage` for `WM_LBUTTONDOWN` and `WM_KEYDOWN` sends inputs directly to the window queue, completely bypassing the OS cursor.
*   **OAuth Session Reuse:** N/A (operates at the OS window level, so it naturally interacts with whatever is running).
*   **Maintenance Status:** Raw OS API. Extremely fast but requires building the LLM integration layer entirely from scratch.

## Summary & Recommendations

If the goal is to build or configure an MCP server for the LLM to use right now:

1.  **For Native UIs & .bat files:** A custom python script or MCP server wrapping **`pywinauto`** is the fastest path. It can target specific windows (solving the screenshot overlay issue) and click elements via UIA patterns without stealing the mouse.
2.  **For Web/OAuth:** If `pywinauto` struggles with complex browser UIs, running a secondary Playwright MCP that attaches to your daily Chrome profile (via debug port) perfectly handles the web side invisibly.