#!/data/data/com.termux/files/usr/bin/env bash
set -e
pkg update && pkg upgrade -y
pkg install -y ndk-sysroot clang make python git nodejs ffmpeg sqlite
export NDK_HOME=$(find $PREFIX -type d -name "ndk*" | head -1)
export PATH=$NDK_HOME:$PATH
export npm_config_android_ndk_path=$NDK_HOME
npm install --build-from-source better-sqlite3
