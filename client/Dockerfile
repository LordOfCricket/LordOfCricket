# Stage 1: Build the React application
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

COPY . .

RUN npm run build

# Stage 2: Serve the production files with Nginx
# Phase 8 — pinned to a real version (was floating `alpine`, the only
# unpinned base image found in this repo's Dockerfiles), matching the
# node:20-alpine pin style above (major.minor, not a full digest pin).
FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Phase 8 — container-level healthcheck (server/Dockerfile already has one;
# this was the one gap). wget is part of alpine's busybox, no extra package
# needed.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://localhost:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
