echo " Shutting down Projection ... "
docker compose down
echo " Rebuilding the stack ... "
#docker compose build --no-cache
docker compose build
echo " Starting ... "
docker compose up -d

# echo " Cleaning up ... "
# docker system prune -af
# docker volume prune -af

# echo "Following logs ... "
# docker logs -f mqtt
