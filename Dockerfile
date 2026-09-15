FROM node:20-alpine

WORKDIR /app

# Install backend dependencies
COPY package*.json ./
RUN npm ci --omit=dev --ignore-scripts

# Copy all backend source
COPY . .

# Install client dependencies and build
RUN cd client && npm ci && npx vite build

EXPOSE 3000

ENV NODE_ENV=production
CMD ["sh", "-c", "npm run migrate && node server.js"]
