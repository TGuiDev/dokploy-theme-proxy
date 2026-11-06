"""Mini API de métricas do servidor (somente leitura).

Lê /host/proc (montado do host) e devolve JSON em GET /stats.
Não é exposta direto: o nginx só repassa para quem está logado no Dokploy.
"""
import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PROC = os.environ.get("HOST_PROC", "/host/proc")
DISK_PATH = os.environ.get("DISK_PATH", "/hostfs")

_cpu_pct = 0.0


def _read_cpu():
    with open(f"{PROC}/stat") as f:
        parts = [int(x) for x in f.readline().split()[1:]]
    idle = parts[3] + parts[4]  # idle + iowait
    return idle, sum(parts)


def _sampler():
    global _cpu_pct
    prev_idle, prev_total = _read_cpu()
    while True:
        time.sleep(2)
        idle, total = _read_cpu()
        d_total = total - prev_total
        if d_total > 0:
            _cpu_pct = round(100 * (1 - (idle - prev_idle) / d_total), 1)
        prev_idle, prev_total = idle, total


def snapshot():
    mem = {}
    with open(f"{PROC}/meminfo") as f:
        for line in f:
            k, v = line.split(":")
            mem[k] = int(v.split()[0]) * 1024
    mem_total = mem["MemTotal"]
    mem_used = mem_total - mem["MemAvailable"]

    st = os.statvfs(DISK_PATH)
    disk_total = st.f_blocks * st.f_frsize
    disk_used = disk_total - st.f_bfree * st.f_frsize

    with open(f"{PROC}/loadavg") as f:
        load = [float(x) for x in f.read().split()[:3]]
    with open(f"{PROC}/uptime") as f:
        uptime = int(float(f.read().split()[0]))

    return {
        "cpu": {"percent": _cpu_pct, "cores": os.cpu_count(), "load": load},
        "memory": {"used": mem_used, "total": mem_total},
        "disk": {"used": disk_used, "total": disk_total},
        "uptime": uptime,
    }


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.split("?")[0] != "/stats":
            self.send_error(404)
            return
        body = json.dumps(snapshot()).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    threading.Thread(target=_sampler, daemon=True).start()
    ThreadingHTTPServer(("0.0.0.0", 8080), Handler).serve_forever()
