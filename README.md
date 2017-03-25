Bootstrap Meetings
==================

This is Play Framework application with Scala | Akka | WebSockets.
It connects users with kurento media server to implement video chat experience.

### Features
 - Users presence
 - Chat
 - Multi-user Video Chat with WebRTC 
 - Kurento to handle users crowd

### Setup
 
 - Have docker compose installed 
 
 - Have `sbt` tool installed
 
 - Have Oracle Java 8 isntalled
 
 - run `docker-compose run kurento`
 
 - run `sbt run` 
 
 - navigate to http://localhost:9000


### Possible future steps
 - Add HTTPS
 - Add akka persistence to keep room state after room actor restart;
 - Add user list;
 - Add more meetings features: image sharing, screen sharing, collaborative drawing;
 - Add monitoring page.
 - Allow easy deployment to a cloud
