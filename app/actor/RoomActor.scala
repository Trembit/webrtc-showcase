package actor

import akka.actor.{Actor}


/**
 * Actor that can contain users and exchange messages in between.
 */
trait RoomActor extends Actor with BaseActor {

  val roomName: String = "Default"

  override def preStart() = {
    println(s"${this.getClass.getSimpleName} start $roomName $self")
  }

  override def postStop() = {
    println(s"${this.getClass.getSimpleName} stop $roomName $self")
  }
}

