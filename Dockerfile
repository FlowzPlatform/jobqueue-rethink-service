FROM node:latest

RUN mkdir -p /usr/src/app

WORKDIR /usr/src/app

COPY . /usr/src/app

WORKDIR /usr/src/app/
RUN npm install

EXPOSE 4004 4005 4006

CMD NODE_ENV=production node job-web.js
