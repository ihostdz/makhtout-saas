import os
import time
import io
from typing import List, Dict, Any, Optional
from PIL import Image, ImageEnhance, ImageFilter
import numpy as np
import cv2
from app.services.language_service import language_service

# Désactive MKL-DNN/oneDNN qui plante sur certaines configs CPU/VPS
os.environ.setdefault('FLAGS_use_mkldnn', 'False')
os.environ.setdefault('OMP_NUM_THREADS', '1')
os.environ.setdefault('KMP_DUPLICATE_LIB_OK', 'TRUE')


class OCRService:
    def __init__(self):
        self._paddle_ocr = None

    def _get_paddle(self):
        if self._paddle_ocr is None:
            from paddleocr import PaddleOCR
            self._paddle_ocr = PaddleOCR(
                use_angle_cls=True,
                lang="arabic",
                use_gpu=False,
                show_log=False,
            )
        return self._paddle_ocr

    def _preprocess_for_human_mode(self, image: Image.Image) -> np.ndarray:
        """Prétraitement pour améliorer la reconnaissance de manuscrits."""
        img = image.convert("L")
        img = ImageEnhance.Contrast(img).enhance(2.0)
        img = img.filter(ImageFilter.MedianFilter(size=3))
        return np.array(img)

    def _preprocess_arabic(self, image: Image.Image) -> np.ndarray:
        """Prétraitement optimisé pour les manuscrits arabes."""
        img = image.convert("L")

        # Augmenter la résolution si l'image est petite (OCR préfère ~300 DPI)
        width, height = img.size
        min_width = 1200
        if width < min_width:
            ratio = min_width / width
            new_size = (min_width, int(height * ratio))
            img = img.resize(new_size, Image.Resampling.LANCZOS)

        # Renforcement du contraste
        img = ImageEnhance.Contrast(img).enhance(2.2)
        img = ImageEnhance.Sharpness(img).enhance(1.5)

        np_img = np.array(img)

        # Débruitage conservateur
        np_img = cv2.fastNlMeansDenoising(np_img, None, h=10, templateWindowSize=7, searchWindowSize=21)

        # Binarisation adaptative
        np_img = cv2.adaptiveThreshold(
            np_img, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 15, 10
        )

        # Détection d'inversion : si le fond est plus foncé que le texte, inverser
        mean = np.mean(np_img)
        if mean < 127:
            np_img = 255 - np_img

        return np_img

    def _transcribe_with_paddle(self, np_image: np.ndarray):
        result = self._get_paddle().ocr(np_image, cls=True)
        lines = []
        words = []
        confidences = []

        if result and result[0]:
            for line in result[0]:
                bbox, (text, confidence) = line
                lines.append(text)
                confidences.append(float(confidence))
                words.append({
                    "text": text,
                    "confidence": float(confidence),
                    "bbox": bbox,
                })

        return lines, words, confidences

    def _transcribe_with_tesseract(self, image: Image.Image, language_hint: str):
        import pytesseract
        lang = "ara+fra"
        if language_hint == "ar":
            lang = "ara"
        elif language_hint == "fr":
            lang = "fra"

        data = pytesseract.image_to_data(image, lang=lang, output_type=pytesseract.Output.DICT)
        lines = []
        words = []
        confidences = []

        for i, text in enumerate(data["text"]):
            if text.strip():
                conf = float(data["conf"][i]) / 100.0
                words.append({
                    "text": text,
                    "confidence": conf,
                    "bbox": [
                        [data["left"][i], data["top"][i]],
                        [data["left"][i] + data["width"][i], data["top"][i]],
                        [data["left"][i] + data["width"][i], data["top"][i] + data["height"][i]],
                        [data["left"][i], data["top"][i] + data["height"][i]],
                    ],
                })
                confidences.append(conf)

        raw_text = pytesseract.image_to_string(image, lang=lang)
        lines = [l.strip() for l in raw_text.split("\n") if l.strip()]

        return lines, words, confidences

    def _extract_characters(self, words: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Simule l'analyse caractère par caractère à partir des mots."""
        characters = []
        for word in words:
            text = word["text"]
            confidence = word["confidence"]
            for char in text:
                if char.strip():
                    characters.append({
                        "char": char,
                        "confidence": confidence,
                    })
        return characters

    def transcribe(
        self,
        image_bytes: bytes,
        mode: str = "machine",
        language_hint: str = "auto",
    ) -> Dict[str, Any]:
        start = time.time()
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")

        lines = []
        words = []
        confidences = []

        try:
            if language_hint == "ar" or mode in ("human", "letters"):
                np_image = self._preprocess_arabic(image)
            elif mode == "human":
                np_image = self._preprocess_for_human_mode(image)
            else:
                np_image = np.array(image)
            lines, words, confidences = self._transcribe_with_paddle(np_image)
        except Exception as paddle_error:
            try:
                lines, words, confidences = self._transcribe_with_tesseract(image, language_hint)
            except Exception as tesseract_error:
                return {
                    "raw_text": f"[OCR indisponible] PaddleOCR: {paddle_error} | Tesseract: {tesseract_error}",
                    "lines": [],
                    "words": [],
                    "characters": [],
                    "confidence": 0.0,
                    "processing_time_ms": int((time.time() - start) * 1000),
                    "mode": mode,
                }

        raw_text = "\n".join(lines)
        avg_confidence = sum(confidences) / len(confidences) if confidences else 0.0

        # Mode "context" : post-correction NLP
        if mode == "context":
            raw_text = language_service.post_correct(raw_text, language_hint)
            lines = [l.strip() for l in raw_text.split("\n") if l.strip()]

        # Mode "letters" : extraction caractères
        characters = self._extract_characters(words) if mode == "letters" else []

        # Mode "words" : on garde la structure words détaillée
        result_words = words if mode in ("words", "letters", "human", "context") else []

        processing_time_ms = int((time.time() - start) * 1000)

        return {
            "raw_text": raw_text,
            "lines": lines,
            "words": result_words,
            "characters": characters,
            "confidence": round(avg_confidence, 3),
            "processing_time_ms": processing_time_ms,
            "mode": mode,
        }


ocr_service = OCRService()
