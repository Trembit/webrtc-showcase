import actor.utils.{Converter, ChangeName, ChangeBracketMessage}
import org.junit.runner.RunWith
import org.specs2.Specification
import org.specs2.runner.JUnitRunner
import play.api.libs.json.{JsValue, JsObject, JsString}

/**
  * Created by Stan Reshetnyk on 20.04.17.
  */
@RunWith(classOf[JUnitRunner])
class JsonConverterSpec extends Specification {

  def is = s2"""

  Client and serevr messages should be convertable to JSON
      ChangeBracketMessage                             $e1
      ChangeName                                       $e2
                                                      """

  val e1 = (ChangeBracketMessage("stan", "", JsString("123")).toJson.toString()) must equalTo("""{"bracket":"stan","key":"stan.","messageType":"change","id":"","value":"123"}""")

  private val jsObject: JsValue = JsObject(Seq("messageType" -> JsString("changeName"), "name" -> JsString("stan")))
  val e2 = (Converter.toMessage(jsObject).get) must equalTo(ChangeName("stan"))
}
