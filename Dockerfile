# --- Build Angular ---
    FROM node:20 AS build
    WORKDIR /app
    COPY package*.json ./
    RUN npm ci
    COPY . .
    # adapte "production" si tu as un autre config Angular
    RUN npm run build -- --configuration production
    
    # --- Serve avec Nginx ---
    FROM nginx:1.27-alpine
    # Angular 16/17+ : dist/<nom-projet>/browser
    COPY --from=build /app/dist/*/browser /usr/share/nginx/html
    COPY nginx.conf /etc/nginx/conf.d/default.conf
    EXPOSE 80
    CMD ["nginx","-g","daemon off;"]
    