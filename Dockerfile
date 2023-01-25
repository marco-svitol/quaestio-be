FROM node:alpine

ENV SERVERPORT=80

WORKDIR /nodejs
COPY ["package.json", "package-lock.json*", "./"]

RUN npm i -g npm@9.1.1 && npm i && find node_modules ! -user root | xargs chown root:root

ENV NODE_ENV = "production" 

EXPOSE 80

COPY . .

RUN --mount=type=secret,id=opsbaseurl && ls /run/secrets


CMD ["npm", "start"]
