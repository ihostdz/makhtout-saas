from datetime import datetime, timedelta
from calendar import monthrange
from typing import Optional, Tuple
from sqlalchemy.orm import Session
from app.models import User, Plan, Subscription, Payment, UsageLog


DEFAULT_PLANS = [
    {
        "slug": "free",
        "name_fr": "Découverte",
        "name_ar": "اكتشاف",
        "description_fr": "Pour tester Makhtout",
        "description_ar": "لاختبار مخطوط",
        "price_da": 0,
        "price_usd": 0.0,
        "billing_interval": None,
        "pages_per_month": 10,
        "features": ["10 pages/mois", "Mode Machine", "Export TXT"],
    },
    {
        "slug": "pro_monthly",
        "name_fr": "Pro Mensuel",
        "name_ar": "احترافي شهري",
        "description_fr": "Pour les indépendants et petites structures",
        "description_ar": "للمستقلين والهياكل الصغيرة",
        "price_da": 2900,
        "price_usd": 19.0,
        "billing_interval": "month",
        "pages_per_month": 200,
        "features": ["200 pages/mois", "Tous les modes IA", "Export PDF/DOCX", "Correction collaborative"],
    },
    {
        "slug": "pro_yearly",
        "name_fr": "Pro Annuel",
        "name_ar": "احترافي سنوي",
        "description_fr": "2 mois offerts",
        "description_ar": "شهران مجاناً",
        "price_da": 29000,
        "price_usd": 190.0,
        "billing_interval": "year",
        "pages_per_month": 200,
        "features": ["200 pages/mois", "Tous les modes IA", "Export PDF/DOCX", "Correction collaborative", "-17%"],
    },
    {
        "slug": "enterprise",
        "name_fr": "Entreprise",
        "name_ar": "مؤسسات",
        "description_fr": "Pour administrations et grandes structures",
        "description_ar": "للإدارات والهياكل الكبيرة",
        "price_da": None,
        "price_usd": None,
        "billing_interval": None,
        "pages_per_month": 10000,
        "features": ["Pages illimitées", "API REST", "Déploiement on-premise", "Support prioritaire"],
    },
]


class BillingService:
    def __init__(self, db: Session):
        self.db = db

    def seed_plans(self):
        """Crée les plans par défaut s'ils n'existent pas."""
        for plan_data in DEFAULT_PLANS:
            existing = self.db.query(Plan).filter(Plan.slug == plan_data["slug"]).first()
            if not existing:
                plan = Plan(**plan_data)
                self.db.add(plan)
        self.db.commit()

    def get_or_create_free_subscription(self, user_id: str) -> Subscription:
        """Assure que l'utilisateur a un abonnement gratuit actif."""
        sub = self.db.query(Subscription).filter(Subscription.user_id == user_id).first()
        if sub:
            return sub

        free_plan = self.db.query(Plan).filter(Plan.slug == "free").first()
        if not free_plan:
            self.seed_plans()
            free_plan = self.db.query(Plan).filter(Plan.slug == "free").first()

        sub = Subscription(
            user_id=user_id,
            plan_id=free_plan.id,
            status="active",
            payment_provider="none",
        )
        self.db.add(sub)
        self.db.commit()
        self.db.refresh(sub)
        return sub

    def get_user_plan(self, user_id: str) -> Tuple[Subscription, Plan]:
        sub = self.get_or_create_free_subscription(user_id)
        plan = self.db.query(Plan).filter(Plan.id == sub.plan_id).first()
        return sub, plan

    def get_pages_used_this_month(self, user_id: str) -> int:
        now = datetime.utcnow()
        start_of_month = datetime(now.year, now.month, 1)
        _, last_day = monthrange(now.year, now.month)
        end_of_month = datetime(now.year, now.month, last_day, 23, 59, 59)

        total = (
            self.db.query(UsageLog)
            .filter(
                UsageLog.user_id == user_id,
                UsageLog.action == "ocr_process",
                UsageLog.created_at >= start_of_month,
                UsageLog.created_at <= end_of_month,
            )
            .count()
        )
        return total

    def can_process_ocr(self, user_id: str) -> Tuple[bool, int, int]:
        """Vérifie si l'utilisateur peut encore traiter des pages ce mois-ci."""
        sub, plan = self.get_user_plan(user_id)
        if sub.status != "active":
            return False, 0, 0

        used = self.get_pages_used_this_month(user_id)
        limit = plan.pages_per_month
        return used < limit, used, limit

    def log_ocr_usage(self, user_id: str, document_id: str, pages_count: int = 1):
        log = UsageLog(
            user_id=user_id,
            document_id=document_id,
            action="ocr_process",
            pages_count=pages_count,
        )
        self.db.add(log)
        self.db.commit()

    def create_payment(self, user_id: str, plan_id: str, amount: float, currency: str, provider: str, payment_metadata: dict = None) -> Payment:
        payment = Payment(
            user_id=user_id,
            plan_id=plan_id,
            amount=amount,
            currency=currency,
            provider=provider,
            payment_metadata=payment_metadata or {},
        )
        self.db.add(payment)
        self.db.commit()
        self.db.refresh(payment)
        return payment

    def activate_subscription(self, user_id: str, plan_id: str, provider: str, provider_subscription_id: Optional[str] = None, duration_months: int = 1):
        plan = self.db.query(Plan).filter(Plan.id == plan_id).first()
        if not plan:
            raise ValueError("Plan not found")

        existing = self.db.query(Subscription).filter(Subscription.user_id == user_id).first()
        if existing:
            existing.plan_id = plan_id
            existing.status = "active"
            existing.payment_provider = provider
            existing.provider_subscription_id = provider_subscription_id
            existing.started_at = datetime.utcnow()
            existing.expires_at = datetime.utcnow() + timedelta(days=30 * duration_months)
            existing.updated_at = datetime.utcnow()
            self.db.commit()
            self.db.refresh(existing)
            return existing

        sub = Subscription(
            user_id=user_id,
            plan_id=plan_id,
            status="active",
            payment_provider=provider,
            provider_subscription_id=provider_subscription_id,
            started_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=30 * duration_months),
        )
        self.db.add(sub)
        self.db.commit()
        self.db.refresh(sub)
        return sub
