!include LogicLib.nsh

!macro customPageAfterChangeDir
  !undef MUI_PAGE_CUSTOMFUNCTION_PRE
  !define MUI_PAGE_CUSTOMFUNCTION_PRE l2tvSafeInstallDir

  Function l2tvSafeInstallDir
    StrCpy $4 $INSTDIR 1 -1
    ${If} $4 == "\"
      StrLen $2 $INSTDIR
      IntOp $2 $2 - 1
      StrCpy $INSTDIR $INSTDIR $2
    ${EndIf}

    StrLen $0 "\${APP_FILENAME}\${APP_FILENAME}"
    StrCpy $1 $INSTDIR $0 -$0

    ${If} $1 == "\${APP_FILENAME}\${APP_FILENAME}"
      StrLen $2 "\${APP_FILENAME}"
      StrLen $3 $INSTDIR
      IntOp $3 $3 - $2
      StrCpy $INSTDIR $INSTDIR $3
    ${EndIf}

    StrLen $0 "\${APP_FILENAME}"
    StrCpy $1 $INSTDIR $0 -$0
    ${If} $1 != "\${APP_FILENAME}"
      StrCpy $INSTDIR "$INSTDIR\${APP_FILENAME}"
    ${EndIf}
  FunctionEnd
!macroend

!macro customRemoveFiles
  Call un.l2tvAssertSafeInstallDir
  Pop $0
  ${If} $0 != "1"
    MessageBox MB_ICONSTOP|MB_OK "L2TV uninstall was stopped because the install folder is not a dedicated L2TV folder. No files were removed. Please contact HiLowPsi."
    SetErrorLevel 1
    Abort
  ${EndIf}

  SetOutPath $TEMP
  RMDir /r "$INSTDIR"
!macroend

Function un.l2tvAssertSafeInstallDir
  StrLen $0 "\${APP_FILENAME}"
  StrCpy $1 $INSTDIR $0 -$0

  ${If} $1 != "\${APP_FILENAME}"
    Push "0"
    Return
  ${EndIf}

  ${IfNot} ${FileExists} "$INSTDIR\${APP_EXECUTABLE_FILENAME}"
    Push "0"
    Return
  ${EndIf}

  ${IfNot} ${FileExists} "$INSTDIR\resources\app.asar"
    Push "0"
    Return
  ${EndIf}

  Push "1"
FunctionEnd
