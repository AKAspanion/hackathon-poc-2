import {
  Controller,
  Get,
  Post,
  Param,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SuppliersService } from './suppliers.service';
import { CurrentOem } from '../oems/oem.decorator';
import { Oem } from '../database/entities/oem.entity';

@Controller('suppliers')
export class SuppliersController {
  constructor(private readonly suppliersService: SuppliersService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadCsv(
    @CurrentOem() oem: Oem,
    @UploadedFile() file: { buffer: Buffer; originalname?: string } | undefined,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('No file uploaded. Use form field name "file".');
    }
    const result = await this.suppliersService.uploadCsv(
      oem.id,
      file.buffer,
      file.originalname ?? 'upload.csv',
    );
    return result;
  }

  @Get()
  async findAll(@CurrentOem() oem: Oem) {
    const suppliers = await this.suppliersService.findAll(oem.id);
    const riskMap = await this.suppliersService.getRisksBySupplier();

    return suppliers.map((s) => ({
      ...s,
      riskSummary: riskMap.get(s.name) ?? { count: 0, bySeverity: {}, latest: null },
    }));
  }

  @Get(':id')
  async findOne(@CurrentOem() oem: Oem, @Param('id') id: string) {
    const supplier = await this.suppliersService.findOne(id, oem.id);
    if (!supplier) return null;
    const riskMap = await this.suppliersService.getRisksBySupplier();
    return {
      ...supplier,
      riskSummary: riskMap.get(supplier.name) ?? { count: 0, bySeverity: {}, latest: null },
    };
  }
}
