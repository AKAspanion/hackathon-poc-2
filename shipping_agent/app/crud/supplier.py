from typing import List, Optional

from sqlalchemy.orm import Session

from .. import models
from ..schemas.supplier import SupplierCreate, SupplierUpdate


def create_supplier(db: Session, supplier_in: SupplierCreate) -> models.supplier.Supplier:
    supplier = models.supplier.Supplier(**supplier_in.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


def get_supplier(db: Session, supplier_id: int) -> Optional[models.supplier.Supplier]:
    return db.query(models.supplier.Supplier).filter(models.supplier.Supplier.id == supplier_id).first()


def get_suppliers(db: Session, skip: int = 0, limit: int = 100) -> List[models.supplier.Supplier]:
    return db.query(models.supplier.Supplier).offset(skip).limit(limit).all()


def update_supplier(
    db: Session, supplier: models.supplier.Supplier, supplier_in: SupplierUpdate
) -> models.supplier.Supplier:
    data = supplier_in.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(supplier, field, value)
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


def delete_supplier(db: Session, supplier: models.supplier.Supplier) -> None:
    db.delete(supplier)
    db.commit()
