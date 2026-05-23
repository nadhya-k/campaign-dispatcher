# ----- Layer - Infrastructure (Container Build) -----

# This file defines a single-stage production image for the campaign-dispatcher service. 
# The same image is used for both the 'api' and 'worker' containers in docker-compose.yaml - the difference is the 'command:'' override in that file (node dist/index.js vs node dist/worker.js).

# Build steps:
# 1. Base image - node:20-alpine: matches the Node 20+ prerequisite from the README. Alpine keeps the image small (~50MB base vs ~300MB for the full Debian image).
# 2. WORKDIR -  /app: all subsequent paths are relative to this.
# 3. Copy manifests first - package*.json only, before the full source. Docker layer-caches the npm ci step: if neither package.json nor package-lock.json has changed, the install layer is reused on rebuild, making builds faster.
# 4. npm ci --omit=dev - this installs only production dependencies (no devDependencies such as ts-node-dev, jest, or @types/*). Using 'ci' (not 'install') ensures the exact locked versions from package-lock.json are installed.
# 5. COPY . . - copies the full project source, including src/ and tsconfig.json, needed for the build step.
# 6. npm run build - compiles TypeScript (tsc) from src/ to dist/. The compiled JS is what the container actually runs.
# 7. EXPOSE 3001 - documents the port the API server listens on. Does not publish the port; that is done by the 'ports:' mapping in docker-compose.yaml or at 'docker run -p'.
# 8. CMD - default command starts the API server. The worker container overrides this via 'command:'' in docker-compose.yaml.

FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .
RUN npm run build

EXPOSE 3001
CMD ["node", "dist/index.js"]