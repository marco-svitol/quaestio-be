FROM node:alpine

ARG BUILD_NUMBER

ENV BUILD_NUMBER=$BUILD_NUMBER

WORKDIR /nodejs

COPY ["package.json", "package-lock.json*", "./"]

RUN npm i -g npm@9.1.1 && npm i && find node_modules ! -user root | xargs chown root:root

EXPOSE 80

COPY . .

CMD ["npm", "start"]
