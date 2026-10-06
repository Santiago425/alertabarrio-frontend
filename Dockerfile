# 1) Compilar la app React + TypeScript
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL=http://localhost:8000
ARG VITE_TEAM_MEMBERS="Integrante 1,Integrante 2"
ENV VITE_API_URL=$VITE_API_URL VITE_TEAM_MEMBERS=$VITE_TEAM_MEMBERS
RUN npm run build

# 2) Servir los archivos estaticos con nginx
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
