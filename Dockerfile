FROM node:15-alpine3.10
WORKDIR /app
COPY . .
RUN npm install
EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=10s --start-period=10s --retries=3 \
CMD curl --fail http://localhost:3000/ping || exit 1

ENTRYPOINT ["/usr/local/bin/npm", "start"]