#!/bin/bash
# ============================================================
# FocusTree 自动部署看门狗（watchdog 模式）
# 用途：Vercel Hobby 配额（100 部署/24h）恢复后自动部署最新代码
# 行为约定（配合 Hermes cron no_agent=True 使用）：
#   - 线上已是最新版本      → 空输出，exit 0（静默）
#   - 配额未恢复/部署失败   → 空输出，exit 0（静默，等下次 tick 重试）
#   - 部署成功并验证通过    → 输出成功消息（通知用户）
# 永不输出错误流，避免每小时打扰。
# ============================================================
set -uo pipefail

# Node 便携版 PATH（cron 环境可能没有完整 PATH）
export PATH="/c/Users/朱梓纲/tools/node-v22.11.0-win-x64:/c/Users/朱梓纲/tools/node-v22.11.0-win-x64/npm:$PATH"

PROJ="/c/Users/朱梓纲/Projects/Engineering/Projects/FocusTree"
SITE="https://focus-tree-kohl.vercel.app/"
PROXY="http://127.0.0.1:7897"

cd "$PROJ" || exit 0

# ---------- 1. 本地构建（保证 dist 最新） ----------
if ! npm run build >/dev/null 2>&1; then
  exit 0
fi
LOCAL_JS=$(ls dist/assets/index-*.js 2>/dev/null | head -1 | xargs -n1 basename 2>/dev/null)
if [ -z "$LOCAL_JS" ]; then
  exit 0
fi

# ---------- 2. 线上是否已是最新（哈希比对） ----------
ONLINE_JS=$(curl -s --max-time 20 -x "$PROXY" "$SITE" 2>/dev/null | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1 | sed 's|assets/||')
if [ "$ONLINE_JS" = "$LOCAL_JS" ]; then
  exit 0  # 已是最新，静默
fi

# ---------- 3. 尝试部署（配额恢复前 vercel 会快速拒绝） ----------
OUT=$(timeout 300 npx vercel deploy --prod --yes 2>&1)
if echo "$OUT" | grep -qi "Resource is limited"; then
  exit 0  # 配额未恢复，静默等下次
fi

# 部署成功（拿到部署 URL）→ 等构建完成再验证线上
if echo "$OUT" | grep -qE "https://[a-z0-9-]+\.vercel\.app"; then
  sleep 45
  ONLINE2=$(curl -s --max-time 20 -x "$PROXY" "$SITE" 2>/dev/null | grep -oE 'assets/index-[A-Za-z0-9_-]+\.js' | head -1 | sed 's|assets/||')
  if [ "$ONLINE2" = "$LOCAL_JS" ]; then
    echo "🌳 FocusTree 已自动部署成功！线上已是 V9 新版（$(date '+%Y-%m-%d %H:%M')）"
  else
    echo "⚠️ FocusTree 部署已提交但线上哈希暂未更新（${ONLINE2:-未知}），下轮将复查"
  fi
fi
# 其他错误：静默重试，不打扰
exit 0
