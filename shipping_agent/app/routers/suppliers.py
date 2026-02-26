from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import models
from ..crud import supplier as supplier_crud
from ..database import get_db
from ..schemas.supplier import SupplierCreate, SupplierOut, SupplierUpdate

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


@router.post("/", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
def create_supplier(
    supplier_in: SupplierCreate,
    db: Session = Depends(get_db),
) -> models.supplier.Supplier:
    return supplier_crud.create_supplier(db=db, supplier_in=supplier_in)


@router.get("/", response_model=List[SupplierOut])
def list_suppliers(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
) -> List[models.supplier.Supplier]:
    return supplier_crud.get_suppliers(db=db, skip=skip, limit=limit)


@router.get("/{supplier_id}", response_model=SupplierOut)
def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
) -> models.supplier.Supplier:
    supplier = supplier_crud.get_supplier(db=db, supplier_id=supplier_id)
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    return supplier


@router.put("/{supplier_id}", response_model=SupplierOut)
def update_supplier(
    supplier_id: int,
    supplier_in: SupplierUpdate,
    db: Session = Depends(get_db),
) -> models.supplier.Supplier:
    supplier = supplier_crud.get_supplier(db=db, supplier_id=supplier_id)
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    return supplier_crud.update_supplier(db=db, supplier=supplier, supplier_in=supplier_in)


@router.delete("/{supplier_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
) -> None:
    supplier = supplier_crud.get_supplier(db=db, supplier_id=supplier_id)
    if not supplier:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    supplier_crud.delete_supplier(db=db, supplier=supplier)
    return None
