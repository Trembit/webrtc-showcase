import controllers.RoomController
import org.specs2.mutable._
import org.specs2.runner._
import org.junit.runner._
import play.api.mvc.EssentialAction
import play.api.test._
import play.api.test.Helpers._
import utils.PlayTestHelper

@RunWith(classOf[JUnitRunner])
class ApplicationSpec extends PlaySpecification with PlayTestHelper {


  "Application" should {

    "send 404 on a bad request" in new WithApplication(app) {
      val controller = app.injector.instanceOf[RoomController]


      val undef = route(app, FakeRequest(GET, "/boum")).get
      status(undef) must equalTo(NOT_FOUND)
    }

    "render the index page" in new WithApplication{
      val home = route(app, FakeRequest(GET, "/")).get

      status(home) must equalTo(OK)
      contentType(home) must beSome.which(_ == "text/html")
      contentAsString(home) must contain ("WebRTC Showcase | default")
    }

    "render some test room page" in new WithApplication{
      val home = route(app, FakeRequest(GET, "/room/test")).get

      status(home) must equalTo(OK)
      contentType(home) must beSome.which(_ == "text/html")
      contentAsString(home) must contain ("WebRTC Showcase | test")
    }
  }
}
