node {

    checkout scm

    def port = 5084
    def mode = "stage"

    stage ("Build and run docker image") {

        shortCommit = sh(returnStdout: true, script: "git log -n 1 --pretty=format:'%h'").trim()

        echo "Building $env.BUILD_ID from $shortCommit"

        sh "./etc/scripts/redeploy-staging.sh"
    }
}
