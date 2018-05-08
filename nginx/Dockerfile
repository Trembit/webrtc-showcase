FROM jwilder/nginx-proxy

COPY webrtc-showcase.trembit.com.nginx /etc/nginx/conf.d/my_proxy.conf

COPY ../etc/certs/webrtc-showcase.trembit.com/* /etc/nginx/certs/
#COPY certs /etc/nginx/

RUN echo $(ls /etc/nginx/certs)