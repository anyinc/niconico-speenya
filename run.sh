source "`pwd`/.env";

docker run --rm \
  -v `pwd`/data/:/app/data/ \
  -p ${PORT}:8080 -e "SERVER_URL=${SERVER_URL}" \
  chimerast/niconico-speenya:develop
