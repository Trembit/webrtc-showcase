package kurento

import actor.utils.{IceCandidateBroadcast, ServerMessage}
import actor.{MeetingActor, UserInfo}
import org.kurento.client.WebRtcEndpoint.Builder
import org.kurento.client._
import play.api.Logger

import scala.collection.mutable
import scala.util.{Failure, Try}

case class OnIceCandidateFound(candidate: String, sdpMid: String, sdpMLineIndex: Int, broadcastUserId: String) extends ServerMessage {
  val messageType: String = "onIceCandidateFound"
}

case class WebRtcAnswer(sdpAnswer: String, broadcastUserId: String) extends ServerMessage {
  val messageType: String = "webRtcAnswer"
}

case class WebRtcProblem(message: String, broadcastUserId: String) extends ServerMessage {
  val messageType: String = "webRtcProblem"
}


class MediaServer(meetingActor: MeetingActor) {

  private val log = Logger(this.getClass())

  lazy val kurento = KurentoClient.create("wss://local.trembit.com:8889/kurento")

  val bandwidth_limits: Boolean = false
  val cpu_optimization: Boolean = false
  val network_optimization: Boolean = false
  val videoMaxBitrate: Int = 0
  val videoMinBitrate: Int = 0

  val publishers = mutable.HashMap.empty[String, (MediaPipeline, WebRtcEndpoint)]

  val viewers = mutable.HashMap.empty[String, mutable.Map[String, WebRtcEndpoint]]

  val candidates = mutable.HashMap.empty[String, mutable.ListBuffer[IceCandidateBroadcast]]
    .withDefaultValue(new mutable.ListBuffer[IceCandidateBroadcast]())

  def publishStream(user: UserInfo, sdp: String): Try[WebRtcAnswer] = {
    Try {
      val media = kurento.createMediaPipeline
      val endpoint = new Builder(media).build
      media.setLatencyStats(true)

      publishers += user.id -> (media, endpoint)

      addIceCandidateListener(user, user, endpoint)

      val sdpAnswer = endpoint.processOffer(sdp)

      endpoint.gatherCandidates

      WebRtcAnswer(sdpAnswer, user.id)
    }
  }

  def stopPublish(user: UserInfo): Unit = {
    publishers.remove(user.id)
      .foreach {
        case (pipeline, endpoint) =>
          Try { endpoint.release() }
          Try { pipeline.release() }
      }

    viewers.values
      .foreach(views => views.remove(user.id)
        .foreach( endpoint =>
          Try { endpoint.release() }
        )
      )
  }

  def stopView(viewer: UserInfo): Unit = {
    viewers.remove(viewer.id)
      .foreach(
        _.values.foreach(
          endpoint => Try { endpoint.release()}
        )
      )
  }

  def viewStream(viewer: UserInfo, publisher: UserInfo, sdp: String): Try[WebRtcAnswer] = {
    log.info(s"viewStream viewer:${viewer.id} broadcaster:${publisher.id}")
    publishers.get(publisher.id) match {

      case Some((publisherPipeline, publisherEndpoint)) =>
        Try {
          val endpoint = new Builder(publisherPipeline).build

          viewers.getOrElseUpdate(viewer.id, mutable.HashMap.empty)
          viewers.get(viewer.id).foreach {
            case data => data += publisher.id -> endpoint
          }

          candidates.get(viewer.id).foreach {
            case candidates =>
              candidates.foreach(addIceCandidate(viewer, _))
              log.info(s"Added cached ${candidates.length} candidates")
          }

          addIceCandidateListener(viewer, publisher, endpoint)

          val sdpAnswer = endpoint.processOffer(sdp)

          publisherEndpoint.connect(endpoint)

          endpoint.gatherCandidates

          WebRtcAnswer(sdpAnswer, publisher.id)
        }

      case None =>
        Failure(new RuntimeException("Published not found"))
    }
  }

  def addIceCandidate(user: UserInfo, msg: IceCandidateBroadcast) {
    val isPublisher = user.id == msg.broadcastUserId

    log.info(s"addIceCandidate from ${user.id} for broadcastId:${msg.broadcastUserId} isPublisher:$isPublisher")

    if (isPublisher) {
      publishers.get(user.id) match {
        case Some((pipeline, endpoint)) => endpoint.addIceCandidate(new IceCandidate(msg.candidate, msg.sdpMid, msg.sdpMLineIndex))
        case None => log.warn(s"Skipping ice candidate for non existed publisher:${user.id}")
      }
    } else {
      viewers.get(user.id)
        .flatMap(m => m.get(msg.broadcastUserId)) match {
          case Some(endpoint) =>
            log.info("Added ice candidate for viewer")
            endpoint.addIceCandidate(new IceCandidate(msg.candidate, msg.sdpMid, msg.sdpMLineIndex))

          case None =>
            candidates.getOrElseUpdate(user.id, new mutable.ListBuffer())
            candidates.get(user.id)
              .foreach {
                case list =>
                  list += msg
                  log.info(s"Added ice candidate to cache in addIceCandidate for viewer ${user.id} ${msg.broadcastUserId} cached:${list.size}")
              }
        }
    }
  }

  private def closeEndpoint(endpoint: Endpoint) = {
  }


  private def addIceCandidateListener(subscriber: UserInfo, publisher: UserInfo, endpoint: WebRtcEndpoint): ListenerSubscription = {
    endpoint.addOnIceCandidateListener(new EventListener[OnIceCandidateEvent]() {
      def onEvent(event: OnIceCandidateEvent) {
        try {
          val wrInfo = OnIceCandidateFound(
            event.getCandidate.getCandidate,
            event.getCandidate.getSdpMid,
            event.getCandidate.getSdpMLineIndex,
            publisher.id)

          meetingActor.sendToUser(subscriber.id, wrInfo)
        } catch {
          case e: Exception => {
            e.printStackTrace
          }
        }
      }
    })
  }

  def close(user: UserInfo): Unit = {
    stopPublish(user)
    stopView(user)
  }
}