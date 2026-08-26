# Frontend web de Finanzas: Expo (React Native Web) servido por nginx.
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

ENV CI=1
# Sin EXPO_PUBLIC_API_URL: la API comparte origen vía proxy nginx (/api).
RUN npx expo export --platform web --output-dir dist
RUN npx expo install react-native-webview
# ---------------------------------------------------------------- runtime --
FROM nginx:1.27-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
