import actor.TopActor
import com.google.inject.AbstractModule

class AppModule extends AbstractModule with play.api.libs.concurrent.AkkaGuiceSupport {
  def configure = {
    bindActor[TopActor]("top-actor")
  }
}