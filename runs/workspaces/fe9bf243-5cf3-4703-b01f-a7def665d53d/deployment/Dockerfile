# Use an official Node.js runtime as a parent image
FROM node:14-alpine AS builder

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Bundle app source inside Docker image
COPY . .

# Build the React Native application
RUN npx react-native bundle --platform android --dev false --entry-file index.js --bundle-output android/app/src/main/assets/index.android.bundle --assets-dest android/app/src/main/res/

# Use a lightweight base image for production
FROM node:14-alpine

# Set the working directory in the container
WORKDIR /app

# Copy dependencies from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy built React Native application
COPY --from=builder /app/android/app/src/main/assets/index.android.bundle ./android/app/src/main/assets/index.android.bundle
COPY --from=builder /app/android/app/src/main/res ./android/app/src/main/res

# Expose the port the app runs on
EXPOSE 8081

# Command to run the React Native application
CMD ["npx", "react-native", "start"]