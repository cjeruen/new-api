#!/usr/bin/env bash

# 退出脚本如果任何命令失败
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

is_placeholder_dist() {
  local file="$1"
  [ ! -f "$file" ] && return 0
  grep -qE 'placeholder|前端未构建|use frontend dev server' "$file"
}

create_placeholder_dist() {
  local theme="$1"
  mkdir -p "$SCRIPT_DIR/web/${theme}/dist"
  cat > "$SCRIPT_DIR/web/${theme}/dist/index.html" <<EOF
<!doctype html><html><head><title>dev</title></head><body>${theme} 前端未构建，请运行 cd web/${theme} && bun run dev</body></html>
EOF
}

build_default_frontend() {
  if ! command -v bun >/dev/null 2>&1; then
    echo "未检测到 bun，无法构建 default 前端。"
    return 1
  fi

  echo "构建 default 前端..."
  cd "$SCRIPT_DIR/web"
  bun install --frozen-lockfile
  cd default
  DISABLE_ESLINT_PLUGIN='true' VITE_REACT_APP_VERSION="$(cat ../../VERSION)" bun run build
  cd "$SCRIPT_DIR"
}

stop_port_if_busy() {
  local port="${1:-3000}"
  local pids
  pids="$(lsof -ti ":${port}" 2>/dev/null || true)"
  if [ -z "$pids" ]; then
    return 0
  fi

  echo "端口 ${port} 已被占用，正在结束相关进程..."
  # shellcheck disable=SC2086
  kill $pids 2>/dev/null || true
  sleep 1

  pids="$(lsof -ti ":${port}" 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    # shellcheck disable=SC2086
    kill -9 $pids 2>/dev/null || true
    sleep 1
  fi

  if lsof -ti ":${port}" >/dev/null 2>&1; then
    echo "无法释放端口 ${port}，请手动检查后重试。"
    exit 1
  fi
}

ensure_embed_assets() {
  echo "=== 1. 编译前端 embed 资源 ==="
  echo "提示: 设置 SKIP_FRONTEND_BUILD=1 可跳过前端构建以加快启动"

  local default_dist="web/default/dist/index.html"

  if [ "${SKIP_FRONTEND_BUILD:-}" = "1" ]; then
    echo "已跳过 default 前端构建 (SKIP_FRONTEND_BUILD=1)"
    if [ ! -f "$default_dist" ] || is_placeholder_dist "$default_dist"; then
      create_placeholder_dist default
    fi
  elif ! build_default_frontend; then
    echo "default 前端构建失败，创建占位 dist 以继续编译后端。"
    create_placeholder_dist default
  fi

  if is_placeholder_dist web/classic/dist/index.html; then
    create_placeholder_dist classic
  fi
}

ensure_embed_assets

echo "=== 2. 在本机编译 Go 后端 ==="
go build -o new-api main.go

echo "=== 3. 运行本地后端 (连接 Docker 数据库) ==="
# 先启动依赖: docker compose -f docker-compose.local.yml up -d mysql redis
# 设置环境变量，指向 docker-compose.local.yml 暴露在 localhost 的服务
export SQL_DSN="root:123456@tcp(127.0.0.1:13306)/new-api?parseTime=true"
export REDIS_CONN_STRING="redis://127.0.0.1:16379"
# 本地开发使用已构建的 default 前端（classic 构建常失败）
export FRONTEND_THEME=default
# 设置固定 secret，保证 local 登录不掉线
export SESSION_SECRET="local_dev_secret_stable_key_123456"
export PORT=3000
export TZ=Asia/Shanghai

stop_port_if_busy "$PORT"

echo "服务已在本机启动，可直接在浏览器访问: http://localhost:${PORT}"
exec ./new-api