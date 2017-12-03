package actor

import actor.utils.{ClientMessage, Converter, ActorSubscribe, ServerMessage}
import akka.actor._
import akka.event.LoggingReceive
import play.api.libs.json._


/**
 * Actor for each user. Connects socket and room. Responsible for serialization.
  *
  * @param uid
 * @param roomRef - room actor
 * @param out - socket actor
 */
class UserActor(val uid: String, roomRef: ActorRef, out: ActorRef) extends Actor with BaseActor {

  override def preStart() = {
    roomRef ! ActorSubscribe(uid)
  }

  def receive = {
    // resend from room to client
    case msg: ServerMessage =>
      out ! msg.toJson

    // json from room, send to client
    case js: JsValue if sender.path == roomRef.path =>
      out ! js

    case js: JsValue =>
      // parse json to case class and pass to room
      Converter.toMessage(js) match {
        case Some(m) => roomRef ! (m, js)
        case None =>
          log.error("Problem can't parse message " + js.toString())
      }

    case other =>
      log.error("UserActor unhandled: " + other)
  }
}

object UserActor {
  def props(uid: String, room: ActorRef)(out: ActorRef) = Props(new UserActor(uid, room, out))
}