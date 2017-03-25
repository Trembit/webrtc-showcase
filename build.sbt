name := """play-meetings"""

version := "1.5"

lazy val root = (project in file(".")).enablePlugins(PlayScala)

scalaVersion := "2.11.7"

scalacOptions ++= Seq("-unchecked", "-feature")

resolvers += "Sonatype Snapshots" at "https://oss.sonatype.org/content/repositories/snapshots/"

resolvers += "Typesafe Repository" at "http://repo.typesafe.com/typesafe/releases/"

resolvers += "Scalaz-bintray" at "https://dl.bintray.com/scalaz/releases"

resolvers += "MvnRepository" at "http://central.maven.org/maven2/"

val akkaVersion = "2.4.17"

val kurentoclient = "org.kurento" % "kurento-client" % "6.6.1"
val kurentomodule = "org.kurento.module" % "crowddetector" % "6.6.0"
val kurentojava = "org.kurento" % "kurento-java" % "6.6.1"

libraryDependencies ++= Seq(
  kurentoclient,
  kurentomodule,
  kurentojava,

//  "org.scala-lang" % "scala-compiler" % scalaVersion.value force(), // !!

  "com.typesafe.akka" %% "akka-actor" % akkaVersion,
  "com.typesafe.akka" %% "akka-testkit" % akkaVersion,
  "com.typesafe.akka" %% "akka-slf4j"    % akkaVersion

)

libraryDependencies += "org.scalatest" %% "scalatest" % "2.1.4" % "test"

libraryDependencies += "commons-io" % "commons-io" % "2.4" % "test"

libraryDependencies += specs2 % Test