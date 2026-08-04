# 上传更新文件到 GitHub（Contents API，走 api.github.com + 代理）
# 用途：git push 网络不稳定时的替代通道；仅上传指定文件，触发 Vercel 自动部署
import base64, json, subprocess, sys, os

TOKEN = sys.argv[1] if len(sys.argv) > 1 else os.environ.get("GH_TOKEN", "")
REPO = "ZZG080/focus-tree"
BRANCH = "main"
ROOT = r"C:\Users\朱梓纲\Projects\Engineering\Projects\FocusTree"
FILES = sys.argv[2:]

if not TOKEN:
    print("需要 token: python upload.py <token> <file1> <file2> ...")
    sys.exit(1)

ok, fail = 0, []
for f in FILES:
    path = os.path.join(ROOT, *f.split("/"))
    try:
        with open(path, "rb") as fh:
            content_b64 = base64.b64encode(fh.read()).decode()
    except Exception as e:
        fail.append((f, f"read error: {e}"))
        continue
    # 获取文件当前 sha（更新已存在文件必需）
    sha = None
    try:
        q = subprocess.run(
            ["curl", "-s", "-x", "http://127.0.0.1:7897",
             "-H", f"Authorization: Bearer {TOKEN}",
             f"https://api.github.com/repos/{REPO}/contents/{f}?ref={BRANCH}"],
            capture_output=True, text=True, timeout=60,
        )
        meta = json.loads(q.stdout) if q.stdout.strip() else {}
        sha = meta.get("sha")
    except Exception:
        sha = None
    payload = json.dumps({
        "message": f"update: {f}",
        "content": content_b64,
        "branch": BRANCH,
        **({"sha": sha} if sha else {}),
    })
    cmd = [
        "curl", "-s", "-x", "http://127.0.0.1:7897",
        "-X", "PUT",
        "-H", f"Authorization: Bearer {TOKEN}",
        "-H", "Content-Type: application/json",
        "--data-binary", "@-",
        f"https://api.github.com/repos/{REPO}/contents/{f}",
    ]
    try:
        p = subprocess.run(cmd, input=payload, capture_output=True, text=True, timeout=60)
        resp = json.loads(p.stdout) if p.stdout.strip() else {}
        if resp.get("commit"):
            ok += 1
            print(f"OK {f}", flush=True)
        else:
            fail.append((f, p.stdout[:200]))
            print(f"FAIL {f}: {p.stdout[:150]}", flush=True)
    except Exception as e:
        fail.append((f, str(e)))
        print(f"ERR {f}: {e}", flush=True)

print(f"\n完成：成功 {ok}，失败 {len(fail)}", flush=True)
for f, err in fail:
    print(f"  FAIL {f}: {err}", flush=True)
