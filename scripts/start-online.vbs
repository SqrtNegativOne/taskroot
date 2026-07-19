Set WshShell = CreateObject("WScript.Shell")
Set objFSO = CreateObject("Scripting.FileSystemObject")
WshShell.CurrentDirectory = objFSO.GetParentFolderName(objFSO.GetParentFolderName(WScript.ScriptFullName))
WshShell.Run "cmd.exe /c bun run start:online", 0, False
