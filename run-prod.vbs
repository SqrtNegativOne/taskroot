Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "cmd.exe /c npm run build && npm run electron:start", 0, False
