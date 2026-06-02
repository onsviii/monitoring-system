"""
Два ендпоінти:
  POST /anonymize — двошарова анонімізація (RegEx + NER)
  POST /classify  — ASC Multi-Task класифікація (4 аспекти × 3 класи)
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException

from schemas import (
    AnonymizeRequest, AnonymizeResponse,
    ClassifyRequest, ClassifyResponse,
)
from anonymizer import anonymize_batch
from classifier import load_model, classify_batch

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Завантаження моделей при старті сервера.
    Ваги та токенізатор завантажуються в RAM одноразово,
    щоб уникнути затримок під час обробки запитів.
    """
    logger.info("Ініціалізація ML-сервісу...")
    load_model()
    logger.info("ML-сервіс готовий.")
    yield
    logger.info("ML-сервіс зупинено.")


app = FastAPI(
    title="BKR Monitor ML Service",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/health")
def health_check():
    """Health check для оркестратора (перевірка доступності перед запитами)."""
    return {"status": "ok"}


@app.post("/anonymize", response_model=AnonymizeResponse)
def anonymize_endpoint(request: AnonymizeRequest):
    """
    POST /anonymize

    Вхід: масив сирих текстів відгуків.
    Вихід: масив анонімізованих текстів (той самий порядок).

    Шар 1 (RegEx): телефони, email, URL → плейсхолдери.
    Шар 2 (NER): імена осіб → [ОСОБА].

    Анонімізований текст повертається бекенду, зберігається в БД,
    і лише потім надходить на класифікацію.
    """
    if not request.texts:
        return AnonymizeResponse(texts=[])

    try:
        anonymized = anonymize_batch(request.texts)
        return AnonymizeResponse(texts=anonymized)
    except Exception as e:
        logger.error("Anonymization failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Anonymization error: {str(e)}")


@app.post("/classify", response_model=ClassifyResponse)
def classify_endpoint(request: ClassifyRequest):
    """
    POST /classify

    Вхід: масив анонімізованих текстів.
    Вихід: масив результатів класифікації (той самий порядок).

    Кожен результат містить для 4 аспектів:
      - polarity: -1 (negative), 0 (none/neutral), +1 (positive)
      - confidence: максимальне значення softmax [0.0, 1.0]

    Multi-Task архітектура: один прохід енкодера → 4 голівки паралельно.
    """
    if not request.texts:
        return ClassifyResponse(predictions=[])

    try:
        predictions = classify_batch(request.texts)
        return ClassifyResponse(predictions=predictions)
    except Exception as e:
        logger.error("Classification failed: %s", e, exc_info=True)
        raise HTTPException(status_code=500, detail=f"Classification error: {str(e)}")
