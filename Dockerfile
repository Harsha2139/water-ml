FROM python:3.12-slim
WORKDIR /app
COPY index.html server.py ./
COPY css ./css
COPY js ./js
ENV PORT=8000 DATA_DIR=/data
EXPOSE 8000
CMD ["python","server.py"]
