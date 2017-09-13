FROM node:alpine
RUN mkdir /var/www/node
ADD . /var/www/node
RUN cd /var/www/node
RUN npm install
EXPOSE 5000
CMD npm start
