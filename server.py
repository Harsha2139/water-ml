"""Groundwater app server (Python standard library only, no pip install needed).
Run:  py server.py        ->  http://localhost:8000
Serves the website and stores each visitor's dataset, thresholds and prediction history on the server."""
import json, os, re, tempfile, threading
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

ROOT = os.path.dirname(os.path.abspath(__file__))
STORE = os.environ.get("DATA_DIR", os.path.join(ROOT, "storage"))
PORT = int(os.environ.get("PORT", "8000"))
MAX_BYTES = int(os.environ.get("MAX_MB", "40")) * 1024 * 1024
KEYS = ("dataset", "th", "hist")
SID = re.compile(r"^[a-f0-9]{32}$")
LOCK = threading.Lock()
TYPES = {".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "application/javascript", ".txt": "text/plain"}
os.makedirs(STORE, exist_ok=True)

def valid(key, v):
    if key == "dataset":
        return isinstance(v, dict) and isinstance(v.get("districts"), list) and isinstance(v.get("data"), list) and len(v["data"]) <= 500000
    if key == "th":
        return isinstance(v, dict) and all(isinstance(v.get(k), (int, float)) for k in ("w", "c"))
    return isinstance(v, list) and len(v) <= 2000

class Handler(BaseHTTPRequestHandler):
    server_version = "GroundwaterServer/1.0"

    def send(self, code, body=b"", ctype="application/json"):
        if isinstance(body, (dict, list)): body = json.dumps(body).encode()
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(body)

    def sid(self):
        s = self.headers.get("X-Session", "")
        return s if SID.match(s) else None

    def path_for(self, sid): return os.path.join(STORE, sid + ".json")

    def read_state(self, sid):
        try:
            with open(self.path_for(sid), encoding="utf-8") as f: return json.load(f)
        except (OSError, ValueError): return {}

    def write_state(self, sid, state):
        fd, tmp = tempfile.mkstemp(dir=STORE)
        with os.fdopen(fd, "w", encoding="utf-8") as f: json.dump(state, f)
        os.replace(tmp, self.path_for(sid))

    def key(self):
        k = self.path[len("/api/"):]
        return k if k in KEYS else None

    def do_GET(self):
        p = self.path.split("?")[0]
        if p == "/api/ping": return self.send(200, {"ok": True})
        if p == "/api/state":
            sid = self.sid()
            if not sid: return self.send(400, {"error": "bad session"})
            with LOCK: return self.send(200, self.read_state(sid))
        name = "index.html" if p == "/" else p.lstrip("/")
        if not (name == "index.html" or name.startswith(("css/", "js/"))): return self.send(404, b"Not found", "text/plain")
        full = os.path.realpath(os.path.join(ROOT, name))
        okdirs = (os.path.join(ROOT, "css") + os.sep, os.path.join(ROOT, "js") + os.sep)
        if not (full == os.path.join(ROOT, "index.html") or full.startswith(okdirs)) or not os.path.isfile(full): return self.send(404, b"Not found", "text/plain")
        with open(full, "rb") as f: self.send(200, f.read(), TYPES.get(os.path.splitext(full)[1], "application/octet-stream"))

    def do_PUT(self):
        sid, key = self.sid(), self.key()
        if not sid or not key: return self.send(400, {"error": "bad request"})
        n = int(self.headers.get("Content-Length") or 0)
        if n <= 0 or n > MAX_BYTES: return self.send(413, {"error": "too large"})
        try: val = json.loads(self.rfile.read(n))
        except ValueError: return self.send(400, {"error": "bad json"})
        if not valid(key, val): return self.send(422, {"error": "invalid data"})
        with LOCK:
            st = self.read_state(sid); st[key] = val; self.write_state(sid, st)
        self.send(200, {"ok": True})

    def do_DELETE(self):
        sid, key = self.sid(), self.key()
        if not sid or not key: return self.send(400, {"error": "bad request"})
        with LOCK:
            st = self.read_state(sid); st.pop(key, None); self.write_state(sid, st)
        self.send(200, {"ok": True})

    def log_message(self, fmt, *a): pass

if __name__ == "__main__":
    print(f"Groundwater app running at http://localhost:{PORT}  (data folder: {STORE})  Ctrl+C to stop")
    ThreadingHTTPServer(("0.0.0.0", PORT), Handler).serve_forever()
