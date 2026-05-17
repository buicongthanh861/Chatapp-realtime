FROM node:20-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

FROM node:20-slim as production
WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app .

EXPOSE 3001
CMD ["node", "server.js"]
