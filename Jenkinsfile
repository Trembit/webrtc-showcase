node {

    checkout scm

    def port = 5085
    def mode = "stage"

    stage ("Build and run docker image") {

        shortCommit = sh(returnStdout: true, script: "git log -n 1 --pretty=format:'%h'").trim()

        echo "Building $env.BUILD_ID from $shortCommit"

        // sh "./etc/scripts/redeploy-staging.sh"

        sh '''
            set -e

            WORKSPACE=$(pwd)

            echo "Work dir $WORKSPACE"

            docker-compose down || true


            # Build WEB

            cd "$WORKSPACE/web"

            # rm -Rf dist

            docker build -t webrtc-showcase/web .

            # docker rm webrtc-showcase-web || true

            docker run --rm --name webrtc-showcase-web -t webrtc-showcase/web ng build --prod --deploy-url /static --base-href https://dev3.trembit.com:5085/static/

            mkdir -p dist

            # EPIC: it works, but it throws "operation not permitted"
            # https://github.com/moby/moby/issues/3986
            docker cp webrtc-showcase-web:/usr/src/app/dist "$WORKSPACE/web" || true

            # --rm flag doesn't leave container available. So we manually remove container
            docker rm webrtc-showcase-web


            # Build NGINX

            cd "$WORKSPACE"

            docker rm webrtcshowcase_nginx_1 || true

            docker rmi -f webrtcshowcase_nginx || true

            cp -R etc/certs/webrtc-showcase.trembit.com/* "$WORKSPACE/nginx/certs/"

            docker-compose build

            docker cp nginx/webrtc-showcase.trembit.com.nginx webrtc-showcase_nginx_1:/etc/nginx/conf.d/my_proxy.conf

            # Run
            docker-compose up -d
        '''
    }
}
