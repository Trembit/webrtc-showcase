package actor

import akka.actor.SupervisorStrategy.{Restart, Resume}
import akka.actor.{ActorLogging, AllForOneStrategy, Actor}
import scala.concurrent.duration._
import scala.language.postfixOps


/**
  * Created by Stan Reshetnyk on 23.03.17.
  */
trait BaseActor extends Actor with ActorLogging {

  override val supervisorStrategy =
    AllForOneStrategy(maxNrOfRetries = 10, withinTimeRange = 1 minute) {
      case nie: NotImplementedError  => {
        nie.printStackTrace()
        Resume
      }
      case _                       => Restart
    }
}
