FROM node:18-alpine
WORKDIR /app
# Change ownership of /app to node user
RUN chown -R node:node /app
USER node
COPY --chown=node:node package*.json ./
RUN npm install
COPY --chown=node:node src/ ./src/
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/api/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"
CMD ["npm", "start"]