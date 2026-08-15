import hmac
import hashlib
import uuid
from typing import Optional
import requests
from app.config import get_settings


class ChargilyService:
    """Service d'intégration avec Chargily (sandbox/production).
    
    Documentation : https://dev.chargily.com/
    """

    def __init__(self):
        settings = get_settings()
        self.api_key = getattr(settings, "CHARGILY_API_KEY", None)
        self.secret = getattr(settings, "CHARGILY_SECRET", None)
        self.base_url = getattr(settings, "CHARGILY_BASE_URL", "https://pay.chargily.net/test/api/v2")

    def is_configured(self) -> bool:
        return bool(self.api_key and self.secret)

    def create_checkout(self, amount: float, currency: str, description: str, success_url: str, cancel_url: str, metadata: dict = None) -> dict:
        if not self.is_configured():
            raise RuntimeError("Chargily is not configured")

        payload = {
            "amount": amount,
            "currency": currency,
            "description": description,
            "success_url": success_url,
            "failure_url": cancel_url,
            "client_reference_id": str(uuid.uuid4()),
            "metadata": metadata or {},
        }

        response = requests.post(
            f"{self.base_url}/checkouts",
            json=payload,
            headers={
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            },
            timeout=30,
        )
        response.raise_for_status()
        return response.json()

    def verify_webhook(self, payload: bytes, signature: str) -> bool:
        """Vérifie la signature HMAC-SHA256 du webhook Chargily."""
        if not self.secret:
            return False
        expected = hmac.new(
            self.secret.encode(),
            payload,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)


chargily_service = ChargilyService()
