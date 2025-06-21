import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export enum SourceType {
  MARKETPLACE = 'marketplace',
  B2B_SPECIALIZED = 'b2b_specialized',
  DIRECT_BRAND = 'direct_brand',
  DISTRIBUTOR = 'distributor',
}

export enum SourceStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance',
  DEGRADED = 'degraded',
  BLOCKED = 'blocked',
}

@Entity('sources')
export class Source {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 255 })
  baseUrl: string;

  @Column({ length: 10 })
  country: string;

  @Column({
    type: 'enum',
    enum: SourceType,
    default: SourceType.DISTRIBUTOR,
  })
  type: SourceType;

  @Column({
    type: 'enum',
    enum: SourceStatus,
    default: SourceStatus.ACTIVE,
  })
  status: SourceStatus;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  score: number; // 0-100 scoring dinámico

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  reliability: number; // 0-100 confiabilidad

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  responseTime: number; // Tiempo promedio de respuesta en segundos

  @Column({ type: 'int', default: 0 })
  successRate: number; // Porcentaje de éxito 0-100

  @Column({ type: 'boolean', default: false })
  isOfficial: boolean; // Si es tienda oficial de marca

  @Column({ type: 'json', nullable: true })
  officialBrands: string[]; // Marcas oficiales que maneja

  @Column({ type: 'json', nullable: true })
  categories: string[]; // Categorías que maneja

  @Column({ type: 'json', nullable: true })
  certifications: string[]; // Certificaciones industriales

  @Column({ type: 'json', nullable: true })
  shippingCountries: string[]; // Países a los que envía

  @Column({ type: 'json', nullable: true })
  scraperConfig: {
    selectors: {
      productName?: string;
      price?: string;
      availability?: string;
      sku?: string;
      brand?: string;
      image?: string;
    };
    waitTime?: number;
    useProxy?: boolean;
    headers?: Record<string, string>;
  };

  @Column({ type: 'json', nullable: true })
  healthCheck: {
    lastCheck?: Date;
    status?: 'healthy' | 'degraded' | 'failed';
    responseTime?: number;
    errorCount?: number;
    lastError?: string;
  };

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @Column({ type: 'int', default: 1 })
  priority: number; // 1 = alta prioridad, 5 = baja prioridad

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 