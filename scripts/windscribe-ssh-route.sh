#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# کمک به SSH موقع روشن بودن Windscribe
#
# تشخیص فعلی:
#   - از داخل VPN پورت‌های 80/443/8092 به سرور باز است، ولی :22 بسته است
#     (فایروال/سیاست سرور برای SSH از IPهای خارج)
#   - مسیر مستقیم (split-tunnel) از این شبکه به IP سرور نمی‌رسد
#
# پس split-tunnel کمکی نمی‌کند. گزینه‌های عملی:
#   1) دیپلوی با GitHub Actions (workflow: deploy-selectbox)
#   2) یک‌بار از کنسول ۱Panel روی سرور SSH را برای IP فعلی باز کنید
#      یا sshd را روی پورت 8443 هم گوش بدهید
#   3) موقتاً Windscribe را قطع و SSH بزنید (اگر مسیر داخلی کار کند)
# -----------------------------------------------------------------------------
set -euo pipefail

HOST="${DEPLOY_HOST:-171.22.26.7}"
PORT="${DEPLOY_PORT:-22}"

echo "== Windscribe =="
windscribe-cli status 2>/dev/null | sed -n '/Internet connectivity/,/Data usage/p' || true
echo
echo "== route to ${HOST} =="
ip route get "$HOST" || true
echo
echo "== port probe =="
for p in 22 80 443 8092 "$PORT"; do
  if timeout 3 bash -c "echo >/dev/tcp/${HOST}/${p}" 2>/dev/null; then
    echo "open  ${HOST}:${p}"
  else
    echo "closed/timeout ${HOST}:${p}"
  fi
done
echo
if timeout 3 bash -c "echo >/dev/tcp/${HOST}/${PORT}" 2>/dev/null; then
  echo "SSH port reachable — try: ssh -p ${PORT} root@${HOST}"
  exit 0
fi

echo "SSH :${PORT} از این مسیر در دسترس نیست."
echo "برای آپدیت سرور:"
echo "  gh workflow run deploy-selectbox.yml"
echo "یا در ترمینال ۱Panel همان دستورهای git/docker compose را بزنید."
exit 2
