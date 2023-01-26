FROM node:alpine

ENV SERVERPORT=80
ENV NODE_ENV=production
ARG opsbaseurl
ARG opsclientid
ARG opsclientsecret
ENV OPSBASEURL  ${opsbaseurl}
ENV OPSCLIENTID ${opsclientid}
ENV OPSCLIENTSECRET ${opsclientsecret}

WORKDIR /nodejs

COPY ["package.json", "package-lock.json*", "./"]

RUN npm i -g npm@9.1.1 && npm i && find node_modules ! -user root | xargs chown root:root

EXPOSE 80

COPY . .

CMD ["npm", "start"]
