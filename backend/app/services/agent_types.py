from typing import TypedDict


class OemScope(TypedDict):
    oemId: str
    oemName: str
    supplierNames: list[str]
    locations: list[str]
    cities: list[str]
    countries: list[str]
    regions: list[str]
    commodities: list[str]
