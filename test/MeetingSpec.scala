import actor.utils._
import actor.{GetRoomActor, TopActor}
import akka.actor.{ActorRef, Props, ActorSystem}
import akka.testkit.{TestProbe, ImplicitSender, TestKit}
import org.scalatest.{ BeforeAndAfterAll, Matchers, WordSpecLike }
import play.api.libs.json.{JsString, JsNull}

class MeetingSpec() extends TestKit(ActorSystem("MeetingSpec")) with ImplicitSender
  with WordSpecLike with Matchers with BeforeAndAfterAll {

  override def afterAll {
    TestKit.shutdownActorSystem(system)
  }

  "A MeetingActor actor" must {

    "Create or get room actor" in {
      val topActor = system.actorOf(Props[TopActor])

      topActor ! GetRoomActor("room1")
      val room1 = expectMsgPF()({
        case a:ActorRef => a
      })
      topActor ! GetRoomActor("room2")
      val room2 = expectMsgPF()({
        case a:ActorRef => a
      })
      topActor ! GetRoomActor("room1")
      val room11 = expectMsgPF()({
        case a:ActorRef => a
      })

      room1.path.name should equal(room11.path.name)
      room1.path.name shouldNot equal(room2.path.name)
    }

    "allow join" in {
      val topActor = system.actorOf(Props[TopActor])

      topActor ! GetRoomActor("room1")
      val room1 = expectMsgPF()({ case a:ActorRef => a})
      val userActor = self

      room1.tell(ActorSubscribe("1234"), userActor)
      room1.tell((JoinMe("First User Ever"), JsNull), userActor)

      expectMsgPF(hint = "ConnectedMessage")({ case a@ConnectedMessage(p, d) => a })
      expectMsgPF(hint = "ChangeBracketMessage")({ case a:ChangeBracketMessage => a })
    }

    "broadcast state changes" in {
      val topActor = system.actorOf(Props[TopActor])

      topActor ! GetRoomActor("room1")
      val room1 = expectMsgPF()({ case a:ActorRef => a})
      val uid1 = "uid1"
      val uid2 = "uid2"
      val user1 = TestProbe()
      val user2 = TestProbe()

      user1.send(room1, ActorSubscribe(uid1))
      user1.send(room1, (JoinMe("User1"), JsNull))

      user2.send(room1, ActorSubscribe(uid2))
      user2.send(room1, (JoinMe("User2"), JsNull))

      user2.send(room1, (ChangeProperty("someKey", JsString("123")), JsString("123")))

      user2.fishForMessage(hint = "Change state")({
        case _:ConnectedMessage | _:ChangeBracketMessage => false
        case a@JsString("123") => true
      })
    }

  }
}