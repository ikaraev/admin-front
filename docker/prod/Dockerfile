# Admin panel SPA: vite build → unprivileged nginx on :8080.
# Built by CI from the repository root:
#   docker build -f docker/prod/Dockerfile -t admin-front .
# Deployed by ikaraev/gameprovider-deploy, see DEPLOY.md.
#
# The API is served on the same host under /api/v1 (see gameprovider-deploy: base/ingress.yaml), so a
# relative base URL works on any domain and the auth cookies stay first-party.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npx vite build

FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
RUN printf '%s\n' \
  'server {' \
  '    listen 8080;' \
  '    server_name _;' \
  '    root /usr/share/nginx/html;' \
  '    location = /index.html { add_header Cache-Control "no-store"; }' \
  '    location /assets/ { add_header Cache-Control "public, max-age=31536000, immutable"; try_files $uri =404; }' \
  '    location = /healthz { access_log off; return 200 "ok\n"; }' \
  '    location / { try_files $uri $uri/ /index.html; }' \
  '}' > /etc/nginx/conf.d/default.conf
EXPOSE 8080
