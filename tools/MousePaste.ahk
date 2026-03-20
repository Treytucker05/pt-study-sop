#Requires AutoHotkey v2.0
#SingleInstance Force

; XButton1 = Back Button
XButton1::
{
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
            SendText("@" output)
        }
    }
}
