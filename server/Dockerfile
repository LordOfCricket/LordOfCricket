# Production image for the LOC backend. Not required to deploy (Railway,
# Render, and Fly.io all also support "detect Node, run npm start" without a
# Dockerfile) — this exists for platforms/environments that specifically
# want a container, and to pin the exact runtime version.
FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production
EXPOSE 5000

# Liveness the container runtime itself can use (docker/k8s), independent of
# the app's own /api/health and /api/health/ready endpoints.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||5000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
