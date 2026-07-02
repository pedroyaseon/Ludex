@echo off
setlocal

set "VSDEVCMD=%ProgramFiles(x86)%\Microsoft Visual Studio\2022\BuildTools\Common7\Tools\VsDevCmd.bat"

if exist "%VSDEVCMD%" (
  call "%VSDEVCMD%" -arch=x64 -host_arch=x64 >nul
)

"%USERPROFILE%\.cargo\bin\cargo.exe" test --manifest-path src-tauri\Cargo.toml
