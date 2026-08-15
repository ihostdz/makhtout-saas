from typing import List
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.config import get_settings
from app.database import get_db
from app.dependencies import get_current_user
from app.models import User, Plan
from app.schemas import (
    PlanResponse,
    BillingInfoResponse,
    CheckoutRequest,
    CheckoutResponse,
    ManualPaymentRequest,
    ManualPaymentResponse,
)
from app.services.billing_service import BillingService
from app.services.chargily_service import chargily_service
from app.services.paypal_service import paypal_service

router = APIRouter()


@router.get("/plans", response_model=List[PlanResponse])
def list_plans(db: Session = Depends(get_db)):
    billing = BillingService(db)
    billing.seed_plans()
    return db.query(Plan).filter(Plan.is_active == True).order_by(Plan.price_da).all()


@router.get("/info", response_model=BillingInfoResponse)
def billing_info(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    billing = BillingService(db)
    billing.seed_plans()
    sub, plan = billing.get_user_plan(current_user.id)
    used = billing.get_pages_used_this_month(current_user.id)
    limit = plan.pages_per_month

    return {
        "user": current_user,
        "subscription": sub,
        "plan": plan,
        "pages_used_this_month": used,
        "pages_limit": limit,
        "remaining_pages": max(0, limit - used),
    }


@router.post("/checkout", response_model=CheckoutResponse)
def create_checkout(
    request: CheckoutRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    billing = BillingService(db)
    billing.seed_plans()

    plan = db.query(Plan).filter(Plan.slug == request.plan_slug, Plan.is_active == True).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    settings = get_settings()
    success_url = request.success_url or f"{settings.FRONTEND_URL}/billing?success=1"
    cancel_url = request.cancel_url or f"{settings.FRONTEND_URL}/pricing?canceled=1"

    if request.provider == "chargily":
        if not chargily_service.is_configured():
            raise HTTPException(status_code=400, detail="Chargily is not configured")

        currency = "DZD" if plan.price_da else "USD"
        amount = plan.price_da or plan.price_usd or 0

        try:
            checkout = chargily_service.create_checkout(
                amount=float(amount),
                currency=currency,
                description=f"Abonnement {plan.name_fr}",
                success_url=success_url,
                cancel_url=cancel_url,
                metadata={
                    "user_id": current_user.id,
                    "plan_id": plan.id,
                    "plan_slug": plan.slug,
                },
            )
            payment = billing.create_payment(
                user_id=current_user.id,
                plan_id=plan.id,
                amount=float(amount),
                currency=currency,
                provider="chargily",
                metadata={"checkout_id": checkout.get("id")},
            )
            return {
                "checkout_url": checkout.get("checkout_url"),
                "order_id": payment.id,
                "message": "Redirect to Chargily checkout",
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Chargily checkout failed: {str(e)}")

    elif request.provider == "paypal":
        if not paypal_service.is_configured():
            raise HTTPException(status_code=400, detail="PayPal is not configured")

        try:
            paypal_plan = paypal_service.create_subscription_plan(
                name=plan.name_fr,
                price=plan.price_usd or 0,
                currency="USD",
                interval_unit="MONTH" if plan.billing_interval == "month" else "YEAR",
            )
            subscription = paypal_service.create_subscription(
                plan_id=paypal_plan["id"],
                user_email=current_user.email,
                return_url=success_url,
                cancel_url=cancel_url,
            )
            payment = billing.create_payment(
                user_id=current_user.id,
                plan_id=plan.id,
                amount=plan.price_usd or 0,
                currency="USD",
                provider="paypal",
                metadata={"paypal_subscription_id": subscription.get("id")},
            )
            return {
                "checkout_url": subscription.get("links", [{}])[0].get("href"),
                "order_id": payment.id,
                "message": "Redirect to PayPal subscription",
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"PayPal checkout failed: {str(e)}")

    raise HTTPException(status_code=400, detail="Unsupported payment provider")


@router.post("/manual-payment", response_model=ManualPaymentResponse)
def submit_manual_payment(
    request: ManualPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    billing = BillingService(db)
    billing.seed_plans()

    plan = db.query(Plan).filter(Plan.slug == request.plan_slug, Plan.is_active == True).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    payment = billing.create_payment(
        user_id=current_user.id,
        plan_id=plan.id,
        amount=request.amount,
        currency=request.currency,
        provider="manual",
        metadata={
            "reference": request.reference,
            "notes": request.notes,
        },
    )

    return {
        "id": payment.id,
        "status": "pending",
        "message": "Votre paiement sera validé sous 24h par notre équipe.",
    }


@router.post("/webhook/chargily")
async def chargily_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()

    signature = request.headers.get("signature", "")
    if not chargily_service.verify_webhook(body, signature):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        import json
        data = json.loads(body.decode())
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event = data.get("event")
    metadata = data.get("metadata", {})
    user_id = metadata.get("user_id")
    plan_id = metadata.get("plan_id")

    if event == "checkout.paid" and user_id and plan_id:
        billing = BillingService(db)
        billing.activate_subscription(
            user_id=user_id,
            plan_id=plan_id,
            provider="chargily",
            provider_subscription_id=data.get("data", {}).get("id"),
            duration_months=1,
        )

    return {"status": "ok"}


@router.post("/webhook/paypal")
async def paypal_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()

    headers = dict(request.headers)
    if not paypal_service.verify_webhook(headers, body.decode()):
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    try:
        import json
        data = json.loads(body.decode())
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON")

    event_type = data.get("event_type")
    resource = data.get("resource", {})

    if event_type == "BILLING.SUBSCRIPTION.ACTIVATED":
        subscription_id = resource.get("id")
        from app.models import Payment
        payment = db.query(Payment).filter(
            Payment.provider == "paypal",
            Payment.metadata.contains({"paypal_subscription_id": subscription_id}),
        ).first()
        if payment:
            billing = BillingService(db)
            billing.activate_subscription(
                user_id=payment.user_id,
                plan_id=payment.plan_id,
                provider="paypal",
                provider_subscription_id=subscription_id,
                duration_months=1,
            )

    return {"status": "ok"}
