# Dockerfile for Vite/React Frontend with face-api.js ML models
FROM node:20-slim

WORKDIR /app

# Copy package requirements first for Docker layer caching
COPY package*.json ./

# Install dependencies (will also trigger postinstall if configured)
RUN npm install

# Copy application source code
COPY . .


# Expose Vite default port
EXPOSE 5173

# Start the dev server when the container boots up
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
