FROM openresty/openresty:alpine

COPY nginx/nginx.conf /usr/local/openresty/nginx/conf/nginx.conf
COPY lua/ /app/lua/
COPY static/ /app/static/

RUN mkdir -p /data && chmod 777 /data

EXPOSE 8080

CMD ["openresty", "-g", "daemon off;"]
