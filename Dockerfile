# FROM alpine

# RUN apk add --update nodejs npm

# WORKDIR /
# COPY package*.json ./
# RUN npm ci
# EXPOSE 80
# COPY . .
# CMD ["npm", "start"]


# syntax=docker/dockerfile:1

FROM node:12.22.8
ENV K8SBOOSTER_SERVERPORT=80

WORKDIR /nodejs
COPY ["package.json", "package-lock.json*", "./"]

RUN npm install

EXPOSE 80

COPY . .

CMD ["npm", "start"]