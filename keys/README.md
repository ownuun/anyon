# Tauri Update Signing Keys

This directory contains the Ed25519 key pair used for signing Tauri updates.

## Generating Keys

To generate new signing keys, run:

```bash
cargo tauri signer generate -w keys/updater.key
```

This will:
1. Prompt for a password to protect the private key
2. Generate `keys/updater.key` (private key, **NEVER commit this!**)
3. Generate `keys/updater.key.pub` (public key, safe to commit)

## Key Management

### Private Key (`updater.key`)
- **NEVER** commit this to version control
- Store in CI/CD secrets as `TAURI_SIGNING_PRIVATE_KEY`
- Keep secure backups offline

### Public Key (`updater.key.pub`)
- Safe to commit to version control
- Added to `tauri.conf.json` for update verification
- Distributed with the app

## Environment Variables

When building releases, set:

```bash
export TAURI_SIGNING_PRIVATE_KEY="$(cat keys/updater.key)"
export TAURI_SIGNING_PRIVATE_KEY_PASSWORD="your-key-password"
```

## GitHub Actions

Add these secrets to your repository:
- `TAURI_SIGNING_PRIVATE_KEY`: Content of `updater.key`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: Password used to encrypt the key

## Security Notes

- Private key is protected with a password
- Keys use Ed25519 cryptography
- Updates are signed during build
- Clients verify signatures before installing updates

## Rotation

If keys are compromised:
1. Generate new key pair
2. Update public key in `tauri.conf.json`
3. Update private key in CI secrets
4. Release new version (users must manually update this version)
5. All subsequent updates will use new keys
