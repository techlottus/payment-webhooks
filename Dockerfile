# Initiate a container to build the application in.
FROM node:latest as builder
ENV NODE_ENV=build
WORKDIR /

# Copy the package.json into the container.
COPY package*.json ./

# Copy the tsconfig.json into the container.
COPY tsconfig.json ./

# Install the dependencies required to build the application.
RUN yarn && yarn global add @nestjs/cli

# Copy the application source into the container.
COPY . .

# Build the application.
RUN yarn build

# Initiate a new container to run the application in.
FROM node:latest
  ENV NODE_ENV=production
WORKDIR /

# Copy everything required to run the built application into the new container.
COPY --from=builder /package*.json ./
COPY --from=builder /node_modules/ ./node_modules/
COPY --from=builder /dist/ ./dist/

# Expose the web server's port.
EXPOSE 3000

# Run the application.
CMD ["yarn", "start"]