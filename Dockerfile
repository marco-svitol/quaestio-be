FROM node:alpine

ENV SERVERPORT=80
ENV NODE_ENV=production
ARG opsbaseurl
ARG opsclientid
ARG opsclientsecret
ARG sqlconfig_dbuser
ARG sqlconfig_dbpw
ARG sqlconfig_dbserver
ARG sqlconfig_dbname
ARG token_secret
ARG refresh_token_secret

ENV OPSBASEURL=${opsbaseurl}
ENV OPSCLIENTID=${opsclientid}
ENV OPSCLIENTSECRET=${opsclientsecret}
ENV SQLCONFIG_DBUSER=${sqlconfig_dbuser}
ENV SQLCONFIG_DBPW=${sqlconfig_dbpw}
ENV SQLCONFIG_DBSERVER=${sqlconfig_dbserver}
ENV SQLCONFIG_DBNAME=${sqlconfig_dbname}
ENV TOKEN_SECRET=${token_secret}
ENV REFRESH_TOKEN_SECRET=${refresh_token_secret}


WORKDIR /nodejs

COPY ["package.json", "package-lock.json*", "./"]

RUN npm i -g npm@9.1.1 && npm i && find node_modules ! -user root | xargs chown root:root

EXPOSE 80

COPY . .

CMD ["npm", "start"]
