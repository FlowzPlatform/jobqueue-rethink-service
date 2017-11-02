FROM node:latest
#RUN mkdir /usr/src/app
ADD . /usr/src/app/
WORKDIR /usr/src/app/
RUN cd /usr/src/app/
RUN npm install
EXPOSE 5000
CMD node job-web.js
