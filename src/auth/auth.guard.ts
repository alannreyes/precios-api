import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class AuthGuard implements CanActivate {
  // API Keys válidas (en producción, estas deberían estar en variables de entorno)
  private readonly validApiKeys = [
    process.env.FRONTEND_API_KEY || 'frontend-key-123',
    process.env.MOBILE_API_KEY || 'mobile-key-456',
    // Agregar más keys según necesites
  ];

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    
    // Obtener API Key del header
    const apiKey = request.headers['x-api-key'] as string;
    
    if (!apiKey) {
      throw new UnauthorizedException('API Key is required');
    }

    // Validar que la API Key sea válida
    if (!this.validApiKeys.includes(apiKey)) {
      throw new UnauthorizedException('Invalid API Key');
    }

    return true;
  }
}
