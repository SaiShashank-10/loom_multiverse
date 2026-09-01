FROM node:14

WORKDIR /app

COPY package.json yarn.lock ./

RUN yarn install --frozen-lockfile

COPY tsconfig.json ./

COPY src ./src

EXPOSE 3000

CMD ["yarn", "start"]