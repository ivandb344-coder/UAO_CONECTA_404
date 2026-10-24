"""Small, dependency-free helpers for tolerant global search."""

from __future__ import annotations

import re
import unicodedata
from typing import Iterable


def normalized(value: object) -> str:
    """Lowercase text without accents and with collapsed punctuation."""
    plain = unicodedata.normalize("NFKD", str(value or ""))
    plain = "".join(char for char in plain if not unicodedata.combining(char))
    return re.sub(r"[^a-z0-9]+", " ", plain.lower()).strip()


def edit_distance(left: str, right: str) -> int:
    """Levenshtein distance with a small memory footprint."""
    if len(left) < len(right):
        left, right = right, left
    if not right:
        return len(left)
    previous = list(range(len(right) + 1))
    for index, left_char in enumerate(left, start=1):
        current = [index]
        for right_index, right_char in enumerate(right, start=1):
            current.append(min(
                current[-1] + 1,
                previous[right_index] + 1,
                previous[right_index - 1] + (left_char != right_char),
            ))
        previous = current
    return previous[-1]


def is_close(query: str, candidate: object) -> bool:
    """Match a word with a predictable typo tolerance, accent-insensitively."""
    needle = normalized(query)
    if len(needle) < 3:
        return False
    for word in normalized(candidate).split():
        if needle in word or word in needle:
            return True
        # A six-letter term such as "caluco" can still find "calculo".
        allowance = 1 if len(needle) <= 4 else 2 if len(needle) <= 6 else 3
        if abs(len(needle) - len(word)) <= allowance and edit_distance(needle, word) <= allowance:
            return True
    return False


def document_matches(query: str, values: Iterable[object]) -> bool:
    return any(is_close(query, value) for value in values)
