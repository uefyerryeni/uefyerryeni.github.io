Option Explicit
Dim uefyShell, uefyFiles, uefyRoot, uefyOrigin, uefyProgram, uefyScript, uefyHome, uefyAttempt, uefyResult
Set uefyShell = CreateObject("WScript.Shell")
Set uefyFiles = CreateObject("Scripting.FileSystemObject")
uefyRoot = uefyFiles.GetParentFolderName(WScript.ScriptFullName)
uefyOrigin = "http://127.0.0.1:17831"
Function CentralPronta()
 Dim request
 CentralPronta = False
 On Error Resume Next
 Set request = CreateObject("MSXML2.ServerXMLHTTP.6.0")
 request.setTimeouts 200, 200, 200, 500
 request.open "GET", uefyOrigin & "/health", False
 request.send
 If Err.Number = 0 Then
  If request.status = 200 And InStr(request.responseText, "UEFY LIVE") > 0 Then CentralPronta = True
 End If
 Err.Clear
 On Error GoTo 0
End Function
If Not CentralPronta() Then
 uefyHome = uefyShell.ExpandEnvironmentStrings("%USERPROFILE%")
 uefyProgram = uefyHome & "\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\pythonw.exe"
 uefyScript = uefyRoot & "\server.py"
 If Not uefyFiles.FileExists(uefyProgram) Then
  uefyProgram = uefyHome & "\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
  uefyScript = uefyRoot & "\server.mjs"
  If Not uefyFiles.FileExists(uefyProgram) Then uefyProgram = uefyShell.ExpandEnvironmentStrings("%ProgramFiles%") & "\nodejs\node.exe"
 End If
 If Not uefyFiles.FileExists(uefyProgram) Or Not uefyFiles.FileExists(uefyScript) Then
  MsgBox "Nao encontrei todos os arquivos da central. Extraia a pasta completa UEFY-LIVE.", vbExclamation, "UEFY LIVE"
  WScript.Quit 1
 End If
 uefyShell.CurrentDirectory = uefyRoot
 On Error Resume Next
 uefyResult = uefyShell.Run(Chr(34) & uefyProgram & Chr(34) & " " & Chr(34) & uefyScript & Chr(34), 0, False)
 If Err.Number <> 0 Then
  MsgBox "Nao foi possivel iniciar a central: " & Err.Description, vbExclamation, "UEFY LIVE"
  WScript.Quit 1
 End If
 On Error GoTo 0
 For uefyAttempt = 1 To 40
  WScript.Sleep 250
  If CentralPronta() Then Exit For
 Next
 If Not CentralPronta() Then
  MsgBox "A central nao respondeu. Feche outros programas se o Windows estiver sem memoria e tente novamente.", vbExclamation, "UEFY LIVE"
  WScript.Quit 1
 End If
End If
If WScript.Arguments.Count > 0 Then
 If WScript.Arguments(0) = "--test" Then
  WScript.Echo "UEFY LIVE: central respondeu corretamente."
  WScript.Quit 0
 End If
End If
On Error Resume Next
uefyShell.Run uefyOrigin & "/painel.html", 1, False
If Err.Number <> 0 Then MsgBox "A central esta pronta. Abra: " & uefyOrigin & "/painel.html", vbInformation, "UEFY LIVE"
On Error GoTo 0
