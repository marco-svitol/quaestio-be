FROM node:alpine

ENV SERVERPORT=80

WORKDIR /nodejs
COPY ["package.json", "package-lock.json*", "./"]

RUN npm i -g npm@9.1.1 && npm i && find node_modules ! -user root | xargs chown root:root

ENV NODE_ENV=production 

EXPOSE 80

COPY . .

RUN --mount=type=secret,id=opsbaseurl --mount=type=secret,id=opsclientid --mount=type=secret,id=opsclientsecret \
    export OPSBASEURL=$(cat /run/secrets/opsbaseurl) && export OPSCLIENTID=$(cat /run/secrets/opsclientid) && export OPSCLIENTSECRET=$(cat /run/secrets/opsclientsecret) ; echo $OPSBASEURL ; ls /run/secrets

CMD ["npm", "start"]
