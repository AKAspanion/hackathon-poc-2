/** Scope for agent analysis: OEM's suppliers, locations, and commodities */
export interface OemScope {
  oemId: string;
  oemName: string;
  supplierNames: string[];
  locations: string[];
  cities: string[];
  countries: string[];
  regions: string[];
  commodities: string[];
}
