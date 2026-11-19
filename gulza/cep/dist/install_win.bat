@echo off
rem GULZA CEP panel - install for the current user (Windows).
rem Copies com.ruruoni1.gulza into the CEP extensions folder and allows unsigned panels (PlayerDebugMode).
set "DEST=%APPDATA%\Adobe\CEP\extensions\com.ruruoni1.gulza"
if exist "%DEST%" rmdir /S /Q "%DEST%"
xcopy /E /I /Y /Q "%~dp0com.ruruoni1.gulza" "%DEST%" >nul
for %%v in (10 11 12 13 14) do reg add "HKCU\Software\Adobe\CSXS.%%v" /v PlayerDebugMode /t REG_SZ /d 1 /f >nul
echo Installed: %DEST%
echo Restart After Effects, then open Window ^> Extensions ^> GULZA.
pause
