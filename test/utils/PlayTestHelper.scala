package utils

import java.nio.file.Files

import play.api.inject.bind
import play.api.inject.guice.GuiceApplicationBuilder
import play.api.{Configuration, Mode}

import scala.reflect.ClassTag

trait PlayTestHelper {

  lazy val overrideConfig = Configuration()

  lazy val appBuilder = new GuiceApplicationBuilder()
    .in(Mode.Test)
    .configure(overrideConfig)

  lazy val app = appBuilder.build()

  lazy val injector = app.injector

  def inject[T : ClassTag]: T = injector.instanceOf[T]

  def inject[T](clazz: Class[T]): T = injector.instanceOf(clazz)
}
