# Build context is the REPOSITORY ROOT (the client imports ../shared via @shared).
# Build: docker build -f client/Dockerfile -t typeracer-client .

# --- build stage ---------------------------------------------------------------
# Debian-based (glibc) build image: avoids an esbuild ETXTBSY race seen on
# alpine/musl during Docker builds. Discarded in the final stage, so no size cost.
FROM node:22-slim AS build
WORKDIR /app

# Install deps first for layer caching.
COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm ci

# Source + the shared module the build imports.
COPY shared ./shared
COPY client ./client
RUN cd client && npm run build

# --- runtime stage (static nginx) ---------------------------------------------
FROM nginx:alpine
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1
CMD ["nginx", "-g", "daemon off;"]
