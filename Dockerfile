FROM lambci/lambda:nodejs4.3
LABEL maintainer="Shaun Jackman <sjackman@gmail.com>"
LABEL name="linuxbrew/linuxbrew-lambda"

COPY git-2.4.3.tar index.js /var/task/
COPY bin /var/task/bin
COPY brew /var/task/brew
