# syntax=docker/dockerfile:1

# ---- Build ----
FROM node:22-alpine AS build
WORKDIR /app

# Cachea "npm ci" mientras no cambien package.json/package-lock.json.
COPY package.json package-lock.json ./
RUN npm ci

COPY . .

# VITE_API_URL se "hornea" adentro del build (Vite reemplaza import.meta.env.VITE_API_URL
# por texto plano en el JS final, no es configurable en runtime). Acá apunta a /api en vez
# de a una URL absoluta como en desarrollo (.env): nginx.conf hace de proxy hacia el backend
# bajo el mismo origen, así el navegador nunca pega contra otro host/puerto y no hace
# falta CORS. Si alguna vez hace falta cambiarlo sin rebuildear, pasar --build-arg
# VITE_API_URL=... al build.
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ---- Runtime ----
FROM nginx:1.27-alpine AS runtime
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
