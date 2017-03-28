# stream oriented kurento
#
# VERSION               4.4.3

FROM      ubuntu:14.04
MAINTAINER Patxi Gortázar <patxi.gortazar@gmail.com>

RUN apt-get update \
  && apt-get -y dist-upgrade \
	&& apt-get install -y wget

RUN	echo "deb http://ubuntu.kurento.org/ trusty kms6" | tee /etc/apt/sources.list.d/kurento.list \
	&& wget -O - http://ubuntu.kurento.org/kurento.gpg.key | apt-key add - \
	&& apt-get update \
	&& apt-get -y install kurento-media-server-6.0

RUN apt-get install telnet

COPY ./entrypoint.sh /entrypoint.sh

RUN chmod +x /entrypoint.sh

ENV GST_DEBUG=Kurento*:5

EXPOSE 8888

ENTRYPOINT ["/entrypoint.sh"]