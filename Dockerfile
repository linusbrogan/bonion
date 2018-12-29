FROM node
COPY ./* /bon/
WORKDIR /bon
#ENV TZ=America/Los_Angeles
#RUN cp timezone /etc/timezone
#RUN dpkg-reconfigure -f noninteractive tzdata
RUN npm install
#RUN ln -snf /usr /share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
#RUN echo America/Los_Angeles > /etc/timezone && dpkg-reconfigure -f noninteractive tzdata
RUN echo America/Los_Angeles > /etc/timezone && ln -sf /usr/share/zoneinfo/America/Los_Angeles /etc/localtime && dpkg-reconfigure -f noninteractive tzdata
EXPOSE 80/tcp
#CMD ["/bin/bash", "/bon/run.sh"]
CMD ["/usr/local/bin/node", "/bon/main.js"]
