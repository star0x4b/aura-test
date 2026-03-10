# Build stage
FROM node:22-alpine AS build
WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/customer-management/package.json apps/customer-management/

RUN npm install --workspace=packages/shared --workspace=apps/customer-management

COPY packages/shared/ packages/shared/
COPY apps/customer-management/ apps/customer-management/

RUN npm run build -w packages/shared && npm run build -w apps/customer-management

# Production stage
FROM node:22-alpine
WORKDIR /app

COPY package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/customer-management/package.json apps/customer-management/

RUN npm install --workspace=packages/shared --workspace=apps/customer-management --omit=dev

COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY --from=build /app/apps/customer-management/dist apps/customer-management/dist

EXPOSE 3001
CMD ["node", "apps/customer-management/dist/index.js"]
