#Requires AutoHotkey v2.0
#SingleInstance Force

; --- Gemini CLI image paste (window-specific) ---
; Only intercepts Ctrl+V in terminals running Gemini CLI.
; Normal Ctrl+V works everywhere else without interference.

; Detect if the active window is a terminal running Gemini CLI
IsGeminiTerminal() {
    title := WinGetTitle("A")
    exe := WinGetProcessName("A")
    ; Match common terminal hosts that might run Gemini CLI
    if (exe ~= "i)(WindowsTerminal|cmd|powershell|pwsh|mintty|ConEmu|wezterm)")
        && (title ~= "i)(gemini|gem\b)")
        return true
    return false
}

; Smart Ctrl+V: only intercept in Gemini CLI terminals
#HotIf IsGeminiTerminal()
$^v::
{
    if (DllCall("IsClipboardFormatAvailable", "UInt", 2) && A_Clipboard == "") {
        ProcessImage()
    } else {
        Send("^v")
    }
}
#HotIf

; XButton1 = Back Button: image-paste in Gemini CLI, normal back elsewhere
#HotIf IsGeminiTerminal()
XButton1::
{
    ProcessImage()
}
#HotIf

ProcessImage() {
    psScript := "C:\pt-study-sop\tools\SaveClipboardImage.ps1"
    tempOut := A_Temp "\clip_out.txt"
    
    ; Run powershell and redirect output to a temp file
    cmd := 'powershell.exe -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "' psScript '" > "' tempOut '"'
    
    ; A_ComSpec /c runs the command in cmd.exe. "Hide" ensures no window flashes.
    RunWait(A_ComSpec ' /c ' cmd, , "Hide")
    
    if FileExist(tempOut) {
        output := FileRead(tempOut)
        output := Trim(output, " `r`n")
        FileDelete(tempOut)
        
        if (output = "NONE" || output = "") {
            ToolTip("No image found on clipboard!")
            SetTimer () => ToolTip(), -2000
        } else {
            ; Type the path in quotes so Gemini CLI parses paths with spaces correctly
            SendText('@"' output '"')
        }
    }
}