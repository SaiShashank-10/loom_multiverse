# Use an official Node.js runtime as a parent image
FROM node:14

# Set the working directory in the container to /usr/src/app
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install any needed packages specified in package.json
RUN npm install

# Bundle app source inside Docker image
COPY src ./src

# Expose port 3000
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]