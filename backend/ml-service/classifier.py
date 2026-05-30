"""
ASC-класифікатор на базі Ukr-RoBERTa.

Архітектура Multi-Task:
  - Спільний енкодер: youscan/ukr-roberta-base
  - 4 незалежні Linear-голівки: service, product_quality, price, location
  - Один прохід енкодера для всіх аспектів (ефективність інференсу)
  - 3 класи на аспект: {-1: negative, 0: none/neutral, 1: positive}

Інференс на CPU.
Ваги моделі завантажуються одноразово при старті сервера (підрозділ 2.3.7).
"""

import torch
import torch.nn as nn
import logging
from transformers import AutoTokenizer, AutoModel
from schemas import AspectPrediction, ReviewPrediction

logger = logging.getLogger(__name__)

ASPECT_NAMES = ["service", "product_quality", "price", "location"]
NUM_CLASSES = 3  # -1, 0, +1
LABEL_MAP = {0: -1, 1: 0, 2: 1}  # index → polarity

# Шлях до збережених ваг (після fine-tuning у training pipeline)
MODEL_DIR = "./model_artifacts"
ENCODER_NAME = "youscan/ukr-roberta-base"
MAX_LENGTH = 256


class MultiTaskASCModel(nn.Module):
    """
    Multi-Task модель для ASC.
    [CLS] → dropout → 4 незалежні Linear(hidden_size, 3).
    """

    def __init__(self, encoder_name: str, num_classes: int = NUM_CLASSES):
        super().__init__()
        self.encoder = AutoModel.from_pretrained(encoder_name)
        hidden_size = self.encoder.config.hidden_size
        self.dropout = nn.Dropout(0.1)

        # 4 незалежні класифікаційні голівки
        self.heads = nn.ModuleDict({
            aspect: nn.Linear(hidden_size, num_classes)
            for aspect in ASPECT_NAMES
        })

    def forward(self, input_ids, attention_mask):
        outputs = self.encoder(input_ids=input_ids, attention_mask=attention_mask)
        cls_output = self.dropout(outputs.last_hidden_state[:, 0, :])  # [CLS] token

        logits = {
            aspect: head(cls_output)
            for aspect, head in self.heads.items()
        }
        return logits


# ─── Глобальний стан (завантажується один раз) ───

_model: MultiTaskASCModel | None = None
_tokenizer = None


def load_model():
    """
    Завантаження моделі та токенізатора при старті сервера.
    Артефакти: ваги найкращої моделі + конфігурація токенізатора
    (результат training pipeline, підрозділ 2.3.6).
    """
    global _model, _tokenizer

    logger.info("Завантаження токенізатора %s...", ENCODER_NAME)
    _tokenizer = AutoTokenizer.from_pretrained(ENCODER_NAME)

    logger.info("Ініціалізація Multi-Task ASC моделі...")
    _model = MultiTaskASCModel(ENCODER_NAME)

    # Завантаження fine-tuned ваг
    weights_path = f"{MODEL_DIR}/best_model.pt"
    try:
        state_dict = torch.load(weights_path, map_location="cpu", weights_only=True)
        _model.load_state_dict(state_dict)
        logger.info("Fine-tuned ваги завантажені з %s", weights_path)
    except FileNotFoundError:
        logger.warning(
            "Fine-tuned ваги не знайдені (%s). "
            "Використовується базова модель без fine-tuning. "
            "Для продакшену необхідно провести навчання (розділ 3).",
            weights_path
        )

    _model.eval()
    logger.info("ASC-модель готова до інференсу (CPU).")


def classify_batch(texts: list[str]) -> list[ReviewPrediction]:
    """
    Класифікація батчу відгуків.

    Для кожного тексту повертає polarity та confidence по 4 аспектах.
    Confidence — максимальне значення softmax.
    """
    if _model is None or _tokenizer is None:
        raise RuntimeError("Модель не завантажена. Викличте load_model() при старті.")

    # Токенізація
    encoded = _tokenizer(
        texts,
        padding=True,
        truncation=True,
        max_length=MAX_LENGTH,
        return_tensors="pt"
    )

    # Інференс без обчислення градієнтів
    with torch.no_grad():
        logits = _model(
            input_ids=encoded["input_ids"],
            attention_mask=encoded["attention_mask"]
        )

    # Постобробка: softmax → argmax → polarity + confidence
    predictions = []
    batch_size = len(texts)

    for i in range(batch_size):
        aspect_results = {}

        for aspect in ASPECT_NAMES:
            probs = torch.softmax(logits[aspect][i], dim=0)
            pred_idx = torch.argmax(probs).item()
            confidence = probs[pred_idx].item()

            aspect_results[aspect] = AspectPrediction(
                polarity=LABEL_MAP[pred_idx],
                confidence=round(confidence, 4)
            )

        predictions.append(ReviewPrediction(**aspect_results))

    return predictions
