FROM jrottenberg/ffmpeg:4.4-alpine

# Install bash for better script support
RUN apk add --no-cache bash

# Create a script that can handle both ffmpeg and ffprobe commands
RUN echo '#!/bin/bash' > /usr/local/bin/ffmpeg-proxy && \
    echo 'if [ "$1" = "ffprobe" ]; then' >> /usr/local/bin/ffmpeg-proxy && \
    echo '  shift' >> /usr/local/bin/ffmpeg-proxy && \
    echo '  exec ffprobe "$@"' >> /usr/local/bin/ffmpeg-proxy && \
    echo 'elif [ "$1" = "keep-alive" ]; then' >> /usr/local/bin/ffmpeg-proxy && \
    echo '  while true; do sleep 30; done' >> /usr/local/bin/ffmpeg-proxy && \
    echo 'else' >> /usr/local/bin/ffmpeg-proxy && \
    echo '  exec ffmpeg "$@"' >> /usr/local/bin/ffmpeg-proxy && \
    echo 'fi' >> /usr/local/bin/ffmpeg-proxy && \
    chmod +x /usr/local/bin/ffmpeg-proxy

# Set the proxy as entrypoint
ENTRYPOINT ["/usr/local/bin/ffmpeg-proxy"]

# Set default command to keep container running
CMD ["keep-alive"]
