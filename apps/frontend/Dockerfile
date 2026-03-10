# Build stage
FROM node:22-alpine AS build
WORKDIR /app

COPY apps/frontend/package.json apps/frontend/
RUN cd apps/frontend && npm install

COPY apps/frontend/ apps/frontend/
RUN cd apps/frontend && npm run build

# Production stage - serve with nginx
FROM nginx:alpine
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
