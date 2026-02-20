import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from '../database/entities/supplier.entity';
import { Risk } from '../database/entities/risk.entity';

/** Parse a single CSV line respecting double-quoted fields */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

const KNOWN_COLUMNS = [
  'name',
  'location',
  'city',
  'country',
  'region',
  'commodities',
  'commodity',
] as const;

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/\s+/g, '_');
}

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>,
    @InjectRepository(Risk)
    private riskRepository: Repository<Risk>,
  ) {}

  async uploadCsv(
    oemId: string,
    buffer: Buffer,
    filename: string,
  ): Promise<{ created: number; errors: string[] }> {
    const text = buffer.toString('utf-8');
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) {
      return { created: 0, errors: ['CSV must have a header row and at least one data row.'] };
    }

    const headers = parseCsvLine(lines[0]);
    const headerIndex: Record<string, number> = {};
    headers.forEach((h, i) => {
      const key = normalizeHeader(h);
      if (!headerIndex[key]) headerIndex[key] = i;
    });

    const nameIdx =
      headerIndex['name'] ??
      headerIndex['supplier_name'] ??
      headerIndex['supplier'] ??
      0;

    const errors: string[] = [];
    let created = 0;

    for (let rowNum = 1; rowNum < lines.length; rowNum++) {
      const values = parseCsvLine(lines[rowNum]);
      if (values.length < 1 || !values[nameIdx]) continue;

      const metadata: Record<string, string> = {};
      let name = '';
      let location: string | null = null;
      let city: string | null = null;
      let country: string | null = null;
      let region: string | null = null;
      let commodities: string | null = null;

      headers.forEach((header, i) => {
        const key = normalizeHeader(header);
        const value = values[i] ?? '';
        if (key === 'name' || key === 'supplier_name' || key === 'supplier') {
          name = value;
        } else if (key === 'location' || key === 'address') {
          location = value || null;
        } else if (key === 'city') {
          city = value || null;
        } else if (key === 'country') {
          country = value || null;
        } else if (key === 'region') {
          region = value || null;
        } else if (key === 'commodities' || key === 'commodity') {
          commodities = value || null;
        } else {
          metadata[header.trim()] = value;
        }
      });

      if (!name) {
        errors.push(`Row ${rowNum + 1}: missing name.`);
        continue;
      }

      try {
        await this.supplierRepository.save(
          this.supplierRepository.create({
            oemId,
            name,
            location: location ?? undefined,
            city: city ?? undefined,
            country: country ?? undefined,
            region: region ?? undefined,
            commodities: commodities ?? undefined,
            metadata: Object.keys(metadata).length ? metadata : undefined,
          }),
        );
        created++;
      } catch (err) {
        errors.push(`Row ${rowNum + 1}: ${err instanceof Error ? err.message : 'Failed to save'}`);
      }
    }

    return { created, errors };
  }

  async findAll(oemId: string): Promise<Supplier[]> {
    return this.supplierRepository.find({
      where: { oemId },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, oemId: string): Promise<Supplier | null> {
    return this.supplierRepository.findOne({ where: { id, oemId } });
  }

  /** Get risk summary per supplier (by affectedSupplier matching supplier name) */
  async getRisksBySupplier(): Promise<Map<string, { count: number; bySeverity: Record<string, number>; latest: { id: string; severity: string; title: string } | null }>> {
    const risks = await this.riskRepository.find({
      where: {},
      order: { createdAt: 'DESC' },
      select: ['id', 'title', 'severity', 'affectedSupplier', 'createdAt'],
    });

    const map = new Map<string, { count: number; bySeverity: Record<string, number>; latest: { id: string; severity: string; title: string } | null }>();

    for (const risk of risks) {
      const key = (risk.affectedSupplier || '').trim();
      if (!key) continue;

      if (!map.has(key)) {
        map.set(key, { count: 0, bySeverity: {}, latest: null });
      }
      const entry = map.get(key)!;
      entry.count++;
      entry.bySeverity[risk.severity] = (entry.bySeverity[risk.severity] || 0) + 1;
      if (!entry.latest) {
        entry.latest = { id: risk.id, severity: risk.severity, title: risk.title };
      }
    }

    return map;
  }
}
