#!/usr/bin/env bash

WORKSPACE=$(pwd)

echo "Work dir $WORKSPACE"

docker-compose down || true

cp -R etc/certs/webrtc-showcase.trembit.com/* nginx/certs/

cd "$WORKSPACE/web"

docker build -t webrtc-showcase/web .

docker run -it --rm --name webrtc-showcase-web -v "$WORKSPACE/web":/usr/src/app -t webrtc-showcase/web ng build --prod --deploy-url /static --base-href https://webrtc-showcase.trembit.com:5084/static/

cd "$WORKSPACE"

docker-compose build

docker-compose up -d