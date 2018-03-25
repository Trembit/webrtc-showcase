node {

    checkout scm

    def port = 5084
    def mode = "stage"

    stage ("Build and run docker image") {

        shortCommit = sh(returnStdout: true, script: "git log -n 1 --pretty=format:'%h'").trim()

        echo "Building $env.BUILD_ID from $shortCommit"

        //sh "./etc/scripts/redeploy-staging.sh"

        sh '''
            set -e

            WORKSPACE=$(pwd)

            echo "Work dir $WORKSPACE"

            docker-compose down || true

            cp -R etc/certs/webrtc-showcase.trembit.com/* "$WORKSPACE/nginx/certs/"

            cd "$WORKSPACE/web"

            mkdir -p "$WORKSPACE/web/dist"

            docker build -t webrtc-showcase/web .

            docker run --rm --name webrtc-showcase-web -v "$WORKSPACE/web/dist":/usr/src/app/dist -t webrtc-showcase/web ng build --prod --deploy-url /static --base-href https://webrtc-showcase.trembit.com:5084/static/

            cd "$WORKSPACE"

            docker-compose build

            docker-compose up -d
        '''
    }
}
