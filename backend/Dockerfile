FROM node:20-alpine
# Dodaj tę linię, aby doinstalować wymaganą przez Prismę bibliotekę libssl.so.1.1
# RUN apk add --no-cache compat-openssl11
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build --if-present
EXPOSE 3000
CMD ["npm", "run", "start"]
