# Production image for the LOC backend. Not required to deploy (Railway,
# Render, and Fly.io all also support "detect Node, run npm start" without a
# Dockerfile) — this exists for platforms/environments that specifically
# want a container, and to pin the exact runtime version.
FROM node:20-alpine AS base
WORKDIR /app

COPY package.json package-lock.json ./
# Full install (incl. devDependencies) is required here so the `prisma` CLI
# is present to run `generate` below — pruned back down afterward. The
# generated client lives under node_modules/@prisma/client, which `npm
# prune` keeps (it's a regular dependency), so pruning does not remove it.
RUN npm ci
COPY prisma ./prisma
RUN npx prisma generate
RUN npm prune --omit=dev

COPY src ./src

# Phase 7 — node:20-alpine ships a built-in non-root `node` user (uid 1000);
# nothing in this image needs root (port 5000 needs no privileged bind, and
# every file above was already world-readable at COPY time), so there is no
# reason to run the process as root.
RUN chown -R node:node /app
USER node

ENV NODE_ENV=production
EXPOSE 5000

# Liveness the container runtime itself can use (docker/k8s), independent of
# the app's own /api/health and /api/health/ready endpoints.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.PORT||5000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "src/server.js"]
