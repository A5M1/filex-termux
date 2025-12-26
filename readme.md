Termux Explorer

A lightweight web-based file explorer and shell for Termux and Linux environments.
Runs on Node.js using Express and HTMX with no build step.

Features
- Browse filesystem with folders-first sorting
- Upload, download, rename, delete files and directories
- Inline text editor for common config and code files
- Image and video preview
- Zip entire directories
- Execute shell commands in the current directory
- HTMX-driven navigation (no page reloads)
- Grayscale black & white UI
- Mobile friendly

Requirements
- Node.js (16+ recommended)
- npm

Installation
npm install express multer archiver

Usage
node server.js

Open in browser
http://0.0.0.0:3390

Environment
- Root directory defaults to $HOME
- Can be overridden by starting the server in another directory
- Designed for Termux but works on standard Linux

File Operations
- Click folders to navigate
- ".." goes to parent directory
- Upload replaces existing files with the same name
- Zipping a folder streams a zip directly to the browser
- Editable files open in an inline editor

Shell
- Executes commands using the system shell
- Runs in the currently viewed directory
- Output is appended to the console panel

Security Warning
This is a local tool.
No authentication, no sandboxing.
Do not expose to untrusted networks.

Editable File Types
.txt .js .json .html .css .md .py .sh .env
.yaml .lua .php .xml .ini .conf

Ports
Host: 0.0.0.0
Port: 3390

License
MIT
