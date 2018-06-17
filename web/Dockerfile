FROM node:carbon

WORKDIR /usr/src/app

#https://github.com/angular/angular-cli/issues/7389
RUN npm install -g @angular/cli --unsafe
#RUN npm install socket.io rxjs

COPY package*.json ./

RUN npm install

COPY . .

#ARG ENV=stage

