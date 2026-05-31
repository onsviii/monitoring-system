import re
import spacy
from spacy.language import Language
from spacy.tokens import Span
import pymorphy3
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
_morph = None


@Language.component("morph_person_recognizer")
def morph_person_recognizer(doc):
    """
    Кастомний компонент spaCy, що використовує pymorphy3
    для пошуку імен незалежно від регістру.
    """
    new_ents = list(doc.ents)

    for token in doc:
        if token.is_punct or token.is_space or token.is_stop or token.is_digit:
            continue

        parsed = _morph.parse(token.text)

        # Перевіряємо, чи є хоча б одна форма цього слова іменем/прізвищем
        # 'Name' - ім'я, 'Surn' - прізвище, 'Patr' - по батькові
        is_person = any(
            'Name' in p.tag or 'Surn' in p.tag or 'Patr' in p.tag
            for p in parsed
        )

        if is_person:
            span = Span(doc, token.i, token.i + 1, label="PER")

            # Перевіряємо, щоб нова сутність не накладалася на вже знайдені (напр., стандартним NER)
            if not any(span.start < ent.end and span.end > ent.start for ent in new_ents):
                new_ents.append(span)

    doc.ents = new_ents
    return doc


def _load_ner_model():
    """Ліниве завантаження моделей."""
    global _nlp, _morph
    if _nlp is None:
        logger.info("Завантаження pymorphy3 (український словник)...")
        _morph = pymorphy3.MorphAnalyzer(lang='uk')

        logger.info("Завантаження spaCy uk_core_news_sm...")
        _nlp = spacy.load("uk_core_news_sm")

        # Додаємо наш морфологічний аналізатор ПІСЛЯ стандартного NER.
        _nlp.add_pipe("morph_person_recognizer", after="ner")

        logger.info("spaCy NER + Morph Analyzer завантажені.")
    return _nlp


def _ner_layer(text: str) -> str:
    """Шар 2: маскування імен осіб (NER-мітка PER)."""
    nlp = _load_ner_model()
    doc = nlp(text)

    anonymized = text
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
