!include LogicLib.nsh

!macro customPageAfterChangeDir
  !undef MUI_PAGE_CUSTOMFUNCTION_PRE
  !define MUI_PAGE_CUSTOMFUNCTION_PRE l2tvNormalizeInstallDir

  Function l2tvNormalizeInstallDir
    StrLen $0 "\${APP_FILENAME}\${APP_FILENAME}"
    StrCpy $1 $INSTDIR $0 -$0

    ${If} $1 == "\${APP_FILENAME}\${APP_FILENAME}"
      StrLen $2 "\${APP_FILENAME}"
      StrLen $3 $INSTDIR
      IntOp $3 $3 - $2
      StrCpy $INSTDIR $INSTDIR $3
    ${EndIf}
  FunctionEnd
!macroend
