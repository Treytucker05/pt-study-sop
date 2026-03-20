#Requires AutoHotkey v2.0
#SingleInstance Force
InstallMouseHook

ToolTip("Detector Running! Click any mouse button.`nPress ESC to close this detector.")

LButton::ToolTip("You pressed: Left Click (LButton)")
RButton::ToolTip("You pressed: Right Click (RButton)")
MButton::ToolTip("You pressed: Middle Click / Scroll Wheel (MButton)")
XButton1::ToolTip("You pressed: Back Button (XButton1)")
XButton2::ToolTip("You pressed: Forward Button (XButton2)")

Esc::ExitApp
