import re
from typing import List, Optional


class LanguageService:
    """Service de suggestions et post-correction basé sur des modèles de langue."""

    def __init__(self):
        self._fr_pipeline = None
        self._ar_pipeline = None

    def _detect_language(self, text: str) -> str:
        """Détecte si le texte est principalement arabe ou français."""
        arabic_chars = len(re.findall(r'[\u0600-\u06FF]', text))
        latin_chars = len(re.findall(r'[a-zA-Zàâçéèêëîïôûùüÿñæœ]', text))
        return "ar" if arabic_chars > latin_chars else "fr"

    def _get_pipeline(self, language: str):
        if language == "ar":
            if self._ar_pipeline is None:
                from transformers import pipeline
                self._ar_pipeline = pipeline(
                    "fill-mask",
                    model="UBC-NLP/araBERT",
                    tokenizer="UBC-NLP/araBERT",
                    device=-1,
                )
            return self._ar_pipeline
        else:
            if self._fr_pipeline is None:
                from transformers import pipeline
                self._fr_pipeline = pipeline(
                    "fill-mask",
                    model="camembert-base",
                    tokenizer="camembert-base",
                    device=-1,
                )
            return self._fr_pipeline

    def suggest_words(self, word: str, context: str, top_k: int = 5) -> List[str]:
        """Suggère des corrections pour un mot donné dans son contexte."""
        language = self._detect_language(context + " " + word)
        pipeline = self._get_pipeline(language)

        # Remplace le mot par <mask> dans le contexte
        masked_context = context.replace(word, pipeline.tokenizer.mask_token)

        # Si le mot n'est pas dans le contexte, crée une phrase simple
        if pipeline.tokenizer.mask_token not in masked_context:
            masked_context = f"{context} {pipeline.tokenizer.mask_token}"

        try:
            results = pipeline(masked_context, top_k=top_k)
            suggestions = [r["token_str"].strip() for r in results]
            return list(dict.fromkeys(suggestions))[:top_k]
        except Exception as e:
            print(f"Suggestion error: {e}")
            return []

    def post_correct(self, text: str, language_hint: str = "auto") -> str:
        """Applique une post-correction contextuelle simple au texte."""
        if language_hint == "auto":
            language = self._detect_language(text)
        else:
            language = language_hint

        # Pour l'instant, correction simple : espaces et ponctuation
        corrected = text.strip()

        # Normalisation arabe : suppression des tatweel
        if language == "ar":
            corrected = re.sub(r'\u0640', '', corrected)

        # Correction simple des espaces multiples
        corrected = re.sub(r'\s+', ' ', corrected)

        return corrected


language_service = LanguageService()
