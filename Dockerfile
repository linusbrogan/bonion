FROM node
COPY ./* /bon/
WORKDIR /bon
RUN npm install
RUN echo America/Los_Angeles > /etc/timezone && ln -sf /usr/share/zoneinfo/America/Los_Angeles /etc/localtime && dpkg-reconfigure -f noninteractive tzdata
EXPOSE 80/tcp
CMD ["/usr/local/bin/node", "/bon/main.js"]
