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
- WebSocket support for real-time thumbnail updates
- Video thumbnail generation using FFmpeg
- FancyBox lightbox for media viewing

## Requirements
- `Node.js`
- `ffmpeg`
- `sqlite`
- `npm`
- `better-sqlite3` (installed via npm)
- `archiver` (installed via npm)
- `multer` (installed via npm)
- `ws` (installed via npm)

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

## Ports
Host: 0.0.0.0
Port: 3390

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
- Image and video files are displayed in a grid layout when present
- Video thumbnails are automatically generated and cached

# Shell
- Executes commands using the system shell
- Runs in the currently viewed directory
- Output is appended to the console panel
- Uses `exec` for command execution with proper error handling

## Security Warning
This is a local tool.
No authentication, no sandboxing.
Do not expose to untrusted networks.

## Editable File Types
`.txt .js .json .html .css .md .py .sh .env
.yaml .lua .php .xml .ini .conf`

## Media Support
### Images
- `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`, `.svg`
- Full-size preview with FancyBox lightbox
- Grid layout for multiple images

### Videos
- `.mp4`, `.webm`, `.ogg`, `.mov`, `.mkv`
- HTML5 video player with controls
- Automatic thumbnail generation using FFmpeg
- Hover/touch preview functionality
- Thumbnail caching in SQLite database

### Audio
- `.mp3`, `.wav`, `.flac`
- Basic file icon display

## WebSocket Features
- Real-time thumbnail updates for video files
- Automatic connection to current directory
- Live thumbnail generation notifications
- Touch and hover video preview enhancements

## Key Features

### 1. HTMX-Driven Interface
- No page reloads for navigation
- Dynamic content updates
- Smooth transitions and animations

### 2. Media Grid System
- Automatic detection of media files
- Smart grid layout for images and videos
- Lazy loading for performance
- Touch-friendly interface

### 3. Video Thumbnail System
- Automatic generation using FFmpeg
- SQLite database caching
- Real-time updates via WebSocket
- Fallback to video element when thumbnail unavailable

### 4. File Management
- Drag-and-drop upload (via file input)
- Bulk operations (zip entire directories)
- Inline editing for text-based files
- Search functionality

### 5. Shell Integration
- Command execution in current directory
- Persistent console output
- Command history via browser form

# Screenshots:
<img width="1873" height="1032" alt="image" src="https://github.com/user-attachments/assets/09da8c9a-2c5c-44ad-b706-35dd3aa25195" />
<img width="50%" height="50%" alt="10 0 0 106_3390_(iPhone 12 Pro)" src="https://github.com/user-attachments/assets/44cc2d78-60c8-41a6-bb99-9b9eaae73f0a" />

# API Endpoints

## GET / (root)
- Main page with file listing
- Accepts `?dir` parameter for directory navigation

## GET /list
- Returns file list HTML for HTMX
- Requires `?dir` parameter
- Sets `X-Path` header with current directory

## POST /upload
- File upload endpoint
- Uses multer for multipart handling
- Requires `path` and `file` parameters

## POST /mkdir
- Create new directory
- Requires `path` and `name` parameters

## GET /delete
- Delete file or directory
- Requires `dir` and `name` parameters

## GET /rename-prompt
- Show rename form
- Requires `dir` and `old` parameters

## POST /rename
- Execute rename operation
- Requires `dir`, `old`, and `newname` parameters

## GET /edit
- Open file in editor
- Requires `file` parameter

## POST /save
- Save edited file content
- Requires `file` and `content` parameters

## POST /shell
- Execute shell command
- Requires `path` and `cmd` parameters
- Returns command output

## GET /download
- Download file
- Requires `file` parameter

## GET /zip
- Download directory as zip
- Requires `dir` parameter

## GET /raw/*
- Serve raw file content
- Used for media files and downloads

## GET /thumb/*
- Serve video thumbnails
- Generated from SQLite cache

# WebSocket Support
- Path: `/ws?dir=<directory>`
- Real-time thumbnail updates
- Automatic connection management

# License
`MIT`
