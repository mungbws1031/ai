FROM python:3.11-slim

WORKDIR /app

COPY hermes/requirements.txt /app/hermes/requirements.txt
RUN pip install --no-cache-dir -r /app/hermes/requirements.txt

COPY hermes /app/hermes

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

CMD ["python", "-m", "hermes"]
