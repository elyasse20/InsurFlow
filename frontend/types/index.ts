// ─── User ─────────────────────────────────────────────────────────────────────
export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  enabled?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type UserResponse = User;

export interface AuthResponse {
  token: string;
  id: string;
  username: string;
  role: UserRole;
  email: string;
}

// ─── Client ───────────────────────────────────────────────────────────────────
export type ClientType = 'particulier' | 'societe';

export interface Client {
  id: string;
  type: ClientType;
  nom: string;
  prenom?: string;
  cin?: string;
  tel: string;
  adresse: string;
  doc: string;
  ice?: string;
  identifiantFiscal?: string;
  rc?: string;
  dateDebut: string;
  budget: number;
  credit: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Production ───────────────────────────────────────────────────────────────
export interface ProductionParameter {
  name: string;
  primes: number;
  taxe: number;
  taxepara: number;
  accessoire: number;
  cnpc: number;
  commission: number;
}

/**
 * Répartition du montant d'une police entre plusieurs compagnies.
 * Corresponds to the REPARTITION columns in the MARITIME A C sheet.
 */
export interface CompagneRepartition {
  compagneName: string;
  /** Percentage (e.g., 40 means 40%) */
  percent: number;
}

export interface Production {
  id: string;
  natureOperation: string;
  client: string;
  dateEff: string;
  moisDem: string;
  compagne: string;
  tvaRate: number;
  category: string;
  numpolice: string;
  /** N° d'Ordre interne (MARITIME sheet 'ORDRE' column, distinct from numpolice) */
  ordre?: string;
  refCie?: string;
  certificat?: string;
  navire?: string;
  /** Répartition du montant entre compagnies */
  repartitions?: CompagneRepartition[];
  parameters: ProductionParameter[];
  montantTotal?: number; // virtual — may be present if Spring returns it
  createdAt: string;
  updatedAt: string;
}

// ─── Reglement / Payment ─────────────────────────────────────────────────────
export type PaymentMode = 'CHEQUE' | 'ESPECE' | 'VIREMENT' | 'AUTRE';
export type ReglementStatus = 'EN_ATTENTE' | 'PARTIEL' | 'PAYE';

export interface Payment {
  mode: PaymentMode;
  montant: number;
  dateEcheance?: string;
  banque?: string;
  numero?: string;
  emporteur?: string;
  dateVirement?: string;
  doc?: string;
  commentaire?: string;
}

export interface Reglement {
  id: string;
  production: Production | string;
  natureOperation: string;
  client: string;
  dateEff: string;
  moisDem: string;
  compagne: string;
  category: string;
  numpolice: string;
  montantTotal: number;
  /** N° Facture (N°FACTURE column in PROD A C / MARITIME A C) */
  numFacture?: string;
  /** Paiements reçus du client (REGLER PAR LE CLIENT) */
  payments: Payment[];
  /** Paiements versés à la compagnie (REGLER A LA CIE) */
  paymentscie?: Payment[];
  status: ReglementStatus;
  totalPaiements?: number; // virtual
  totalPaiementsCie?: number; // virtual
  createdAt: string;
  updatedAt: string;
}

// ─── Compagne ─────────────────────────────────────────────────────────────────
export interface CompagneParameter {
  name: string;
  percent: number;
}

export interface CompagneCategory {
  name: string;
  indec: string;
  parameters: CompagneParameter[];
}

export interface Compagne {
  id: string;
  compagneName: string;
  categories: CompagneCategory[];
}

// ─── Lookup items ─────────────────────────────────────────────────────────────
export interface Nature { id: string; name: string; }
export interface Category { id: string; name: string; commissionRate: number; }
export interface Parametre { id: string; name: string; value?: string; type?: string; }
export interface Tva { id: string; name: string; rate: number; }

export interface ReferentielsResponse {
  categories: Category[];
  natures: Nature[];
  parametres: Parametre[];
  tvas: Tva[];
}

// ─── Invoice ──────────────────────────────────────────────────────────────────
export type InvoiceType = 'STANDARD' | 'PROFORMA' | 'AVOIR';
export type InvoiceStatusType = 'PAID' | 'PARTIAL' | 'UNPAID';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  operationId?: string;
  clientName: string;
  policyNumber?: string;
  compagne?: string;
  category?: string;
  amountHT: number;
  tvaRate: number;
  tvaAmount: number;
  amountTTC: number;
  paidAmount: number;
  remainingAmount: number;
  type: InvoiceType;
  status: InvoiceStatusType;
  dueDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

// ─── AI Risk Assessment ──────────────────────────────────────────────────────
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface RiskAssessmentRequest {
  clientName?: string;
  clientAge?: number;
  vehicleType?: string;
  annualMileage?: number;
  clientCreditBudget?: number;
  historyClaimsCount?: number;
  usageType?: string;
  category?: string;
  natureOperation?: string;
}

export interface RiskAssessmentResponse {
  riskLevel: RiskLevel;
  riskScore: number; // 0-100
  summary: string;
  pricingRecommendation: string;
  recommendedGuarantees: string[];
  flags: string[];
}

// ─── AI Copilot ──────────────────────────────────────────────────────────────
export interface CopilotMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface CopilotSession {
  id: string;
  title: string;
  timestamp: string;
  createdAt: number;
  messages: CopilotMessage[];
  preview?: string;
}

export interface CopilotChatRequest {
  messages: CopilotMessage[];
  contextPage?: string;
}

export interface CopilotChatResponse {
  response: string;
  message?: string;
  suggestedActions?: string[];
}

// ─── Claims AI Analyzer ───────────────────────────────────────────────────────
export type FraudRiskLevel = 'FAIBLE' | 'MOYEN' | 'ÉLEVÉ';

export interface ClaimFinancialBreakdown {
  estimatedDamage: number;
  deductible: number;
  netPayout: number;
  currency: string;
  notes?: string;
}

export interface ClaimAnalysisRequest {
  claimText: string;
  policyNumber?: string;
  clientName?: string;
  incidentDate?: string;
  category?: string;
  estimatedDamage?: number;
  deductible?: number;
}

export interface ClaimAnalysisResponse {
  executiveSummary: string;
  liabilityAssessment: string;
  financialBreakdown: ClaimFinancialBreakdown;
  fraudRiskScore: number; // 0 - 100
  fraudRiskLevel: FraudRiskLevel;
  riskFlags: string[];
  recommendedActions: string[];
}

// ─── Automated Notifications & Alerts ─────────────────────────────────────────
export type NotificationType =
  | 'ECHEANCE_RENOUVELLEMENT'
  | 'QUITTANCE_IMPAYEE'
  | 'SINISTRE_ALERTE'
  | 'FRAUDE_IA'
  | 'RENEWAL_30_DAYS'
  | 'RENEWAL_15_DAYS';

export type NotificationSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface NotificationItem {
  id: string;
  title?: string;
  message: string;
  type: NotificationType;
  severity: NotificationSeverity;
  referenceId?: string;
  clientName?: string;
  amount?: number | null;
  policyNumber?: string;
  expirationDate?: string;
  isRead: boolean;
  createdAt: string;
}
