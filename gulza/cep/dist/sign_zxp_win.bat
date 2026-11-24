@echo off
rem Make a signed GULZA.zxp for distribution (Windows). Needs ZXPSignCmd.exe (Adobe CEP-Resources, "ZXPSignCMD")
rem next to this file or on PATH. The self-signed certificate is created once (gulza_cert.p12) and reused.
cd /d "%~dp0"
set "Z=ZXPSignCmd.exe"
if "%GULZA_CERT_PASS%"=="" set "GULZA_CERT_PASS=change-this-password"
if not exist gulza_cert.p12 %Z% -selfSignedCert KR Seoul ruruoni1 GULZA %GULZA_CERT_PASS% gulza_cert.p12
if exist GULZA.zxp del GULZA.zxp
%Z% -sign com.ruruoni1.gulza GULZA.zxp gulza_cert.p12 %GULZA_CERT_PASS% -tsa http://timestamp.digicert.com
%Z% -verify GULZA.zxp
echo GULZA.zxp ready
pause
