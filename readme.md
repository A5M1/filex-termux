# Termux Explorer

A lightweight web-based file explorer and shell for Termux and Linux environments.
Runs on Node.js using Express and HTMX with no build step.

## Features
- Browse filesystem with folders-first sorting
- Upload, download, rename, delete files and directories
- Inline text editor for common config and code files
- Image and video preview
- Zip entire directories
- Execute shell commands in the current directory
- HTMX-driven navigation (no page reloads)
- Grayscale black & white UI
- Mobile friendly

## Requirements
- `Node.js`
- `ffmpeg`
- `sqlite`
- `npm`

## Installation
```bash
chmod +x ./setup.sh
./setup.sh # install with ndk path properly exported. (will also install deps)
npm install express multer archiver ws
```

## Usage
`node server.js`

Open in browser
`http://0.0.0.0:3390`

# Environment
- Root directory defaults to $HOME
- Can be overridden by starting the server in another directory
- Designed for Termux but works on standard Linux

# File Operations
- Click folders to navigate
- ".." goes to parent directory
- Upload replaces existing files with the same name
- Zipping a folder streams a zip directly to the browser
- Editable files open in an inline editor

# Shell
- Executes commands using the system shell
- Runs in the currently viewed directory
- Output is appended to the console panel

## Security Warning
This is a local tool.
No authentication, no sandboxing.
Do not expose to untrusted networks.

## Editable File Types
`.txt .js .json .html .css .md .py .sh .env
.yaml .lua .php .xml .ini .conf`

# Screenshots:
<img width="1873" height="1032" alt="image" src="https://github.com/user-attachments/assets/09da8c9a-2c5c-44ad-b706-35dd3aa25195" />
<img width="50%" height="50%" alt="10 0 0 106_3390_(iPhone 12 Pro)" src="https://github.com/user-attachments/assets/44cc2d78-60c8-41a6-bb99-9b9eaae73f0a" />

`
Ports
Host: 0.0.0.0
Port: 3390
`

# License
`MIT`
