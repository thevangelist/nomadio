FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/
COPY apps/frontend/package.json apps/frontend/
RUN npm install --workspace=@nomadio/frontend --include-workspace-root --ignore-scripts
COPY packages/shared packages/shared
COPY apps/frontend apps/frontend
RUN npm run build --workspace=@nomadio/shared && npm run build --workspace=@nomadio/frontend

# Static bundle + a reverse proxy to the backend, so the whole thing is one origin:
# no CORS, no build-time API URL, and config.json can stay empty.
FROM nginx:alpine
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf.template /etc/nginx/templates/default.conf.template
COPY apps/frontend/resolver.envsh /docker-entrypoint.d/19-nomadio-resolver.envsh
# nginx's entrypoint skips .envsh files that are not executable, silently.
RUN chmod +x /docker-entrypoint.d/19-nomadio-resolver.envsh
ENV NOMADIO_API_UPSTREAM=http://backend:4000
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=3s CMD wget -qO- http://127.0.0.1/config.json >/dev/null || exit 1
