"""Contract and NDA generation and tracking endpoints."""

import os
import uuid
import json
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete

from app.db.session import get_session
from app.db.models import User, Contract, ContractComment, Quote, Invoice
from app.api.deps import get_optional_user, get_current_user

# Note: PDF generation template imports will be added later
# from app.api.invoice import generate_invoice_html, InvoiceRequest...
# from weasyprint import HTML

router = APIRouter(prefix="/api/contracts", tags=["contracts"])


class ContractCreateRequest(BaseModel):
    title: str = "Agreement"
    type: str = "contract" # contract, nda, msa, sow
    contract_number: str
    effective_date: Optional[str] = None
    expiry_date: Optional[str] = None
    
    from_name: str
    to_name: str
    
    body_text: str = ""
    notes: Optional[str] = None


@router.post("")
async def create_contract(
    data: ContractCreateRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Save a new contract/NDA and generate a tracking token."""
    new_contract = Contract(
        user_id=user.id,
        status="sent",
        type=data.type,
        contract_number=data.contract_number,
        title=data.title,
        effective_date=data.effective_date,
        expiry_date=data.expiry_date,
        from_name=data.from_name,
        to_name=data.to_name,
        body_text=data.body_text,
        notes=data.notes,
        sent_at=datetime.utcnow()
    )
    session.add(new_contract)
    await session.commit()
    await session.refresh(new_contract)

    return {
        "success": True,
        "contract_id": new_contract.id,
        "tracked_link_token": new_contract.tracked_link_token
    }


@router.get("/track/{token}")
async def get_contract_by_token(
    token: str,
    session: AsyncSession = Depends(get_session),
):
    """Public endpoint for clients to view a contract by its tracked URL loop."""
    result = await session.execute(select(Contract).where(Contract.tracked_link_token == token))
    contract = result.scalars().first()
    
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
        
    # Mark as viewed if first time
    if not contract.viewed_at:
        contract.viewed_at = datetime.utcnow()
        contract.status = "viewed"
        await session.commit()

    return {
        "success": True,
        "contract": contract,
    }

@router.put("/{token}")
async def update_contract(
    token: str,
    data: ContractCreateRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Edit the entire contract document dynamically."""
    result = await session.execute(select(Contract).where(Contract.tracked_link_token == token))
    contract = result.scalars().first()
    
    if not contract or contract.user_id != user.id:
        raise HTTPException(status_code=404, detail="Contract not found")
        
    contract.title = data.title
    contract.type = data.type
    contract.contract_number = data.contract_number
    contract.effective_date = data.effective_date
    contract.expiry_date = data.expiry_date
    contract.from_name = data.from_name
    contract.to_name = data.to_name
    contract.body_text = data.body_text
    contract.notes = data.notes

    await session.commit()
    return {"success": True, "message": "Contract updated"}


class ContractApproveRequest(BaseModel):
    signature_data: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


@router.post("/{token}/approve")
async def approve_contract(
    token: str,
    data: ContractApproveRequest,
    session: AsyncSession = Depends(get_session),
):
    """Client approves and signs the contract or NDA."""
    result = await session.execute(select(Contract).where(Contract.tracked_link_token == token))
    contract = result.scalars().first()
    
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
        
    if contract.status in ["approved", "signed"]:
        return {"success": False, "error": "Contract already approved"}

    contract.status = "signed"
    contract.approved_at = datetime.utcnow()
    
    if data.signature_data:
        contract.signed_at = datetime.utcnow()
        contract.client_signature_data = data.signature_data
        contract.signer_ip_address = data.ip_address
        contract.signer_user_agent = data.user_agent
    
    await session.commit()

    return {
        "success": True,
        "message": "Contract signed and approved securely.",
        "contract_id": contract.id
    }

class ContractCommentRequest(BaseModel):
    author_name: str
    body: str
    author_role: str = "client"

@router.post("/{token}/comments")
async def add_contract_comment(
    token: str,
    data: ContractCommentRequest,
    session: AsyncSession = Depends(get_session),
):
    """Add a comment/correction request to the contract."""
    result = await session.execute(select(Contract).where(Contract.tracked_link_token == token))
    contract = result.scalars().first()
    
    if not contract:
        raise HTTPException(status_code=404, detail="Contract not found")
        
    comment = ContractComment(
        contract_id=contract.id,
        author_id="anonymous_client" if data.author_role == "client" else contract.user_id,
        author_name=data.author_name,
        author_role=data.author_role,
        body=data.body
    )
    session.add(comment)
    
    if data.author_role == "client":
        contract.status = "needs_revision"
        
    await session.commit()
    return {"success": True, "message": "Comment added successfully."}
