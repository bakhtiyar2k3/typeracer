# Build context is the REPOSITORY ROOT (the server imports ../../shared).
# Build: docker build -f server/Dockerfile -t typeracer-server .
FROM node:22-alpine
WORKDIR /app

# Production dependencies only (skips test-only devDeps), cached by layer.
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev

# App source + the shared module (relative import: server -> ../../shared).
COPY shared ./shared
COPY server ./server

WORKDIR /app/server
ENV NODE_ENV=production
EXPOSE 4000

# Healthcheck hits the API's /api/health endpoint (global fetch on Node 22).
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://localhost:4000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "index.js"]
