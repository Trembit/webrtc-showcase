package controllers

import java.util.UUID
import java.util.concurrent.atomic.AtomicInteger
import javax.inject.Inject

import actor.utils.{AdminStatus, AdminStatusReply}
import actor.{GetRoomActor, TopActor, UserActor}
import akka.actor.{ActorRef, Props}
import play.api.Logger
import play.api.libs.json.JsValue

import scala.concurrent.{ExecutionContext, Future}
import scala.concurrent.duration._
import scala.language.postfixOps
import akka.pattern.ask
import play.api.mvc._
import akka.actor._
import javax.inject._

import akka.stream.Materializer
import play.api.libs.streams.ActorFlow

import scala.concurrent.ExecutionContext.Implicits.global

class UserRequest[A](val uid: String, request: Request[A]) extends WrappedRequest[A](request)

class UserAction @Inject()(val parser: BodyParsers.Default)(implicit val executionContext: ExecutionContext)
  extends ActionBuilder[UserRequest, AnyContent] with ActionTransformer[Request, UserRequest] {
  def transform[A](request: Request[A]) = Future.successful {

    val counter = new AtomicInteger(0)
    val uid = request.session.get(UserAction.UID).getOrElse(counter.getAndIncrement().toString)
    new UserRequest(uid, request)
  }
}

object UserAction {
  val UID = "uid"
}

object RoomType {
  val MEETING_TYPE = "meeting";
}


@Singleton
class RoomController @Inject()(
  @Named("top-actor") topActor: ActorRef,
  userAction: UserAction,
  cc: ControllerComponents)(implicit system: ActorSystem, mat: Materializer) extends AbstractController(cc) {

//  lazy val topActor = system.actorOf(Props[TopActor], name = "top")

  val DEFAULT_ROOM_NAME = "default"

  import play.api.mvc._


  def index() = userAction(parse.defaultBodyParser) { implicit request: UserRequest[_] =>
    // UID is not used right now
    val uid: String = request.uid

    Ok(views.html.room(uid, DEFAULT_ROOM_NAME)).withSession(request.session + (UserAction.UID -> uid))
  }

  def joinRoom(room: String = DEFAULT_ROOM_NAME) = userAction(parse.text) { implicit request =>
    val uid: String = request.uid

    Logger.debug("User visited meeting:" + room)
    Ok(views.html.room(uid, room)).withSession(request.session + (UserAction.UID -> uid))
  }

  def logout = Action { implicit request =>
    Redirect("/").withNewSession
  }

  def admin = Action.async {
    import akka.util.Timeout

    import scala.concurrent.duration._
    import akka.pattern.ask
    implicit val timeout = Timeout(5 seconds)

    for {
      actor <- getRoomActor(DEFAULT_ROOM_NAME)
      reply <- (actor ? AdminStatus).mapTo[AdminStatusReply]
    } yield Ok(views.html.admin(
      List[String](
        "Room: " + reply.name,
        "Users count: " + reply.users.size,
        "Users: " + reply.users.mkString(","),
        "Messages count: " + reply.chatSize
      )
    ))
  }

  def webSocket(roomType: String, room: String = DEFAULT_ROOM_NAME) = WebSocket.acceptOrResult[JsValue, JsValue] { implicit request =>
      val uid = UUID.randomUUID().toString().substring(0, 4)

      getRoomActor(room.toLowerCase)
        .map(actor => Right(ActorFlow.actorRef({
          out => UserActor.props(uid, actor)(out)
        })))
  }

  /* HELPERS */
  def getRoomActor(room: String): Future[ActorRef] = synchronized {
    topActor.ask(GetRoomActor(room))(5 second)
      .map {
        case actor: ActorRef => actor
        case _ => ???
      }
  }
}


