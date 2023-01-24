FROM node:alpine

ENV SERVERPORT=80

WORKDIR /nodejs
COPY ["package.json", "package-lock.json*", "./"]

RUN npm i -g npm@9.1.1 && npm i && find node_modules ! -user root | xargs chown root:root

RUN --mount=type=secret,id=OPSBASEURL \
    --mount=type=secret,id=OPSCLIENTID \
    --mount=type=secret,id=OPSCLIENTSECRET \
    export OPSBASEURL=$(cat /run/secrets/OPSBASEURL) && \
    export OPSCLIENTID=$(cat /run/secrets/OPSCLIENTID) && \
    export OPSCLIENTSECRET=$(cat /run/secrets/OPSCLIENTSECRET)

EXPOSE 80

COPY . .

CMD ["npm", "start"]