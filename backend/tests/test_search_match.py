import unittest

from app.services.search_match import document_matches, is_close, normalized


class SearchMatchTests(unittest.TestCase):
    def test_normalizes_accents_and_case(self):
        self.assertEqual(normalized("CÁlculo-I"), "calculo i")

    def test_matches_small_typo(self):
        self.assertTrue(is_close("caluco", "Cálculo I"))

    def test_does_not_match_unrelated_word(self):
        self.assertFalse(document_matches("caluco", ["Programación", "Física I"]))
