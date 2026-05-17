# ── Build Stage ──────────────────────────────────────────────
# Frontend là HTML thuần nên không cần build step
# Dùng thẳng Nginx để serve

FROM nginx:alpine

# Xoá config mặc định của Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy toàn bộ frontend vào thư mục serve của Nginx
COPY index.html /usr/share/nginx/html/index.html

# Copy entrypoint script để inject biến môi trường lúc runtime
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Biến môi trường mặc định (override khi chạy docker run)
ENV BACKEND_URL=http://localhost:3001

EXPOSE 80

# Dùng entrypoint để inject BACKEND_URL trước khi start nginx
ENTRYPOINT ["/entrypoint.sh"]
