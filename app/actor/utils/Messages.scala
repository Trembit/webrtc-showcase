package actor.utils

import java.lang.reflect.Field
import java.math.BigDecimal

import akka.actor.ActorRef
import org.apache.commons.lang3.StringUtils
import play.api.libs.json._

object Prefix {
  val USER = "user"
  val CHAT = "chat"
  val BROADCAST = "broadcast"
}


case class ActorSubscribe(uid: String, name: String = "")
case class ActorLeave(actorRef: ActorRef)

case object AdminStatus
case class AdminStatusReply(name: String, users: Iterable[String], chatSize: Int)


trait ServerMessage {

  def messageType: String

  def toJson = {
    var result = new JsObject(Map())
    for (field <- this.getClass.getDeclaredFields) yield {
      field.setAccessible(true)
      val value = field.get(this).asInstanceOf[Any]
      val jsValue:JsValue = value match {
        case n: Integer => new JsNumber(new BigDecimal(n))
        case s: String => JsString(s)
        case b: Boolean => JsBoolean(b)
        case js: JsValue => js
        case null => JsNull
        case _ =>
          JsString("Unknown obj")
      }
      result = result + (field.getName -> jsValue )
    }
    result
  }

  override def toString() = {
    val body = getClass().getDeclaredFields().map { field:Field =>
      field.setAccessible(true)
      field.getName() + ":" + Option(field.get(this))
        .map(v => StringUtils.abbreviate(v.toString, 20))
        .getOrElse("null")
    }.mkString(",")
    "{" + body + "}"
  }
}

case class ConnectedMessage(val pid: String, serverTime: Int) extends ServerMessage {
  val messageType: String = "youAre"
}

case class ChangeBracketMessage(val bracket: String, val id : String, val value: JsValue) extends ServerMessage {
  val key = bracket + "." + id
  val messageType: String = "change"
}

case class ChangeMessage(val key: String, val value: JsValue) extends ServerMessage {
  val messageType: String = "change"
}

case class UserMessage(val pid : String, val name: String) extends ServerMessage {
  val messageType: String = "painter"
}

case class UserDisconnectMessage(val pid : String) extends ServerMessage {
  val messageType: String = "disconnected"
}

case class ChatMessage(val name : String, val message: String) extends ServerMessage {
  val messageType: String = "chatMessage"
}

case class UserCommand(val data: String) extends ServerMessage {
  val messageType: String = "command"
}

case class ChatClear() extends ServerMessage {
  val messageType: String = "chatClear"
}


class UserConnectedMessage(val pid : String,
                           val name: String) extends ServerMessage {
  val messageType: String = "connected"
}

class StatusMessage(val local : String, val all: String) extends ServerMessage {
  val messageType: String = "status"
}


sealed trait ClientMessage {
  override def toString() = {
    val body = getClass().getDeclaredFields().map { field:Field =>
      field.setAccessible(true)
      field.getName() + ":" + Option(field.get(this))
        .map(v => StringUtils.abbreviate(v.toString, 20))
        .getOrElse("null")
    }.mkString(",")
    "{" + body + "}"
  }
}

// case class should not be empty
case class JoinMe(name: String) extends ClientMessage
case class Ping(fromUserId: String) extends ClientMessage
case class ChangeName(name: String) extends ClientMessage
case class ChangeProperty(key: String, value: JsValue) extends ClientMessage
case class SendTo(toUserId: String, fromUserId: String, value: JsValue, realName: String) extends ClientMessage
case class StartBroadcast(sdp: String, video: Boolean, audio: Boolean) extends ClientMessage
case class ViewBroadcast(sdp: String, broadcastUserId: String) extends ClientMessage
case class IceCandidateBroadcast(candidate: String, sdpMid: String, sdpMLineIndex: Int, broadcastUserId: String) extends ClientMessage
case class StopBroadcast(fromUserId: String) extends ClientMessage
case class ClearChat(fromUserId: String) extends  ClientMessage

object Converter {

  val incomingMessageMap = scala.collection.mutable.Map[String, Reads[ClientMessage]]()

  registerClientMessage("join", Json.reads[JoinMe])
  registerClientMessage("ping", Json.reads[Ping])
  registerClientMessage("changeName", Json.reads[ChangeName])
  registerClientMessage("change", Json.reads[ChangeProperty])
  registerClientMessage("sendTo", Json.reads[SendTo])
  registerClientMessage("clearChat", Json.reads[ClearChat])
  registerClientMessage("startBroadcast", Json.reads[StartBroadcast])
  registerClientMessage("iceCandidateBroadcast", Json.reads[IceCandidateBroadcast])
  registerClientMessage("stopBroadcast", Json.reads[StopBroadcast])
  registerClientMessage("viewBroadcast", Json.reads[ViewBroadcast])

  def registerClientMessage(key: String, reads: Reads[_]) {
    incomingMessageMap.put(key, reads.asInstanceOf[Reads[ClientMessage]])
  }

  def toJson(m: ServerMessage) = m.toJson

  def toMessage(js: JsValue): Option[ClientMessage] = {
    val messageTuple = (getStringValue(js, "messageType"), getStringValue(js, "data"))
    messageTuple match {
      case (messageType, _) =>
        incomingMessageMap.get(messageType)
          .flatMap(js.validate(_).asOpt)
      case _ =>
        println("ERROR Can't parse message " + js.toString())
        None
    }
  }

  def getStringValue(js: JsValue, prop: String) = {
    (js \ prop).getOrElse(JsString("")) match {
      case JsString(value) => value
      case _ => ""
    }
  }
}


