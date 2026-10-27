Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
base = fso.GetParentFolderName(WScript.ScriptFullName)
shell.Run "powershell.exe -NoProfile -WindowStyle Hidden -File " & Chr(34) & base & "\Iniciar.ps1" & Chr(34), 0, False
