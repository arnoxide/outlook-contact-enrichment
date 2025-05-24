# Use a Node.js base image
FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install

# Copy the static files
COPY src/ ./src/

# Expose the port that http-server will use
EXPOSE 3001

# Start the server
CMD ["npm", "start"]