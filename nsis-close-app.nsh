; Close any running Cheesy Bite POS instance before installing new files.
; This prevents "file in use" errors that silently leave old code in place.

!macro customInstall
  DetailPrint "Closing any running Cheesy Bite POS instances..."
  ExecWait 'taskkill /F /IM "Cheesy Bite POS.exe" /T' $0
  Sleep 1000
!macroend

!macro customUnInstall
!macroend
