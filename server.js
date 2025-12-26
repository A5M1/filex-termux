const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const { exec } = require('child_process');
const HOST = '0.0.0.0';
const app = express();
const upload = multer({ dest: 'uploads/' });
const ROOT = process.cwd();
const PORT = '3390';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get(/^\/raw\/(.*)/, (req, res) => {
    const filePath = '/' + req.params[0];
    res.sendFile(filePath, { acceptRanges: true });
});

const getIcon = (f, isDir) => {
    if (isDir) return '📁';
    const ext = path.extname(f).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) return '🖼️';
    if (['.mp4', '.webm', '.ogg', '.mov'].includes(ext)) return '🎬';
    if (['.txt', '.js', '.json', '.html', '.css', '.md'].includes(ext)) return '📝';
    return '📄';
};

const renderItems = (currentDir) => {
    const files = fs.readdirSync(currentDir);
    const parentDir = path.resolve(currentDir, '..');

    let listHtml = `
    <div class="item" hx-get="/list?dir=${encodeURIComponent(parentDir)}" hx-target="#file-list" style="cursor:pointer">
        <span>⬅️ .. <small>(Parent)</small></span>
    </div>`;

    listHtml += files.map(f => {
        const fullPath = path.resolve(currentDir, f);
        let stats;
        try { stats = fs.statSync(fullPath); } catch(e) { return ''; }

        const isDir = stats.isDirectory();
        const ext = path.extname(f).toLowerCase();
        const editable = ['.txt', '.js', '.json', '.html', '.css', '.md', '.py', '.sh'].includes(ext);
        const isImg = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
        const isVid = ['.mp4', '.webm', '.ogg', '.mov'].includes(ext);
        const rawUrl = `/raw${fullPath}`;

        return `
        <div class="item">
            <div class="file-info">
                <span class="icon">${getIcon(f, isDir)}</span>
                ${isDir ? `<a href="#" hx-get="/list?dir=${encodeURIComponent(fullPath)}" hx-target="#file-list">${f}</a>` :
                  (isImg) ? `<a href="${rawUrl}" data-fancybox="gallery" data-caption="${f}">${f}</a>` :
                  (isVid) ? `<a href="${rawUrl}" data-fancybox="gallery" data-type="video" data-caption="${f}">${f}</a>` :
                  `<span>${f}</span>`}
            </div>
            <div class="actions">
                ${isDir ? `<a href="/zip?dir=${encodeURIComponent(fullPath)}" class="btn">📦</a>` : ''}
                ${!isDir && editable ? `<button class="btn" hx-get="/edit?file=${encodeURIComponent(fullPath)}" hx-target="#file-list">📝</button>` : ''}
                ${!isDir ? `<a href="/download?file=${encodeURIComponent(fullPath)}" class="btn">💾</a>` : ''}
                <button class="btn" hx-get="/rename-prompt?dir=${encodeURIComponent(currentDir)}&old=${encodeURIComponent(f)}" hx-target="#file-list">✏️</button>
                <button class="btn delete" hx-get="/delete?dir=${encodeURIComponent(currentDir)}&name=${encodeURIComponent(f)}" hx-target="#file-list" hx-confirm="Delete ${f}?">🗑️</button>
            </div>
        </div>`;
    }).join('');
    return listHtml;
};

const layout = (content, currentPath) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Termux Explorer Pro</title>
    <script src="https://unpkg.com/htmx.org@1.9.10"></script>
    <script src="https://cdn.jsdelivr.net/npm/@fancyapps/ui@5.0/dist/fancybox/fancybox.umd.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fancyapps/ui@5.0/dist/fancybox/fancybox.css" />
    <style>
        :root { --bg: #0f0f0f; --card: #1e1e1e; --accent: #bb86fc; --text: #efefef; --border: #333; }
        body { background: var(--bg); color: var(--text); font-family: sans-serif; margin: 0; padding: 10px; display: flex; justify-content: center; }
        .container { width: 100%; max-width: 900px; }
        .card { background: var(--card); border-radius: 12px; padding: 15px; border: 1px solid var(--border); box-shadow: 0 4px 15px rgba(0,0,0,0.5); }
        .path-bar { background: #2a2a2a; padding: 12px; border-radius: 8px; margin-bottom: 15px; font-family: monospace; color: var(--accent); word-break: break-all; font-size: 0.9rem; }
        .toolbar { display: flex; gap: 8px; margin-bottom: 15px; flex-wrap: wrap; }
        input, button, textarea { background: #2a2a2a; color: white; border: 1px solid #444; padding: 10px; border-radius: 6px; font-size: 14px; }
        .item { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #2a2a2a; transition: 0.2s; }
        .item:hover { background: #252525; }
        .file-info { display: flex; align-items: center; gap: 10px; overflow: hidden; }
        .file-info span, .file-info a { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        a { color: var(--accent); text-decoration: none; }
        .btn { cursor: pointer; background: none; border: none; font-size: 1.2rem; color: var(--text); padding: 5px; }
        .delete { filter: hue-rotate(280deg); }
        .console { background: black; color: #00ff00; font-family: monospace; padding: 10px; border-radius: 8px; margin-top: 20px; border: 1px solid #333; }
        #console-output { height: 150px; overflow-y: auto; margin-bottom: 10px; font-size: 12px; white-space: pre-wrap; }
        .editor-container { width: 100%; }
        textarea.editor { width: 100%; height: 60vh; font-family: monospace; background: #111; color: #cecece; resize: vertical; box-sizing: border-box; }
        
        @media (max-width: 600px) {
            .actions { display: flex; gap: 2px; }
            .btn { font-size: 1rem; }
            .toolbar form { width: 100%; display: flex; }
            .toolbar input { flex-grow: 1; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="path-bar" id="path-display">${currentPath}</div>
            <div class="toolbar">
                <form hx-post="/mkdir" hx-target="#file-list">
                    <input type="hidden" name="path" id="p-mkdir" value="${currentPath}">
                    <input name="name" placeholder="New Folder" required><button>＋</button>
                </form>
                <form hx-encoding="multipart/form-data" hx-post="/upload" hx-target="#file-list">
                    <input type="hidden" name="path" id="p-upload" value="${currentPath}">
                    <input type="file" name="file" required><button>⬆</button>
                </form>
            </div>
            <div id="file-list">${content}</div>
            
            <div class="console">
                <div id="console-output">Type a command below...</div>
                <form hx-post="/shell" hx-target="#console-output" hx-swap="beforeend" style="display:flex; gap:5px;">
                    <input type="hidden" name="path" id="p-shell" value="${currentPath}">
                    <span style="align-self:center">$</span>
                    <input name="cmd" style="flex-grow:1; border:none; outline:none; background:transparent;" autocomplete="off">
                </form>
            </div>
        </div>
    </div>
    <script>
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js');
        }
        Fancybox.bind("[data-fancybox]", {});
        document.body.addEventListener('htmx:afterSwap', (e) => {
            const p = e.detail.xhr.getResponseHeader('X-Path');
            if(p) {
                document.getElementById('path-display').innerText = p;
                document.getElementById('p-mkdir').value = p;
                document.getElementById('p-upload').value = p;
                document.getElementById('p-shell').value = p;
            }
            if(e.detail.target.id === 'console-output') {
                e.detail.target.scrollTop = e.detail.target.scrollHeight;
                e.detail.elt.reset();
            }
            Fancybox.bind("[data-fancybox]", {});
        });
    </script>
</body>
</html>`;

const update = (res, dir) => {
    res.setHeader('X-Path', dir);
    res.send(renderItems(dir));
};

app.get('/', (req, res) => {
    const dir = path.resolve(req.query.dir || ROOT);
    res.send(layout(renderItems(dir), dir));
});

app.get('/sw.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.send(`self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('fetch', e => e.respondWith(fetch(e.request)));`);
});

app.get('/list', (req, res) => update(res, path.resolve(req.query.dir)));

app.post('/upload', upload.single('file'), (req, res) => {
    const dest = path.join(req.body.path, req.file.originalname);
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    fs.renameSync(req.file.path, dest);
    update(res, req.body.path);
});

app.post('/mkdir', (req, res) => {
    fs.mkdirSync(path.join(req.body.path, req.body.name), { recursive: true });
    update(res, req.body.path);
});

app.get('/download', (req, res) => res.download(req.query.file));

app.get('/zip', (req, res) => {
    const dirPath = req.query.dir;
    const archive = archiver('zip', { zlib: { level: 9 } });
    res.attachment(`${path.basename(dirPath)}.zip`);
    archive.pipe(res);
    archive.directory(dirPath, false);
    archive.finalize();
});

app.get('/edit', (req, res) => {
    const file = req.query.file;
    const content = fs.readFileSync(file, 'utf8');
    res.send(`
    <div class="editor-container">
        <h3>Editing: ${path.basename(file)}</h3>
        <form hx-post="/save" hx-target="#file-list">
            <input type="hidden" name="file" value="${file}">
            <textarea name="content" class="editor">${content.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</textarea>
            <div style="margin-top:10px; display:flex; gap:10px;">
                <button type="submit">💾 Save Changes</button>
                <button type="button" hx-get="/list?dir=${encodeURIComponent(path.dirname(file))}" hx-target="#file-list">❌ Cancel</button>
            </div>
        </form>
    </div>`);
});

app.post('/save', (req, res) => {
    fs.writeFileSync(req.body.file, req.body.content);
    update(res, path.dirname(req.body.file));
});

app.post('/shell', (req, res) => {
    const { cmd, path: cwd } = req.body;
    exec(cmd, { cwd }, (err, stdout, stderr) => {
        res.send(`\n> ${cmd}\n${stdout}${stderr}`);
    });
});

app.get('/rename-prompt', (req, res) => {
    const { dir, old } = req.query;
    res.send(`<div class="item">
        <form hx-get="/rename" hx-target="#file-list" style="width:100%; display:flex; gap:10px;">
            <input type="hidden" name="dir" value="${dir}">
            <input type="hidden" name="old" value="${old}">
            <input name="new" value="${old}" autofocus style="flex-grow:1">
            <button type="submit">OK</button>
            <button type="button" hx-get="/list?dir=${encodeURIComponent(dir)}" hx-target="#file-list">Cancel</button>
        </form>
    </div>`);
});

app.get('/rename', (req, res) => {
    fs.renameSync(path.join(req.query.dir, req.query.old), path.join(req.query.dir, req.query.new));
    update(res, req.query.dir);
});

app.get('/delete', (req, res) => {
    const p = path.join(req.query.dir, req.query.name);
    const stats = fs.statSync(p);
    stats.isDirectory() ? fs.rmSync(p, { recursive: true }) : fs.unlinkSync(p);
    update(res, req.query.dir);
});

app.listen(PORT, HOST, () => console.log(`Explorer: http://${HOST}:${PORT}`));
