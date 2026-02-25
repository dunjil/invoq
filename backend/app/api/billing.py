"""Stripe billing endpoints."""

import os
from typing import Optional

import stripe
from fastapi import APIRouter, Depends, Request, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import get_session
from app.db.models import User
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/billing", tags=["billing"])

stripe.api_key = settings.stripe_secret_key if hasattr(settings, 'stripe_secret_key') else ""

PRICE_ID = settings.stripe_price_id if hasattr(settings, 'stripe_price_id') else ""


class CheckoutResponse(BaseModel):
    url: Optional[str] = None
    error: Optional[str] = None


class SubscriptionStatus(BaseModel):
    status: str  # "free" | "pro" | "cancelled"
    invoices_this_month: int
    monthly_limit: int
    can_generate: bool


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Create a Stripe checkout session for Pro subscription."""
    if not stripe.api_key or not PRICE_ID:
        return CheckoutResponse(error="Stripe not configured")

    try:
        # Create or reuse Stripe customer
        if not user.stripe_customer_id:
            customer = stripe.Customer.create(
                email=user.email,
                name=user.name,
                metadata={"user_id": user.id},
            )
            user.stripe_customer_id = customer.id
            await session.commit()

        checkout_session = stripe.checkout.Session.create(
            customer=user.stripe_customer_id,
            payment_method_types=["card"],
            line_items=[{"price": PRICE_ID, "quantity": 1}],
            mode="subscription",
            success_url=f"{settings.cors_origins.split(',')[0]}/billing?success=true",
            cancel_url=f"{settings.cors_origins.split(',')[0]}/billing?cancelled=true",
            metadata={"user_id": user.id},
        )

        return CheckoutResponse(url=checkout_session.url)

    except Exception as e:
        return CheckoutResponse(error=str(e))


@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    session: AsyncSession = Depends(get_session),
):
    """Handle Stripe webhook events."""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature", "")
    webhook_secret = settings.stripe_webhook_secret if hasattr(settings, 'stripe_webhook_secret') else ""

    if not webhook_secret:
        return {"status": "webhook secret not configured"}

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    if event["type"] == "checkout.session.completed":
        session_data = event["data"]["object"]
        customer_id = session_data.get("customer")
        subscription_id = session_data.get("subscription")

        # Find user by stripe_customer_id
        from sqlmodel import select
        result = await session.execute(
            select(User).where(User.stripe_customer_id == customer_id)
        )
        user = result.scalar_one_or_none()
        if user:
            user.stripe_subscription_id = subscription_id
            user.subscription_status = "pro"
            await session.commit()

    elif event["type"] in ("customer.subscription.deleted", "customer.subscription.updated"):
        sub_data = event["data"]["object"]
        subscription_id = sub_data.get("id")
        status = sub_data.get("status")

        from sqlmodel import select
        result = await session.execute(
            select(User).where(User.stripe_subscription_id == subscription_id)
        )
        user = result.scalar_one_or_none()
        if user:
            if status in ("canceled", "unpaid", "past_due"):
                user.subscription_status = "free"
            elif status == "active":
                user.subscription_status = "pro"
            await session.commit()

    return {"status": "ok"}


@router.get("/status", response_model=SubscriptionStatus)
async def get_subscription_status(
    user: User = Depends(get_current_user),
):
    """Get current subscription status and usage."""
    from app.services.usage import FREE_MONTHLY_LIMIT

    can_generate = user.subscription_status == "pro" or user.invoices_this_month < FREE_MONTHLY_LIMIT

    return SubscriptionStatus(
        status=user.subscription_status,
        invoices_this_month=user.invoices_this_month,
        monthly_limit=FREE_MONTHLY_LIMIT,
        can_generate=can_generate,
    )
