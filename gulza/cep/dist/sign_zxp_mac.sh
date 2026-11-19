#!/bin/bash
# Make a signed GULZA.zxp for distribution (macOS). Needs ZXPSignCmd (Adobe CEP-Resources, "ZXPSignCMD")
# next to this file or on PATH. The self-signed certificate is created once (gulza_cert.p12) and reused.
set -e
cd "$(dirname "$0")"
Z=./ZXPSignCmd; [ -x "$Z" ] || Z=ZXPSignCmd
PASS="${GULZA_CERT_PASS:-change-this-password}"
[ -f gulza_cert.p12 ] || "$Z" -selfSignedCert KR Seoul ruruoni1 GULZA "$PASS" gulza_cert.p12
rm -f GULZA.zxp
"$Z" -sign com.ruruoni1.gulza GULZA.zxp gulza_cert.p12 "$PASS" -tsa http://timestamp.digicert.com
"$Z" -verify GULZA.zxp
echo "GULZA.zxp ready"
