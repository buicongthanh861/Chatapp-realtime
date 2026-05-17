#!/bin/sh
# Inject biến môi trường BACKEND_URL vào index.html lúc container khởi động
# Mặc định: http://localhost:3001

BACKEND_URL=${BACKEND_URL:-http://localhost:3001}

echo "🔧 Injecting BACKEND_URL=$BACKEND_URL"

# Thay placeholder trong index.html bằng giá trị thực
sed -i "s|window.__ENV__BACKEND_URL__|'${BACKEND_URL}'|g" /usr/share/nginx/html/index.html

echo "✅ Done! Starting Nginx..."
exec nginx -g 'daemon off;'
