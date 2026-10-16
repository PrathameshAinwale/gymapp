Set WshShell = CreateObject("WScript.Shell")
strPath = WshShell.CurrentDirectory
WshShell.Run "python """ & "c:\Users\ARCH\Desktop\gymapp\device-sync-service\sync_service.py" & """", 0, False
