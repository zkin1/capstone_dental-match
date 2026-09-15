FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt ai_agent/requirements.txt
RUN pip install --no-cache-dir -r ai_agent/requirements.txt

COPY . ai_agent/
ENV PYTHONPATH=/app

EXPOSE 8001

CMD ["uvicorn", "ai_agent.server:app", "--host", "0.0.0.0", "--port", "8001"]
