# /home/lenovo/code/ltphongssvn/task-management-final/Dockerfile
FROM node:18-alpine
WORKDIR /app
# Copy package files
COPY package*.json ./
# Install dependencies
RUN npm ci --only=production
# Copy application files including .env and pre-built CSS
COPY . .
# Expose port
EXPOSE 3000
# Start application
CMD ["node", "app.js"]
