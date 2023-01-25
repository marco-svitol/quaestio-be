FROM node:alpine

ENV SERVERPORT=80

WORKDIR /nodejs
COPY ["package.json", "package-lock.json*", "./"]

RUN npm i -g npm@9.1.1 && npm i && find node_modules ! -user root | xargs chown root:root

RUN --mount=type=secret,id=OPSBASEURL \
    --mount=type=secret,id=OPSCLIENTID \
    --mount=type=secret,id=OPSCLIENTSECRET \
    cat /run/secrets/OPSBASEURL && \
    OPSCLIENTID=$(cat /run/secrets/OPSCLIENTID) && export OPSCLIENTID && \
    OPSCLIENTSECRET=$(cat /run/secrets/OPSCLIENTSECRET) && export OPSCLIENTSECRET

# ENV OPSBASEURL=https://ops.epo.org/3.2
# ENV OPSCLIENTID=OPSCLIENTID
# ENV OPSCLIENTSECRET=OPSCLIENTSECRET

ENV NODE_ENV = "production" 

EXPOSE 80

COPY . .

CMD ["npm", "start"]
