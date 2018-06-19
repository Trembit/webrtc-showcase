FROM jwilder/nginx-proxy

# TODO make volumes working
COPY webrtc-showcase.trembit.com.nginx /etc/nginx/conf.d/my_proxy.conf

COPY certs /etc/nginx/certs/

RUN chmod -R a+rwx /etc/nginx/certs/
