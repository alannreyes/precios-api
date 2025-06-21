import { Controller, Get, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { AuthGuard } from './auth/auth.guard';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Ruta pública para health check (sin autenticación)
  @Get('health')
  getHealth(): object {
    return { 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'precios-api'
    };
  }

  // Ruta protegida con API Key
  @Get()
  @UseGuards(AuthGuard)
  getHello(): string {
    return this.appService.getHello();
  }
}
