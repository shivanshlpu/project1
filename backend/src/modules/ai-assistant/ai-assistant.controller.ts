import { Controller, Post, Body, Res, UseGuards } from '@nestjs/common';
import { AiAssistantService, QueryAiDto } from './ai-assistant.service';
import { Response } from 'express';

@Controller('api/ai')
export class AiAssistantController {
  constructor(private readonly aiService: AiAssistantService) {}

  @Post('query')
  async handleQuery(@Body() body: QueryAiDto) {
    return this.aiService.processQuery(body);
  }

  @Post('export/excel')
  async exportExcel(@Body() body: { dateRange?: { start?: string; end?: string } }, @Res() res: Response) {
    const buffer = await this.aiService.generateExcelReport(body.dateRange);
    const filename = `Ahtri_FFA_Report_${new Date().toISOString().split('T')[0]}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(buffer);
  }

  @Post('export/pdf')
  async exportPdf(@Body() body: { dateRange?: { start?: string; end?: string } }, @Res() res: Response) {
    const html = await this.aiService.generatePdfReportHtml(body.dateRange);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }
}
