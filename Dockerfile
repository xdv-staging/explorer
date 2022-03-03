FROM node:14
MAINTAINER Divvy Operations <ops@xdv.io>

RUN mkdir /explorer
ADD . / explorer/
RUN npm --prefix explorer install
RUN chmod +x /explorer/entrypoint.sh
WORKDIR /explorer

CMD /explorer/entrypoint.sh
