FROM node:current-alpine@sha256:e71ac5e964b9201072425d59d2e876359efa25dc96bb1768cb73295728d6e4ea

# small runtime deps
RUN apk add --no-cache ca-certificates

# Set the working directory in the container
WORKDIR /app

# Copy package.json
COPY package.json .

# Install dependencies
RUN npm i

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

CMD ["npm", "run",  "start"]
