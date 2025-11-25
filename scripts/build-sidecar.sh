#!/bin/bash
# Build script for Tauri sidecar binary
# This script builds the anyon-core server and copies it to the correct location for Tauri

set -e

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Determine target triple
TARGET="${TARGET:-$(rustc -vV | grep host | cut -d' ' -f2)}"

echo "Building sidecar for target: $TARGET"

# Build the server in release mode
if [ "$1" = "--release" ] || [ "$RELEASE" = "1" ]; then
    echo "Building in release mode..."
    cargo build --release --target "$TARGET" -p server --bin server
    BINARY_PATH="$PROJECT_ROOT/target/$TARGET/release/server"
else
    echo "Building in debug mode..."
    cargo build --target "$TARGET" -p server --bin server
    BINARY_PATH="$PROJECT_ROOT/target/$TARGET/debug/server"
fi

# Create binaries directory if it doesn't exist
BINARIES_DIR="$PROJECT_ROOT/src-tauri/binaries"
mkdir -p "$BINARIES_DIR"

# Copy binary with platform suffix
DEST_PATH="$BINARIES_DIR/anyon-core-$TARGET"

# On Windows, add .exe suffix
case "$TARGET" in
    *windows*)
        BINARY_PATH="${BINARY_PATH}.exe"
        DEST_PATH="${DEST_PATH}.exe"
        ;;
esac

echo "Copying $BINARY_PATH to $DEST_PATH"
cp "$BINARY_PATH" "$DEST_PATH"

# Make executable on Unix
if [ "$(uname)" != "Windows_NT" ]; then
    chmod +x "$DEST_PATH"
fi

echo "Sidecar binary ready: $DEST_PATH"
