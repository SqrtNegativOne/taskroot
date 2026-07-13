Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")
WshShell.CurrentDirectory = objFSO.GetParentFolderName(objFSO.GetParentFolderName(WScript.ScriptFullName))
WshShell.Run "cmd.exe /c npm run start:offline", 0, False
