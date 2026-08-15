import base64
from typing import Optional
import requests
from app.config import get_settings


class PayPalService:
    """Service d'intégration avec PayPal (sandbox/production)."""

    def __init__(self):
        settings = get_settings()
        self.client_id = getattr(settings, "PAYPAL_CLIENT_ID", None)
        self.client_secret = getattr(settings, "PAYPAL_CLIENT_SECRET", None)
        self.base_url = getattr(settings, "PAYPAL_BASE_URL", "https://api-m.sandbox.paypal.com")

    def is_configured(self) -> bool:
        return bool(self.client_id and self.client_secret)

    def _get_access_token(self) -> str:
        credentials = base64.b64encode(f"{self.client_id}:{self.client_secret}".encode()).decode()
        response = requests.post(
            f"{self.base_url}/v1/oauth2/token",
            headers={
                "Authorization": f"Basic {credentials}",
                "Content-Type": "application/x-www-form-urlencoded",
            },
            data="grant_type=client_credentials",
            timeout=30,
        )
        response.raise_for_status()
        return response.json()["access_token"]

    def create_subscription_plan(self, name: str, price: float, currency: str = "USD", interval_unit: str = "MONTH") -> dict:
        """Crée un plan d'abonnement PayPal."""
        access_token = self._get_access_token()

        # 1. Créer le produit
        product_response = requests.post(
            f"{self.base_url}/v1/catalogs/products",
            json={
                "name": name,
                "type": "DIGITAL",
                "category": "SOFTWARE",
            },
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            timeout=30,
        )
        product_response.raise_for_status()
        product_id = product_response.json()["id"]

        # 2. Créer le plan
        plan_response = requests.post(
            f"{self.base_url}/v1/billing/plans",
            json={
                "product_id": product_id,
                "name": name,
                "billing_cycles": [
                    {
                        "frequency": {"interval_unit": interval_unit, "interval_count": 1},
                        "tenure_type": "REGULAR",
                        "sequence": 1,
                        "total_cycles": 0,
                        "pricing_scheme": {
                            "fixed_price": {"value": str(price), "currency_code": currency},
                        },
                    }
                ],
                "payment_preferences": {
                    "auto_bill_outstanding": True,
                    "setup_fee_failure_action": "CONTINUE",
                    "payment_failure_threshold": 3,
                },
            },
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            timeout=30,
        )
        plan_response.raise_for_status()
        return plan_response.json()

    def create_subscription(self, plan_id: str, user_email: str, return_url: str, cancel_url: str) -> dict:
        """Crée un abonnement PayPal pour un utilisateur."""
        access_token = self._get_access_token()

        response = requests.post(
            f"{self.base_url}/v1/billing/subscriptions",
            json={
                "plan_id": plan_id,
                "subscriber": {
                    "email_address": user_email,
                },
                "application_context": {
                    "brand_name": "Makhtout",
                    "locale": "fr-FR",
                    "shipping_preference": "NO_SHIPPING",
                    "user_action": "SUBSCRIBE_NOW",
                    "return_url": return_url,
                    "cancel_url": cancel_url,
                },
            },
            headers={
                "Authorization": f"Bearer {access_token}",
                "Content-Type": "application/json",
            },
            timeout=30,
        )
        response.raise_for_status()
        return response.json()

    def verify_webhook(self, headers: dict, body: str) -> bool:
        """Vérifie la signature du webhook PayPal."""
        # Implémentation simplifiée — à remplacer par la vraie vérification
        return True


paypal_service = PayPalService()
