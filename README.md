WebRTC Showcase
==================

This is Play Framework application with Scala | Akka | WebSockets.
It connects users with Kurento Media Server to implement video chat feature.

### Features
 
 - presenters may publish own web cam and microphone to large auditory (100 users)
 
 - low latency;
 
 - there could be severals rooms at the same time;
 
 - a quick jump into one of the multiple rooms;
 
 - easy to run locally or deploy to a server; 

 - simple chat and list of connected users.


### Setup
 
 - Oracle Java 8 must be installed
 
 - Install [Docker](https://www.docker.com/community-edition#/download) compose installed
 
 - Install [SBT](http://www.scala-sbt.org/release/docs/Setup.html) tool installed
 
 - Run 
 ```
 docker-compose build kurento
 docker run -p 8888:8888 -d kurento
 sbt run
 ```
 
 - Open http://localhost:9000 page in 2 browsers and start broadcast in one of them

On remote server requires HTTPS to be used. It could be done with nginx proxy and HTTPS certificate generated with Let’s Encrypt.
https://github.com/JrCs/docker-letsencrypt-nginx-proxy-companion
