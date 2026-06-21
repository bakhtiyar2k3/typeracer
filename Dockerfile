# Single-service production image: builds the SPA and serves it from the Node
# server (same origin as the API + Socket.io). Ideal for free single-service
# hosts (Render / Fly / Koyeb / Railway).
#
# For local multi-container development use docker-compose.yml instead.
#   docker build -t typeracer .
#   docker run -p 4000:4000 -e JWT_SECRET=... -e MONGODB_URI=... typeracer

# --- build the client (Debian/glibc avoids esbuild ETXTBSY on musl) ----------
FROM node:22-slim AS client
WORKDIR /app
COPY client/package.json client/package-lock.json ./client/
RUN cd client && npm ci
COPY shared ./shared
COPY client ./client
RUN cd client && npm run build

# --- server runtime: API + sockets + the built SPA --------------------------
FROM node:22-alpine
WORKDIR /app
COPY server/package.json server/package-lock.json ./server/
RUN cd server && npm ci --omit=dev
COPY shared ./shared
COPY server ./server
# Serve the SPA from the server (env.clientDir defaults to server/public).
COPY --from=client /app/client/dist ./server/public

WORKDIR /app/server
ENV NODE_ENV=production
# Hosts (Render/Fly/...) inject PORT; the server honors it (defaults to 4000).
EXPOSE 4000
CMD ["node", "index.js"]
