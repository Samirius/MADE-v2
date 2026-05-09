FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src/ src/
COPY static/ static/

EXPOSE 3100

ENV MADE_HOST=0.0.0.0
ENV MADE_DATA_DIR=/app/.made-data

CMD ["node", "src/server.mjs"]
