# Code Signing Guide

This guide covers code signing for Anyon Desktop across all platforms to eliminate security warnings during installation.

## Overview

Code signing proves that the software comes from a trusted source and hasn't been tampered with. Without code signing:
- **macOS**: "App from unidentified developer" warning
- **Windows**: "Windows protected your PC" SmartScreen warning
- **Linux**: No significant warnings (code signing optional)

## Cost Summary

| Platform | Certificate Type | Annual Cost | Required For |
|----------|-----------------|-------------|--------------|
| macOS | Apple Developer Program | $99/year | DMG signing + notarization |
| Windows | EV Code Signing | ~$300/year | MSI/EXE signing |
| Linux | N/A | Free | AppImage/DEB (optional) |

**Total**: ~$400/year for professional distribution

## Platform-Specific Setup

### macOS Code Signing

#### Prerequisites
1. Apple Developer Program membership ($99/year)
2. macOS computer for signing
3. Xcode installed

#### Steps

1. **Join Apple Developer Program**
   - Visit https://developer.apple.com/programs/
   - Enroll as an individual or organization
   - Wait for approval (1-2 days)

2. **Create Certificates**
   ```bash
   # Open Xcode
   # Xcode → Settings → Accounts → Manage Certificates
   # Click '+' → Choose "Developer ID Application"
   ```

3. **Get Team ID and Certificate Identity**
   ```bash
   # Find your Team ID
   # Visit https://developer.apple.com/account
   # Membership → Team ID

   # Find certificate identity
   security find-identity -v -p codesigning
   ```

4. **Update tauri.conf.json**
   ```json
   {
     "bundle": {
       "macOS": {
         "signingIdentity": "Developer ID Application: Your Name (TEAM_ID)",
         "providerShortName": "YOUR_TEAM_ID",
         "entitlements": "entitlements.plist"
       }
     }
   }
   ```

5. **Create Entitlements File** (`src-tauri/entitlements.plist`)
   ```xml
   <?xml version="1.0" encoding="UTF-8"?>
   <!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
   <plist version="1.0">
   <dict>
     <key>com.apple.security.cs.allow-jit</key>
     <true/>
     <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
     <true/>
     <key>com.apple.security.cs.allow-dyld-environment-variables</key>
     <true/>
   </dict>
   </plist>
   ```

6. **Notarization**

   Notarization is required for macOS 10.15+ apps distributed outside the App Store.

   ```bash
   # Store credentials
   xcrun notarytool store-credentials "anyon-notary" \
     --apple-id "your@email.com" \
     --team-id "TEAM_ID" \
     --password "app-specific-password"
   ```

   Create app-specific password:
   - Visit https://appleid.apple.com
   - Sign In → Security → App-Specific Passwords
   - Generate password for notarization

7. **GitHub Actions Secrets**
   ```
   APPLE_CERTIFICATE: Base64-encoded .p12 certificate
   APPLE_CERTIFICATE_PASSWORD: Certificate password
   APPLE_ID: Apple ID email
   APPLE_PASSWORD: App-specific password
   APPLE_TEAM_ID: Your Team ID
   ```

### Windows Code Signing

#### Prerequisites
1. EV Code Signing Certificate (~$300/year)
2. Hardware token (usually included with certificate)

#### Recommended Providers
- DigiCert
- Sectigo (formerly Comodo)
- SSL.com

#### Steps

1. **Purchase EV Code Signing Certificate**
   - Choose a provider
   - Complete identity verification (2-5 days)
   - Receive hardware token

2. **Get Certificate Thumbprint**
   ```powershell
   # On Windows with token inserted
   Get-ChildItem -Path Cert:\CurrentUser\My -CodeSigningCert
   ```

3. **Update tauri.conf.json**
   ```json
   {
     "bundle": {
       "windows": {
         "certificateThumbprint": "YOUR_THUMBPRINT",
         "digestAlgorithm": "sha256",
         "timestampUrl": "http://timestamp.digicert.com"
       }
     }
   }
   ```

4. **GitHub Actions Setup**

   For CI/CD signing, you need to:
   - Export certificate to cloud HSM (like Azure Key Vault)
   - Or use a signing service (like SignPath, SSL.com eSigner)

   **Option A: Azure Key Vault**
   ```yaml
   - name: Azure Code Signing
     uses: azure/login@v1
     with:
       creds: ${{ secrets.AZURE_CREDENTIALS }}

   - name: Sign Windows Binary
     run: |
       azuresigntool sign \
         -kvu "https://your-vault.vault.azure.net" \
         -kvi "${{ secrets.AZURE_CLIENT_ID }}" \
         -kvs "${{ secrets.AZURE_CLIENT_SECRET }}" \
         -kvc "code-signing-cert" \
         -tr http://timestamp.digicert.com \
         -td sha256 \
         target/release/bundle/msi/*.msi
   ```

   **Option B: SignPath (Recommended for OSS)**
   - Free for open source projects
   - Visit https://signpath.io

5. **GitHub Actions Secrets**
   ```
   WINDOWS_CERTIFICATE: Base64-encoded PFX
   WINDOWS_CERTIFICATE_PASSWORD: PFX password
   # Or Azure credentials for cloud HSM
   AZURE_CLIENT_ID: Client ID
   AZURE_CLIENT_SECRET: Client Secret
   AZURE_TENANT_ID: Tenant ID
   ```

### Linux Code Signing

Linux doesn't require code signing for most distributions, but you can sign for added trust.

#### AppImage Signing (Optional)

```bash
# Generate GPG key
gpg --gen-key

# Sign AppImage
gpg --detach-sign --armor Anyon.AppImage

# Users verify with
gpg --verify Anyon.AppImage.asc Anyon.AppImage
```

#### DEB Package Signing

```bash
# Generate GPG key (if not exists)
gpg --gen-key

# Sign package
dpkg-sig --sign builder anyon_0.1.0_amd64.deb

# Verify
dpkg-sig --verify anyon_0.1.0_amd64.deb
```

## GitHub Actions Integration

### Full Workflow with Code Signing

Update `.github/workflows/release-desktop.yml`:

```yaml
- name: Import macOS Certificate
  if: matrix.platform == 'macos-latest'
  env:
    APPLE_CERTIFICATE: ${{ secrets.APPLE_CERTIFICATE }}
    APPLE_CERTIFICATE_PASSWORD: ${{ secrets.APPLE_CERTIFICATE_PASSWORD }}
  run: |
    echo $APPLE_CERTIFICATE | base64 --decode > certificate.p12
    security create-keychain -p actions build.keychain
    security default-keychain -s build.keychain
    security unlock-keychain -p actions build.keychain
    security import certificate.p12 -k build.keychain -P $APPLE_CERTIFICATE_PASSWORD -T /usr/bin/codesign
    security set-key-partition-list -S apple-tool:,apple:,codesign: -s -k actions build.keychain

- name: Build Tauri app
  uses: tauri-apps/tauri-action@v0
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    TAURI_SIGNING_PRIVATE_KEY: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY }}
    TAURI_SIGNING_PRIVATE_KEY_PASSWORD: ${{ secrets.TAURI_SIGNING_PRIVATE_KEY_PASSWORD }}
    APPLE_ID: ${{ secrets.APPLE_ID }}
    APPLE_PASSWORD: ${{ secrets.APPLE_PASSWORD }}
    APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
  with:
    # ... existing config
```

## Testing Signed Apps

### macOS
```bash
# Verify signature
codesign -vv --deep --strict Anyon.app

# Check notarization
spctl -a -vv Anyon.app

# Should output: "accepted"
```

### Windows
```powershell
# Verify signature
Get-AuthenticodeSignature Anyon.msi

# Check certificate chain
signtool verify /pa /v Anyon.msi
```

### Linux
```bash
# Verify GPG signature
gpg --verify Anyon.AppImage.asc Anyon.AppImage
```

## Troubleshooting

### macOS: "App is damaged and can't be opened"
- Signature is invalid or notarization failed
- Run: `codesign -vv --deep --strict Anyon.app` to diagnose
- Re-sign and notarize

### Windows: "Unknown publisher" warning
- Certificate not trusted or expired
- Use EV certificate (not standard certificate)
- Check timestamp server is accessible

### Build fails with signing errors
- Check certificate/key paths
- Verify secrets are set correctly
- Ensure certificates haven't expired
- Check hardware token is connected (Windows)

## Cost-Benefit Analysis

### Without Code Signing
- ❌ Users see scary warnings
- ❌ Lower trust and adoption
- ❌ Some organizations block unsigned apps
- ✅ $0 cost
- ✅ Faster setup

### With Code Signing
- ✅ Professional appearance
- ✅ No security warnings
- ✅ Enterprise-friendly
- ✅ Better trust and adoption
- ❌ ~$400/year cost
- ❌ Complex setup

## Recommendations

1. **Early Stage / Open Source**: Skip code signing initially
   - Focus on functionality
   - Provide clear installation instructions
   - Consider signing only macOS (cheapest, biggest impact)

2. **Professional / Commercial**: Get code signing
   - Required for enterprise users
   - Builds trust with users
   - Worth the investment

3. **Hybrid Approach**: Start with update signing only
   - Use Tauri's update signing (Ed25519) - FREE
   - Add platform signing later as needed
   - Users only see warnings on first install

## Next Steps

1. ✅ Generate Tauri update signing keys (FREE, do this now)
2. 📋 Decide on code signing strategy
3. 💰 If yes: Purchase certificates
4. 🔧 Configure signing in CI/CD
5. 🧪 Test signed builds
6. 🚀 Release signed apps

---

**Note**: This guide is current as of 2025. Certificate requirements and processes may change. Always refer to official documentation from Apple, Microsoft, and certificate authorities.
