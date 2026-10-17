#!/usr/bin/env bash
# Adds a release signingConfig to the generated android/app/build.gradle (keystore path + passwords come from env).
set -euo pipefail
g=android/app/build.gradle
grep -q "signingConfigs.release" "$g" && exit 0
python3 - "$g" <<'PY'
import sys,re
p=sys.argv[1]; s=open(p).read()
sc='''    signingConfigs {
        release {
            storeFile file(System.getenv("KEYSTORE_PATH"))
            storeType "pkcs12"
            storePassword System.getenv("KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEY_ALIAS")
            keyPassword System.getenv("KEY_PASSWORD")
        }
    }
'''
s=s.replace("    buildTypes {",sc+"    buildTypes {",1)
s=re.sub(r"(buildTypes\s*\{\s*release\s*\{)",r"\1\n            signingConfig signingConfigs.release",s,1)
vc=__import__('os').environ.get('VERSION_CODE')
if vc: s=re.sub(r"versionCode\s+\d+","versionCode "+vc,s,1)
open(p,'w').write(s)
PY
grep -n "signingConfig" "$g"
