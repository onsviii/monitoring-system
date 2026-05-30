FROM python:3.12-slim

WORKDIR /app

# Системні залежності для spaCy
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir torch==2.4.0+cpu --index-url https://download.pytorch.org/whl/cpu

# Python-залежності
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# spaCy українська модель для NER
RUN python -m spacy download uk_core_news_sm

# Код сервісу
COPY . .

# Порт ML-сервісу (внутрішня мережа, без HTTPS — підрозділ 2.5.4)
EXPOSE 8001

# Запуск через uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
