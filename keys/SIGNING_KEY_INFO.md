# Tauri Signing Key Information

⚠️ **CRITICAL: Keep this information secure!**

## Key Files

- **Private Key**: `keys/updater.key` (NEVER commit to git!)
- **Public Key**: `keys/updater.key.pub` (Safe to commit)

## Password

```
Password: anyon-desktop-2025
```

⚠️ **Important**: If you lose the private key or password, you will NOT be able to sign future updates!

## GitHub Secrets Setup

Add these secrets to your GitHub repository:

1. Go to: `https://github.com/ownuun/anyon-mvp/settings/secrets/actions`

2. Add `TAURI_SIGNING_PRIVATE_KEY`:
   ```bash
   # Copy the entire content of keys/updater.key
   cat keys/updater.key
   ```

3. Add `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`:
   ```
   anyon-desktop-2025
   ```

## Status

✅ Keys generated: 2025-11-25
✅ Public key added to tauri.conf.json
⏳ GitHub secrets: Not yet configured

## Local Signing

To sign releases locally:

```bash
export TAURI_SIGNING_PRIVATE_KEY="$(cat keys/updater.key)"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="anyon-desktop-2025"

pnpm run tauri:build
```

## Backup

🔒 **Back up these files securely:**
- `keys/updater.key` (private key)
- This document (password)

**Recommended**: Store in a password manager (1Password, LastPass, etc.)

## Key Rotation

If the key is compromised:
1. Generate new keypair
2. Update public key in tauri.conf.json
3. Update GitHub secrets
4. Release new version
5. Users must manually update to this version
6. All future updates will use new key

---

Generated: 2025-11-25
