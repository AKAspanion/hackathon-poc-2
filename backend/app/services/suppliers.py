import csv
import io
from uuid import UUID
from sqlalchemy.orm import Session

from app.models.supplier import Supplier
from app.models.risk import Risk


def _parse_csv_line(line: str) -> list[str]:
    result = []
    current = ""
    in_quotes = False
    for i, ch in enumerate(line):
        if ch == '"':
            in_quotes = not in_quotes
        elif ch == "," and not in_quotes:
            result.append(current.strip())
            current = ""
        else:
            current += ch
    result.append(current.strip())
    return result


def _normalize_header(h: str) -> str:
    return h.strip().lower().replace(" ", "_")


def upload_csv(
    db: Session, oem_id: UUID, content: bytes, filename: str = "upload.csv"
) -> dict:
    text = content.decode("utf-8")
    lines = [line for line in text.splitlines() if line.strip()]
    if len(lines) < 2:
        return {"created": 0, "errors": ["CSV must have a header row and at least one data row."]}

    headers = _parse_csv_line(lines[0])
    header_index = {}
    for i, h in enumerate(headers):
        key = _normalize_header(h)
        if key not in header_index:
            header_index[key] = i

    name_idx = header_index.get("name") or header_index.get("supplier_name") or header_index.get("supplier") or 0
    errors = []
    created = 0

    for row_num in range(1, len(lines)):
        values = _parse_csv_line(lines[row_num])
        if len(values) < 1 or not values[name_idx]:
            continue

        metadata = {}
        name = ""
        location = city = country = region = commodities = None

        for i, header in enumerate(headers):
            key = _normalize_header(header)
            value = values[i] if i < len(values) else ""
            if key in ("name", "supplier_name", "supplier"):
                name = value
            elif key in ("location", "address"):
                location = value or None
            elif key == "city":
                city = value or None
            elif key == "country":
                country = value or None
            elif key == "region":
                region = value or None
            elif key in ("commodities", "commodity"):
                commodities = value or None
            else:
                metadata[header.strip()] = value

        if not name:
            errors.append(f"Row {row_num + 1}: missing name.")
            continue

        try:
            supp = Supplier(
                oemId=oem_id,
                name=name,
                location=location,
                city=city,
                country=country,
                region=region,
                commodities=commodities,
                metadata_=metadata if metadata else None,
            )
            db.add(supp)
            db.commit()
            created += 1
        except Exception as e:
            db.rollback()
            errors.append(f"Row {row_num + 1}: {e}")

    return {"created": created, "errors": errors}


def get_all(db: Session, oem_id: UUID) -> list[Supplier]:
    return (
        db.query(Supplier)
        .filter(Supplier.oemId == oem_id)
        .order_by(Supplier.createdAt.desc())
        .all()
    )


def get_one(db: Session, id: UUID, oem_id: UUID) -> Supplier | None:
    return db.query(Supplier).filter(Supplier.id == id, Supplier.oemId == oem_id).first()


def get_risks_by_supplier(db: Session) -> dict:
    risks = (
        db.query(Risk.id, Risk.title, Risk.severity, Risk.affectedSupplier, Risk.createdAt)
        .order_by(Risk.createdAt.desc())
        .all()
    )
    out = {}
    for r in risks:
        key = (r.affectedSupplier or "").strip()
        if not key:
            continue
        if key not in out:
            out[key] = {"count": 0, "bySeverity": {}, "latest": None}
        out[key]["count"] += 1
        sev = str(r.severity.value if hasattr(r.severity, "value") else r.severity)
        out[key]["bySeverity"][sev] = out[key]["bySeverity"].get(sev, 0) + 1
        if out[key]["latest"] is None:
            out[key]["latest"] = {
                "id": str(r.id),
                "severity": sev,
                "title": r.title,
            }
    return out
