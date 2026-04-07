FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps

COPY . .

ARG VITE_API_URL=https://project.renoway.ae/api
ARG VITE_GOOGLE_MAPS_API_KEY=
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

RUN npm run build

# Final image просто хранит dist/ для копирования в nginx volume
FROM alpine:3.19
COPY --from=builder /app/dist /app/dist
CMD ["sh", "-c", "cp -r /app/dist/. /app/dist-out/ && echo 'Frontend build copied'"]
