"""Saved Clients address book endpoints."""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import desc

from app.db.session import get_session
from app.db.models import User, SavedClient
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/clients/saved", tags=["saved-clients"])

class SavedClientCreate(BaseModel):
    name: str
    email: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None

class SavedClientResponse(BaseModel):
    id: str
    name: str
    email: Optional[str]
    address: Optional[str]
    phone: Optional[str]
    created_at: str
    updated_at: str

@router.get("", response_model=List[SavedClientResponse])
async def list_saved_clients(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """List all saved clients for the current user."""
    result = await session.execute(
        select(SavedClient)
        .where(SavedClient.user_id == user.id)
        .order_by(desc(SavedClient.created_at))
    )
    clients = result.scalars().all()
    
    return [
        SavedClientResponse(
            id=c.id,
            name=c.name,
            email=c.email,
            address=c.address,
            phone=c.phone,
            created_at=c.created_at.isoformat(),
            updated_at=c.updated_at.isoformat()
        )
        for c in clients
    ]

@router.post("", response_model=SavedClientResponse)
async def create_saved_client(
    data: SavedClientCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Save a new client to the address book."""
    
    # Check if a client with EXACT same name exists to heavily prevent spamming duplicates if user presses save multiple times
    existing = await session.execute(
        select(SavedClient)
        .where(SavedClient.user_id == user.id)
        .where(SavedClient.name == data.name)
    )
    if existing.scalars().first():
        raise HTTPException(status_code=400, detail="A client with this name already exists in your address book.")
    
    new_client = SavedClient(
        user_id=user.id,
        name=data.name,
        email=data.email,
        address=data.address,
        phone=data.phone
    )
    
    session.add(new_client)
    await session.commit()
    await session.refresh(new_client)
    
    return SavedClientResponse(
        id=new_client.id,
        name=new_client.name,
        email=new_client.email,
        address=new_client.address,
        phone=new_client.phone,
        created_at=new_client.created_at.isoformat(),
        updated_at=new_client.updated_at.isoformat()
    )
@router.put("/{client_id}", response_model=SavedClientResponse)
async def update_saved_client(
    client_id: str,
    data: SavedClientCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Update an existing client record."""
    result = await session.execute(
        select(SavedClient).where(SavedClient.id == client_id, SavedClient.user_id == user.id)
    )
    client = result.scalars().first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
    
    client.name = data.name
    client.email = data.email
    client.address = data.address
    client.phone = data.phone
    
    session.add(client)
    await session.commit()
    await session.refresh(client)
    
    return SavedClientResponse(
        id=client.id,
        name=client.name,
        email=client.email,
        address=client.address,
        phone=client.phone,
        created_at=client.created_at.isoformat(),
        updated_at=client.updated_at.isoformat()
    )

@router.delete("/{client_id}")
async def delete_saved_client(
    client_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Remove a client from the address book."""
    result = await session.execute(
        select(SavedClient).where(SavedClient.id == client_id, SavedClient.user_id == user.id)
    )
    client = result.scalars().first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")
        
    await session.delete(client)
    await session.commit()
    return {"success": True, "message": "Client deleted"}
