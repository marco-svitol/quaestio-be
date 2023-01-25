FROM node:alpine

ENV SERVERPORT=80

WORKDIR /nodejs
COPY ["package.json", "package-lock.json*", "./"]

RUN npm i -g npm@9.1.1 && npm i && find node_modules ! -user root | xargs chown root:root

ENV NODE_ENV = "production" 

EXPOSE 80

COPY . .

RUN --mount=type=secret,id=opsbaseurl \
    --mount=type=secret,id=opsclientid \
    --mount=type=secret,id=opsclientsecret \
    OPSBASEURL=$(cat /run/secrets/opsbaseurl) && export OPSBASEURL && \
    OPSCLIENTID=$(cat /run/secrets/opsclientid) && export OPSCLIENTID && \
    OPSCLIENTSECRET=$(cat /run/secrets/opsclientsecret) && export OPSCLIENTSECRET

RUN echo "This is me $OPSBASEURL $OPSCLIENTID $OPSCLIENTSECRET"
RUN echo $OPSBASEURL
RUN ls /run/secrets
RUN cat  /run/secrets/opsbaseurl
RUN cat  /run/secrets/opsclientid
RUN cat  /run/secrets/opsbaseurl


CMD ["npm", "start"]
