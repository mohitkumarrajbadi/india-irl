# OMMO WebSocket relay.
# Build context = repo root (Fly default when you run deploy from root).
FROM node:22-alpine
WORKDIR /app

COPY server/package.json ./
RUN npm install --omit=dev

COPY server/relay.mjs server/meet-centers.mjs ./

ENV NODE_ENV=production
ENV PORT=8787
EXPOSE 8787

CMD ["node", "relay.mjs"]
