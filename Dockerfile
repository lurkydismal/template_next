FROM node:current-alpine@sha256:bdf2cca6fe3dabd014ea60163eca3f0f7015fbd5c7ee1b0e9ccb4ced6eb02ef4

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
