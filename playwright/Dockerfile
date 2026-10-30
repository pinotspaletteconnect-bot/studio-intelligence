FROM mcr.microsoft.com/playwright:v1.61.1-jammy

WORKDIR /app

COPY package*.json ./

RUN apt-get update \
    && apt-get install -y --no-install-recommends xvfb xauth tini \
    && rm -rf /var/lib/apt/lists/*

RUN npm ci

COPY . .

ENV PORT=8080
ENV HOMEBASE_HEADLESS=false

EXPOSE 8080

ENTRYPOINT ["/usr/bin/tini", "-g", "--"]
CMD ["npm", "start"]
