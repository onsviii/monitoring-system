"""
Модуль анонімізації тексту.

Двошарова обробка:
  Шар 1 (RegEx): детерміноване видалення структурованих шаблонів —
    телефонні номери, email, URL.
  Шар 2 (NER): spaCy uk_core_news_sm для маскування імен осіб (PER).

Анонімізація відбувається ДО передачі тексту будь-якому зовнішньому сервісу.
Локальне розгортання NER гарантує, що персональні дані не покидають сервер.
"""

import re
import spacy
import logging

logger = logging.getLogger(__name__)

# ─── Шар 1: RegEx-паттерни ───

# Українські та міжнародні телефонні номери
PHONE_PATTERN = re.compile(
    r'(?:\+?3?8?)?\s*(?:\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2})'
    r'|(?:\+?\d{1,3}[\s\-]?\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{2,4})'
)

# Email-адреси
EMAIL_PATTERN = re.compile(
    r'[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}'
)

# URL (http/https/www)
URL_PATTERN = re.compile(
    r'https?://[^\s<>\"\']+|www\.[^\s<>\"\']+',
    re.IGNORECASE
)

REGEX_PATTERNS = [
    (PHONE_PATTERN, '[ТЕЛЕФОН]'),
    (EMAIL_PATTERN, '[EMAIL]'),
    (URL_PATTERN, '[URL]'),
]


def _regex_layer(text: str) -> str:
    """Шар 1: заміна структурованих паттернів на плейсхолдери."""
    for pattern, placeholder in REGEX_PATTERNS:
        text = pattern.sub(placeholder, text)
    return text


# ─── Шар 2: NER-модель ───

_nlp = None


def _load_ner_model():
    """Ліниве завантаження spaCy-моделі (один раз при першому виклику)."""
    global _nlp
    if _nlp is None:
        logger.info("Завантаження spaCy uk_core_news_sm...")
        _nlp = spacy.load("uk_core_news_sm")
        logger.info("spaCy NER модель завантажена.")
    return _nlp


def _ner_layer(text: str) -> str:
    """Шар 2: маскування імен осіб (NER-мітка PER)."""
    nlp = _load_ner_model()
    doc = nlp(text)
    anonymized = text
    # Заміна з кінця, щоб не зсувати індекси
    for ent in reversed(doc.ents):
        if ent.label_ == "PER":
            anonymized = anonymized[:ent.start_char] + "[ОСОБА]" + anonymized[ent.end_char:]
    return anonymized


# ─── Публічний API ───

def anonymize(text: str) -> str:
    """
    Повний пайплайн анонімізації: RegEx → NER.
    Порядок важливий: RegEx спочатку прибирає шум,
    що може заважати NER-моделі.
    """
    text = _regex_layer(text)
    text = _ner_layer(text)
    return text


def anonymize_batch(texts: list[str]) -> list[str]:
    """Батчева анонімізація для ефективності."""
    return [anonymize(t) for t in texts]
