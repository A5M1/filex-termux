const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const {
    exec,
    execSync
} = require('child_process');
const Database = require('better-sqlite3');

const HOST = '0.0.0.0';
const PORT = '3390';
const ROOT = process.env.HOME || process.cwd();
const upload = multer({
    dest: 'uploads/'
});
const videoExts = ['.mp4', '.webm', '.ogg', '.mov'];

function ensureThumbDB(dir) {
    const dbPath = path.join(dir, '.thumbs.db');
    try {
        const db = new Database(dbPath);
        db.exec(`CREATE TABLE IF NOT EXISTS thumbs (
            filename TEXT PRIMARY KEY,
            ext TEXT,
            thumb BLOB
        )`);
        return db;
    } catch (e) {
        return null;
    }
}

function generateThumb(fullPath, db) {
    const f = path.basename(fullPath);
    const ext = path.extname(f).toLowerCase();
    if (db.prepare('SELECT 1 FROM thumbs WHERE filename=?').get(f)) return;
    const tmp = path.join(path.dirname(fullPath), '.tmp_thumb.jpg');
    try {
        execSync(`ffmpeg -y -i "${fullPath}" -ss 00:00:01.000 -vframes 1 "${tmp}" -hide_banner -loglevel error`);
        const img = fs.readFileSync(tmp);
        db.prepare('INSERT OR REPLACE INTO thumbs(filename, ext, thumb) VALUES(?,?,?)')
            .run(f, ext, img);
        fs.unlinkSync(tmp);
    } catch (e) {}
}

function getThumb(fullPath, db) {
    if (!db) return null;
    const row = db.prepare('SELECT thumb FROM thumbs WHERE filename=?').get(path.basename(fullPath));
    return row ? `data:image/jpeg;base64,${row.thumb.toString('base64')}` : null;
}

const app = express();
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

app.get(/^\/raw\/(.*)/, (req, res) => {
    const filePath = '/' + req.params[0];
    res.sendFile(filePath, {
        acceptRanges: true
    });
});

const getIconClass = (f, isDir) => {
    if (isDir) return 'ri-folder-3-fill icon-dir';
    const ext = path.extname(f).toLowerCase();
    if (['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) return 'ri-image-fill icon-img';
    if (['.mp4', '.webm', '.ogg', '.mov', '.mkv'].includes(ext)) return 'ri-movie-fill icon-vid';
    if (['.mp3', '.wav', '.flac'].includes(ext)) return 'ri-music-fill icon-aud';
    if (['.js', '.json', '.html', '.css', '.py', '.php', '.c', '.cpp', '.h'].includes(ext)) return 'ri-code-s-slash-line icon-code';
    if (['.zip', '.tar', '.gz', '.7z', '.rar'].includes(ext)) return 'ri-file-zip-line icon-zip';
    if (['.md', '.txt'].includes(ext)) return 'ri-text icon-txt';
    return 'ri-file-line icon-default';
};

const renderItems = (currentDir) => {
    const files = fs.readdirSync(currentDir);
    const parentDir = path.resolve(currentDir, '..');
    const mediaExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.mp4', '.webm', '.ogg', '.mov'];
    files.sort((a, b) => {
        const ap = path.resolve(currentDir, a),
            bp = path.resolve(currentDir, b);
        let as, bs;
        try {
            as = fs.statSync(ap);
            bs = fs.statSync(bp);
        } catch {
            return 0;
        }
        if (as.isDirectory() && !bs.isDirectory()) return -1;
        if (!as.isDirectory() && bs.isDirectory()) return 1;
        return a.localeCompare(b);
    });
    const hasMedia = files.some(f => {
        const p = path.resolve(currentDir, f);
        try {
            if (fs.statSync(p).isDirectory()) return false;
        } catch {
            return false;
        }
        return mediaExts.includes(path.extname(f).toLowerCase());
    });
    let html = `<div class="item parent-dir" hx-get="/list?dir=${encodeURIComponent(parentDir)}" hx-target="#file-list"><div class="file-info"><i class="ri-arrow-go-back-line"></i><span>..</span></div></div>`;
    let thumbDB;
    if (hasMedia) {
        thumbDB = ensureThumbDB(currentDir);
        html += `<div class="media-grid">`;
        files.forEach(f => {
            const full = path.resolve(currentDir, f);
            let s;
            try {
                s = fs.statSync(full);
            } catch {
                return;
            }
            if (s.isDirectory()) return;
            const ext = path.extname(f).toLowerCase();
            if (!mediaExts.includes(ext)) return;
            const raw = `/raw${full}`;
            const isVid = videoExts.includes(ext);
            let thumb = null;
            if (isVid && thumbDB) {
                generateThumb(full, thumbDB);
                thumb = getThumb(full, thumbDB);
            }
            html += `<a class="media-item" href="${raw}" data-fancybox data-type="${isVid?'html5video':'image'}" ${isVid?`data-video='{"autoplay":true,"loop":true,"muted":true,"controls":true,"playsinline":true}'`:''} data-caption="${f}">${isVid? (thumb? `<img src="${thumb}" loading="lazy">`:`<video preload="metadata" muted playsinline></video>`):`<img src="${raw}" loading="lazy" decoding="async">`}</a>`;
        });
        html += `</div>`;
    }
    files.forEach(f => {
        const full = path.resolve(currentDir, f);
        let s;
        try {
            s = fs.statSync(full);
        } catch {
            return;
        }
        const isDir = s.isDirectory();
        const ext = path.extname(f).toLowerCase();
        const editable = ['.txt', '.js', '.json', '.html', '.css', '.md', '.py', '.sh', '.env', '.yaml', '.lua', '.php', '.xml', '.ini', '.conf'].includes(ext) || f.startsWith('.');
        const isImg = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext);
        const isVid = videoExts.includes(ext);
        const raw = `/raw${full}`;
        const size = isDir ? '' : (s.size > 1048576 ? (s.size / 1048576).toFixed(1) + ' MB' : (s.size / 1024).toFixed(1) + ' KB');
        html += `<div class="item file-row fade-in"><div class="file-info"><i class="${getIconClass(f,isDir)}"></i><div class="name-col">${isDir?`<a href="#" hx-get="/list?dir=${encodeURIComponent(full)}" hx-target="#file-list">${f}</a>`:isImg?`<a href="${raw}" data-fancybox data-caption="${f}">${f}</a>`:isVid?`<a href="${raw}" data-fancybox data-type="html5video" data-video='{"autoplay":true,"loop":true,"muted":true,"controls":true,"playsinline":true}' data-caption="${f}">${f}</a>`:`<a href="${raw}" target="_blank">${f}</a>`}<span class="meta-size">${size}</span></div></div><div class="actions">${isDir?`<a href="/zip?dir=${encodeURIComponent(full)}" class="btn-icon"><i class="ri-archive-line"></i></a>`:''}${!isDir&&editable?`<button class="btn-icon" hx-get="/edit?file=${encodeURIComponent(full)}" hx-target="#file-list"><i class="ri-edit-2-line"></i></button>`:''}${!isDir?`<a href="/download?file=${encodeURIComponent(full)}" class="btn-icon"><i class="ri-download-line"></i></a>`:''}<button class="btn-icon" hx-get="/rename-prompt?dir=${encodeURIComponent(currentDir)}&old=${encodeURIComponent(f)}" hx-target="#file-list"><i class="ri-pencil-line"></i></button><button class="btn-icon delete" hx-get="/delete?dir=${encodeURIComponent(currentDir)}&name=${encodeURIComponent(f)}" hx-target="#file-list" hx-confirm="Delete ${f}?"><i class="ri-delete-bin-line"></i></button></div></div>`;
    });
    return html;
};

const layout = (content, currentPath) => `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Termux Explorer</title>
    <script src="https://unpkg.com/htmx.org@1.9.10"></script>
    <script src="https://cdn.jsdelivr.net/npm/@fancyapps/ui@5.0/dist/fancybox/fancybox.umd.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fancyapps/ui@5.0/dist/fancybox/fancybox.css" />
    <link href="https://cdn.jsdelivr.net/npm/remixicon@4.1.0/fonts/remixicon.css" rel="stylesheet"/>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
:root{
--bg-app:#000;
--bg-panel:#0a0a0a;
--bg-input:#111;
--border:#222;
--primary:#fff;
--primary-hover:#e5e5e5;
--text-main:#fff;
--text-muted:#aaa;
--danger:#fff;
--folder:#fff;
--radius:8px;
}
 .media-grid{
display:grid;
grid-template-columns:repeat(auto-fill,minmax(220px,1fr));
gap:14px;
padding:14px;
}
.media-item{
position:relative;
aspect-ratio:1/1;
overflow:hidden;
border-radius:8px;
background:#000;
}
.media-item img,
.media-item video{
width:100%;
height:100%;
object-fit:cover;
display:block;
}
.media-item video{
pointer-events:none;
background:#000;
}
   
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
body{
background:var(--bg-app);
color:var(--text-main);
font-family:'Inter',system-ui,sans-serif;
margin:0;
padding:0;
font-size:14px;
}
.container{max-width:1000px;margin:0 auto;padding:15px;}
.card{
background:var(--bg-panel);
border-radius:var(--radius);
box-shadow:0 4px 6px -1px rgba(0,0,0,0.6);
border:1px solid var(--border);
overflow:hidden;
display:flex;
flex-direction:column;
min-height:85vh;
}
.header{
padding:15px;
border-bottom:1px solid var(--border);
background:#000;
position:sticky;
top:0;
z-index:10;
}
.path-display{
display:flex;
align-items:center;
background:var(--bg-input);
padding:8px 12px;
border-radius:6px;
border:1px solid var(--border);
margin-bottom:12px;
}
.path-display i{color:var(--text-main);margin-right:8px;}
.path-input{
background:transparent;
border:none;
color:var(--text-main);
font-family:'JetBrains Mono',monospace;
flex-grow:1;
outline:none;
font-size:13px;
}
.controls{display:grid;grid-template-columns:1fr auto;gap:10px;}
input,textarea,button,.btn{
background:var(--bg-input);
border:1px solid var(--border);
color:var(--text-main);
padding:8px 12px;
border-radius:6px;
font-size:13px;
font-family:'Inter',system-ui,sans-serif;
outline:none;
}
input:focus,textarea:focus{border-color:var(--primary);}
.btn,button{
cursor:pointer;
font-weight:500;
display:inline-flex;
align-items:center;
justify-content:center;
gap:6px;
transition:all .15s;
}
.btn:hover,button:hover{background:#222;border-color:#444;}
.btn-primary{background:#fff;color:#000;border-color:#fff;}
.toolbar{display:flex;gap:8px;}
.toolbar form{display:flex;gap:0;}
.toolbar input{border-top-right-radius:0;border-bottom-right-radius:0;border-right:none;}
.toolbar button{border-top-left-radius:0;border-bottom-left-radius:0;}
#file-list{flex-grow:1;overflow-y:auto;padding-bottom:5px;}
.item{
display:flex;
justify-content:space-between;
align-items:center;
padding:10px 15px;
border-bottom:1px solid var(--border);
transition:background .15s;
}
.item:hover{background:#111;}
.file-info{
display:flex;
align-items:center;
gap:12px;
flex:1;
min-width:0;
overflow:hidden;
}
.file-info i{font-size:18px;flex-shrink:0;color:var(--text-main);}
.name-col{display:flex;flex-direction:column;overflow:hidden;}
.file-info a,.file-info span{
color:var(--text-main);
text-decoration:none;
white-space:nowrap;
overflow:hidden;
text-overflow:ellipsis;
font-weight:400;
font-size:14px;
}
.file-info a:hover{text-decoration:underline;}
.meta-size{font-size:11px;color:var(--text-muted);margin-top:2px;}
.icon-dir,.icon-img,.icon-vid,.icon-code,.icon-zip,.icon-default{color:var(--text-main);}
.actions{display:flex;gap:6px;opacity:.85;}
.btn-icon{
background:transparent;
border:none;
padding:6px;
color:var(--text-muted);
border-radius:4px;
}
.btn-icon:hover{background:#222;color:#fff;}
.btn-icon.delete:hover{background:#222;color:#fff;}
.editor-container{padding:0;height:100%;display:flex;flex-direction:column;}
.editor-header{
padding:10px 15px;
background:#000;
border-bottom:1px solid var(--border);
display:flex;
justify-content:space-between;
align-items:center;
}
textarea.editor{
width:100%;
height:34svh;
flex-grow:1;
background:var(--bg-input);
color:var(--text-main);
padding:12px;
border:1px solid var(--border);
border-radius:0;
resize:none;
outline:none;
line-height:1.4;
font-size:13px;
font-family:'JetBrains Mono',monospace;
}
.console-wrapper{
padding:15px;
border-top:1px solid var(--border);
background:#000;
}
.console-header{
font-size:11px;
text-transform:uppercase;
letter-spacing:1px;
color:#666;
margin-bottom:8px;
font-weight:700;
}
#console-output{
height:120px;
overflow-y:auto;
font-family:'JetBrains Mono',monospace;
font-size:12px;
color:#fff;
white-space:pre-wrap;
margin-bottom:8px;
}
.fade-in{animation:fadeIn .2s ease-in;}
@keyframes fadeIn{from{opacity:0;transform:translateY(2px);}to{opacity:1;transform:translateY(0);}}
@media(max-width:600px){
.controls{grid-template-columns:1fr;}
.toolbar{width:100%;}
.toolbar input{flex-grow:1;}
.item{padding:12px 15px;}
.btn-icon{padding:8px;}
}

    </style>
</head>
<body>
    <div class="container">
        <div class="card">
            <div class="header">
                <div class="path-display">
                    <i class="ri-hard-drive-2-line"></i>
                    <form hx-get="/list" hx-target="#file-list" style="flex-grow:1; display:flex;">
                        <input name="dir" class="path-input" id="path-display" value="${currentPath}" spellcheck="false">
                    </form>
                </div>

                <div class="controls">
                    <input type="text" id="file-search" placeholder="Search files..." onkeyup="filterFiles()">
                    
                    <div class="toolbar">
                        <form hx-post="/mkdir" hx-target="#file-list" style="flex:1">
                            <input type="hidden" name="path" id="p-mkdir" value="${currentPath}">
                            <input name="name" placeholder="New Folder" required>
                            <button type="submit"><i class="ri-add-line"></i></button>
                        </form>
                        <form hx-encoding="multipart/form-data" hx-post="/upload" hx-target="#file-list">
                            <input type="hidden" name="path" id="p-upload" value="${currentPath}">
                            <label class="btn" style="cursor:pointer; border-radius: 6px; height: 35px;">
                                <i class="ri-upload-cloud-line"></i>
                                <input type="file" name="file" onchange="this.form.requestSubmit()" style="display:none;">
                            </label>
                        </form>
                    </div>
                </div>
            </div>

            <div id="file-list">${content}</div>
            
            <div class="console-wrapper">
                <div class="console-header">System Terminal</div>
                <div id="console-output">Ready...</div>
                <form hx-post="/shell" hx-target="#console-output" hx-swap="beforeend" style="display:flex; align-items:center;">
                    <input type="hidden" name="path" id="p-shell" value="${currentPath}">
                    <span style="color:#4ade80; font-family:'JetBrains Mono'; margin-right:8px;">$</span>
                    <input name="cmd" style="flex-grow:1; border:none; background:transparent; color:#fff; font-family:'JetBrains Mono'; padding:0;" autocomplete="off">
                </form>
            </div>
        </div>
    </div>
    <script>
        function filterFiles() {
            const query = document.getElementById('file-search').value.toLowerCase();
            document.querySelectorAll('.file-row').forEach(row => {
                const name = row.querySelector('.file-info a').innerText.toLowerCase();
                row.style.display = name.includes(query) ? 'flex' : 'none';
            });
        }

        document.body.addEventListener('htmx:afterSwap', (e) => {
            const p = e.detail.xhr.getResponseHeader('X-Path');
            if(p) {
                document.getElementById('path-display').value = p;
                document.querySelectorAll('[id^="p-"]').forEach(el => el.value = p);
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
app.get('/list', (req, res) => update(res, path.resolve(req.query.dir)));
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return update(res, req.body.path);
    const dest = path.join(req.body.path, req.file.originalname);
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    fs.renameSync(req.file.path, dest);
    update(res, req.body.path);
});
app.post('/mkdir', (req, res) => {
    try {
        fs.mkdirSync(path.join(req.body.path, req.body.name), {
            recursive: true
        });
    } catch {}
    update(res, req.body.path);
});
app.get('/download', (req, res) => res.download(req.query.file));
app.get('/zip', (req, res) => {
    const dirPath = req.query.dir;
    const archive = archiver('zip', {
        zlib: {
            level: 9
        }
    });
    res.attachment(`${path.basename(dirPath)}.zip`);
    archive.pipe(res);
    archive.directory(dirPath, false);
    archive.finalize();
});
app.listen(PORT, HOST, () => console.log(`Explorer: http://${HOST}:${PORT}`));