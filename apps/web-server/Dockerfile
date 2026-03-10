# Build stage
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web-server/package.json apps/web-server/

RUN npm install --workspace=packages/shared --workspace=apps/web-server

COPY packages/shared/ packages/shared/
COPY apps/web-server/ apps/web-server/

RUN npm run build -w packages/shared && npm run build -w apps/web-server

# Production stage
FROM node:22-alpine
WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/web-server/package.json apps/web-server/

RUN npm install --workspace=packages/shared --workspace=apps/web-server --omit=dev

COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/web-server/dist apps/web-server/dist

EXPOSE 3000
CMD ["node", "apps/web-server/dist/index.js"]
