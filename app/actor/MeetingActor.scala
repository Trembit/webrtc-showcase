package actor

import java.io.{PrintWriter, StringWriter}
import java.lang.reflect.Field

import actor.utils._
import akka.actor._
import akka.event.{Logging, LoggingReceive}
import kurento.{WebRtcProblem, MediaServer}
import play.api.libs.json._

import scala.collection.mutable
import scala.util.{Failure, Success}


class MeetingActor(override val roomName: String = "Default") extends BaseActor with ActorLogging with RoomActor {

  /**
   * Users pending verification. Wait for client to send "join" message.
   */
  val pendingUsers = mutable.HashMap[ActorRef, String]()

  /**
   * Users approved to be part of meeting.
   */
  val users = mutable.HashMap[ActorRef, UserInfo]()


  /**
   * Room state is key-value storage. Each chat message or broadcast activity is represented in this map.
   */
  val roomState = mutable.HashMap[String, JsValue]()

  val mediaServer = new MediaServer(this)

  def broadcastStatus() = {
    val allUsers = users.values.map(user => user.name).mkString(", ")
    for ((userAct, user) <- users) {
      userAct ! new StatusMessage("You are " + user.id + " " + user.name + ". In lobby.", s"Users: $allUsers");
    }
  }

  def changeUserName(user: UserInfo, name: String) = {
    user.name = name
    broadcastMessage(new ChangeBracketMessage(Prefix.USER, user.id, user.toJson))
  }

  def receive = LoggingReceive {

    case "print" => println(roomState)

    case (cm : ClientMessage, js: JsValue) =>
      try {
        users.get(sender) match {
          case Some(senderUser) =>
            cm match {
              case Ping(s) => // ping to keep Heroku web socket active

              case ChangeName(name) => changeUserName(senderUser, name)

              case ChangeProperty(key, value) =>
                if (value == JsNull) {
                  roomState.remove(key)
                } else {
                  roomState.put(key, value)
                }
                broadcastAll(js)

              case SendTo(toUserId, fromUserId, value, realName) =>
                getUserActor(toUserId) match {
                  case Some(actorRef) => actorRef ! js
                  case None => log.error("ERROR Cant find send to user " + js.toString())
                }

              case StartBroadcast(sdp, video, audio) =>
                mediaServer.publishStream(senderUser, sdp) match {
                  case Success(reply) => sender() ! reply
                  case Failure(e) => {
                    log.error("Problem starting kurento broadcast stream", e)
                    sender() ! WebRtcProblem("Problem publish kurento stream:" + e.getMessage, senderUser.id)
                  }
                }

              case StopBroadcast(fromUserId) => mediaServer.stopPublish(senderUser)

              case msg: IceCandidateBroadcast => mediaServer.addIceCandidate(senderUser, msg)

              case ViewBroadcast(sdp, broadcastUserId) =>
                log.info("Handling ViewBroadcast")
                users.values
                  .find(_.id == broadcastUserId) match {
                    case Some(publisher) => mediaServer.viewStream(senderUser, publisher, sdp) match {
                      case Success(reply) => sender() ! reply
                      case Failure(e) => {
                        log.error(e, "Problem viewing kurento stream")
                        sender() ! WebRtcProblem("Problem viewing kurento stream:" + e.getMessage, broadcastUserId)
                      }
                    }
                    case None => log.error("No broadcast user found " + broadcastUserId)
                  }

              case ClearChat(s) =>
                broadcastAll(new ChatClear().toJson, true)

              case other => log.error("ERROR Unexpected message " + other)
            }

          case None =>
            cm match {
              case JoinMe(name) =>
                pendingUsers.get(sender) match {
                  case Some(uid) =>
                    pendingUsers.remove(sender())
                    doUserJoin(uid, name)
                  case _ => log.error("ERROR:No pending user found")
                }

              case Ping(s) =>

              case _ => log.error("ERROR Message from undefined user or not joined yet")
            }
        }
      } catch {
        // TODO handle error in more Akka way
        case e: Exception =>
          val sw = new StringWriter
          e.printStackTrace(new PrintWriter(sw))
          log.error(sw.toString)
      }

    // ##### USER CONNECTED #####
    case ActorSubscribe(uid, name) =>
      log.info(s"User $uid connected $roomName")
      pendingUsers.put(sender, uid)


    // ##### USER DISCONNECTED #####
    case Terminated(actorRef) =>
      self ! ActorLeave(actorRef)

    case ActorLeave(actorRef) =>
      doUserLeave(actorRef)


    case AdminStatus =>
      sender ! AdminStatusReply(
        roomName,
        users.values.map(userInfo => "(" + userInfo.id + ")" + userInfo.name),
        users.size)
  }

  def doUserJoin(uid: String, name: String): Unit = {
    log.info(s"User $uid with name $name joined $roomName")
    // sender is joined user actorRef
    val joinUser = new UserInfo(uid, sender, name);

    context watch sender

    // #1 send who user is and server time
    sender ! new ConnectedMessage(uid, 0)
    sender ! new ChangeBracketMessage(Prefix.USER, joinUser.id, joinUser.toJson)

    // #2 notify all alive users and send users data to connected user
    for ((userAct, user) <- users) {
      sender ! new ChangeBracketMessage(Prefix.USER, user.id, user.toJson)
      userAct ! new ChangeBracketMessage(Prefix.USER, joinUser.id, joinUser.toJson)
    }
    users.put(sender, joinUser)

    // #3 send whole room state to connected user
    for ((key, value) <- roomState) {
      sender ! new ChangeMessage(key, value)
    }
  }

  def doUserLeave(actorRef: ActorRef): Unit = {
    pendingUsers.remove(actorRef)
    users.remove(actorRef) match {
      case Some(removeUser) =>
        mediaServer.close(removeUser)

        // send leave message to all
        val hasBroadcast = roomState.remove(Prefix.BROADCAST + "." + removeUser.id).isDefined
        roomState.remove(Prefix.USER + "." + removeUser.id)
        for ((userAct, user) <- users) {
          if (hasBroadcast) {
            userAct ! new ChangeBracketMessage(Prefix.BROADCAST, removeUser.id, null)
          }
          userAct ! new ChangeBracketMessage(Prefix.USER, removeUser.id, null)
        }



      case _ => log.error("Problem leave user wasn't found " + actorRef)
    }
  }

  def broadcastAll(value: JsValue, doPersist: Boolean = false) = users.keys.foreach(_ ! value)

  def broadcastMessage(message: ServerMessage) = broadcastAll(message.toJson)

  def getUserActor(userId: String): Option[ActorRef] = users.find(_._2.id == userId).map(_._1)

  def sendToUser(userId: String, msg: ServerMessage) = getUserActor(userId) match {
    case Some(actorRef) => actorRef ! msg
    case None => log.error(s"No user found for userId:$userId to send msg ${msg.messageType}")
  }
}

class UserInfo(var id: String,
               var actorRef: ActorRef,
               var name: String = "New User") {

//  type UserId = String

  def toJson = Json.obj("name" -> name, "id" -> id)

  override def toString() = {
    val body = getClass().getDeclaredFields().map { field:Field =>
      field.setAccessible(true)
      field.getName() + ":" + field.get(this)
    }.mkString(",")
    "{" + body + "}"
  }
}
