package controllers

import java.io.File
import java.util.UUID
import java.util.concurrent.atomic.AtomicInteger

import actor.utils.{AdminStatus, AdminStatusReply}
import actor.{GetRoomActor, TopActor, MeetingActor, UserActor}
import akka.actor.{ActorRef, Props}
import play.api.Logger
import play.api.libs.json.JsValue
import play.api.mvc._
import play.libs.Akka

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future
import scala.util.{Success, Failure}
import scala.concurrent.duration._
import scala.language.postfixOps

import play.api.Play.current
import akka.pattern.{ ask, pipe }


class UserRequest[A](val user: AuthUser, request: Request[A]) extends WrappedRequest[A](request)

object UserAction extends ActionBuilder[UserRequest] with ActionTransformer[Request, UserRequest] {

  val UID = "uid"
  var counter = new AtomicInteger(0)

  def transform[A](request: Request[A]) = Future.successful {
    val uid = request.session.get(UID).getOrElse(counter.getAndIncrement().toString)
    new UserRequest(AuthUser(uid), request)
  }
}

case class AuthUser(uid: String)

class UserAuthRequest[A](val user: AuthUser, request: Request[A]) extends WrappedRequest[A](request) {

}

object RoomType {
  val MEETING_TYPE = "meeting";
}

object RoomController extends Controller {

  lazy val topActor = Akka.system().actorOf(Props[TopActor])

  val DEFAULT_ROOM_NAME = "Default"

  def index() = UserAction { implicit request =>
    // UID is not used right now
    val uid: String = request.user.uid

    Ok(views.html.room(uid, DEFAULT_ROOM_NAME)).withSession(request.session + (UserAction.UID -> uid))
  }

  def joinRoom(room: String = DEFAULT_ROOM_NAME) = UserAction { implicit request =>
    val uid: String = request.user.uid

    Logger.debug("User visited meeting:" + room)
    Ok(views.html.room(uid, room)).withSession(request.session + (UserAction.UID -> uid))
  }

  def logout = Action { implicit request =>
    Redirect("/").withNewSession
  }

  def admin = Action {
    Ok(views.html.admin(List.empty[String]))
  }

//  def admin = Action.async {
//    import akka.util.Timeout
//
//    import scala.concurrent.duration._
//    implicit val timeout = Timeout(5 seconds)
//
//    val actor: Future[ActorRef] = getRoomActor(RoomType.MEETING_TYPE, DEFAULT_ROOM_NAME)
//    (actor ? AdminStatus).map {
//      case response: AdminStatusReply =>
//        Ok(views.html.admin(
//          List[String](
//            "Room: " + response.name,
//            "Users count: " + response.users.size,
//            "Users: " + response.users.mkString(","),
//            "Messages count: " + response.chatSize
//          )
//        )
//      )
//    }
//  }

  def webSocket(roomType: String, room: String = DEFAULT_ROOM_NAME) = WebSocket.tryAcceptWithActor[JsValue, JsValue] { implicit request =>
    val uid = UUID.randomUUID().toString().substring(0, 4)

    getRoomActor(roomType, room.toLowerCase).map(actor => Right(UserActor.props(uid, actor)))
  }

  /* HELPERS */
  def getRoomActor(roomType: String, room: String): Future[ActorRef] = synchronized {
    topActor.ask(GetRoomActor(room))(5 second)
      .map {
        case actor: ActorRef => actor
        case _ => ???
      }
  }
}


