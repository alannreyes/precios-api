import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Source } from './source.entity';

export interface DeliveryInfo {
  standard?: string;
  express?: string;
  emergency?: string;
  estimatedArrivalPeru?: string;
}

export interface ImportInfo {
  hsCode?: string;
  estimatedDuties?: string;
  requiredPermits?: string[];
  shippingRestrictions?: string;
}

export interface MiningInsights {
  criticalEquipment?: boolean;
  maintenanceWindow?: string;
  alternativeProducts?: string[];
  bulkPricingAvailable?: boolean;
}

export interface SmartAlerts {
  priceAlert?: string;
  stockAlert?: string;
  seasonalAlert?: string;
  urgencyAlert?: string;
}

@Entity('product_searches')
export class ProductSearch {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 255 })
  productQuery: string;

  @Column({ length: 255, nullable: true })
  normalizedProduct: string; // Producto normalizado por IA

  @Column({ length: 10 })
  country: string;

  @Column({ type: 'boolean', default: false })
  globalSearch: boolean; // Si fue búsqueda global

  @Column({ type: 'json', nullable: true })
  searchCountries: string[]; // Países incluidos en búsqueda global

  @ManyToOne(() => Source)
  @JoinColumn({ name: 'source_id' })
  source: Source;

  @Column({ length: 255 })
  productName: string;

  @Column({ length: 100, nullable: true })
  brand: string;

  @Column({ length: 100, nullable: true })
  model: string;

  @Column({ length: 100, nullable: true })
  sku: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ length: 10 })
  currency: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceUSD: number; // Precio convertido a USD

  @Column({ length: 500 })
  productUrl: string;

  @Column({ length: 500, nullable: true })
  imageUrl: string;

  @Column({ length: 50, default: 'unknown' })
  availability: string; // in_stock, out_of_stock, limited, unknown

  @Column({ type: 'int', nullable: true })
  stockQuantity: number;

  @Column({ type: 'decimal', precision: 5, scale: 2 })
  confidenceScore: number; // 0-100 confianza del match

  @Column({ type: 'boolean', default: false })
  isExactMatch: boolean;

  @Column({ type: 'boolean', default: false })
  isOfficialSource: boolean;

  @Column({ type: 'json', nullable: true })
  certifications: string[];

  @Column({ type: 'json', nullable: true })
  deliveryInfo: DeliveryInfo;

  @Column({ type: 'json', nullable: true })
  importInfo: ImportInfo;

  @Column({ type: 'json', nullable: true })
  miningInsights: MiningInsights;

  @Column({ type: 'json', nullable: true })
  smartAlerts: SmartAlerts;

  @Column({ type: 'int', default: 0 })
  responseTimeMs: number; // Tiempo que tomó obtener este resultado

  @Column({ length: 100, nullable: true })
  apiKeyUsed: string; // API key que hizo la búsqueda (hasheada)

  @CreateDateColumn()
  createdAt: Date;
} 