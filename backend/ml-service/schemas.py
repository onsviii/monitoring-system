from pydantic import BaseModel


# ─── Анонімізація ───

class AnonymizeRequest(BaseModel):
    """Масив сирих текстів для анонімізації."""
    texts: list[str]


class AnonymizeResponse(BaseModel):
    """Масив анонімізованих текстів (у тому самому порядку)."""
    texts: list[str]


# ─── ASC-класифікація ───

class ClassifyRequest(BaseModel):
    """Масив анонімізованих текстів для класифікації."""
    texts: list[str]


class AspectPrediction(BaseModel):
    """Результат класифікації одного аспекту для одного відгуку."""
    polarity: int         # -1, 0, +1
    confidence: float     # softmax max probability


class ReviewPrediction(BaseModel):
    """Результат класифікації одного відгуку по всіх 4 аспектах."""
    service: AspectPrediction
    product_quality: AspectPrediction
    price: AspectPrediction
    location: AspectPrediction


class ClassifyResponse(BaseModel):
    """Масив результатів (у тому самому порядку, що й texts)."""
    predictions: list[ReviewPrediction]
