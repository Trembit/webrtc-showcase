Bootstrap Meetings
==================

This is Play Framework application with Scala | Akka | WebSockets.
Nowadays all web conferences web software is built with Adobe Flash or desktop app (Adobe Connect, Gotomeeting). This is attempt to check js abilities to achieve the same.
Past RTMP calls + Flash Media Server Video Streaming replaced with WebSockets + WebRTC p2p video.

### Features
 - Users presence
 - Chat
 - Multi-user Video Chat with WebRTC 
 - Kurento to handle user crowd

### Setup
 
 - Have docker compose installed 
 
 - Have `sbt` tool installed
 
 - Have Oracle Java 8 isntalled
 
 - run `docker-compose run kurento`
 
 - run `sbt run` 
 
 - navigate to http://localhost:9000


### Possible future steps
 - HTTPS
 - Add akka persistence to keep room state after room actor restart;
 - Add user list;
 - Add more meetings features: image sharing, screen sharing, collaborative drawing;
 - Add monitoring page.
