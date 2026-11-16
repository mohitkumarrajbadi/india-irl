# Minimal Node image for the OMMO WebSocket relay (build context: server/).
FROM node:22-alpine
WORKDIR /app

RUN npm install --omit=dev ws@8.22.2

COPY relay.mjs meet-centers.mjs ./

ENV PORT=8787
EXPOSE 8787
CMD ["node", "relay.mjs"]
