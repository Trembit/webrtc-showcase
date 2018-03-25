node {

    checkout scm

    def port = 5084
    def mode = "stage"

    stage ("Build and run docker image") {

        shortCommit = sh(returnStdout: true, script: "git log -n 1 --pretty=format:'%h'").trim()

        echo "Building $env.BUILD_ID from $shortCommit"

        sh "docker-compose down || true"

        sh "cp -R etc/certs/webrtc-showcase.trembit.com/* nginx/certs"

        sh "docker-compose build"

        sh "docker-compose up -d"
    }
}
