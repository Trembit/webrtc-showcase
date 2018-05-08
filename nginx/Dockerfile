FROM jwilder/nginx-proxy

COPY webrtc-showcase.trembit.com.nginx /etc/nginx/conf.d/my_proxy.conf

COPY certs/* /etc/nginx/certs/

RUN chmod -R a+rwx /etc/nginx/certs/
