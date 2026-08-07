export type ProcessedUnit = {
  id?: string;
  code: string;
  name: string;
  monthlyCons: number;
  dailyCons: number;
  requiredKwp: number;
  requiredModules: number;
};

export type ClientData = {
  name: string;
  cpfCnpj: string;
  phone: string;
  email: string;
  address: string;
  neighborhood?: string;
  city?: string;
  installationNumber?: string;
  cep?: string;
  concessionaria?: string;
  procuracaoUrl?: string | null;
  procuracaoName?: string | null;
  procuracaoExpirationDate?: string | null;
  signatureUrl?: string | null;
  signatureUpdatedAt?: string | null;
  protocolDate?: string | null;
  slaDueDate?: string | null;
};

export type ClientListItem = {
  id: string;
  name: string;
  cpfCnpj?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  installationNumber?: string | null;
  cep?: string | null;
  concessionaria?: string | null;
  procuracaoUrl?: string | null;
  procuracaoName?: string | null;
  procuracaoUpdatedAt?: string | null;
  procuracaoExpirationDate?: string | null;
  signatureUrl?: string | null;
  signatureUpdatedAt?: string | null;
  protocolDate?: string | null;
  slaDueDate?: string | null;
  createdAt?: string;
  _count?: { projects: number };
  userId?: string | null;
  user?: {
    id: string;
    name: string;
    role: string;
    companyId?: string | null;
    company?: { id: string; name: string } | null;
  } | null;
};

export type Inverter = {
  id?: string;
  manufacturer: string | null;
  model: string | null;
  outputPower: number | null;
  outputCurrent: number | null;
  quantity: number;
  numMppts?: number | null;
  inputsPerMppt?: number | null;
  mpptInputs?: string | null;
  stringLayout?: string | null;
};

export type Project = {
  id: string;
  name: string;
  createdAt: string;
  status?: string;
  modulePower: number;
  totalKwp: number;
  totalModules: number;
  moduleModel: string | null;
  inverterModel: string | null;
  installationNumber?: string | null;
  estimatedCost?: number | null;
  lossReason?: string | null;
  lossDetails?: string | null;
  generationKwh?: number | null;
  reductionPercent?: number | null;
  moduleManufacturer?: string | null;
  moduleArea?: number | null;
  moduleCurrent?: number | null;
  inverterManufacturer?: string | null;
  inverterOutputPower?: number | null;
  inverterOutputCurrent?: number | null;
  areaOccupied?: number | null;
  professionalName?: string | null;
  professionalCrt?: string | null;
  address?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  cep?: string | null;
  memorialAssinadoUrl?: string | null;
  memorialAssinadoName?: string | null;
  artUrl?: string | null;
  artName?: string | null;
  certInversorUrl?: string | null;
  certInversorName?: string | null;
  units?: ProcessedUnit[];
  inverters?: Inverter[];
  _count?: { units: number };
  client?: ClientListItem | null;
};

export type ClientDetail = ClientListItem & {
  projects: Project[];
};

export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "CRITICAL";

export type AppNotification = {
  id: string;
  createdAt: string;
  title: string;
  message: string;
  type: NotificationType;
  read: boolean;
  link?: string | null;
  clientId?: string | null;
  clientName?: string | null;
  userId: string;
};

// ─── Dashboard / Analytics Types ──────────────────────────────────────────────

export type MonthlyDataPoint = {
  name: string;   // Ex: "Jan/25"
  projetos: number;
};

export type StatusDataPoint = {
  name: string;   // Ex: "Simulação", "Negociação", ...
  value: number;
};

export type LossReasonDataPoint = {
  name: string;   // Ex: "Preço Alto", "Concorrência"
  value: number;
};

export type ConcessionariaDataPoint = {
  name: string;
  total: number;
  simulacao: number;
  negociacao: number;
  homologacao: number;
  concluido: number;
  kwpTotal: number;
};

export type TeamMemberPerformance = {
  id: string;
  name: string;
  role: string;
  totalProjects: number;
  closedProjects: number;
  conversionRate: number;
  totalKwp: number;
  totalRevenue: number;
};

export type CanceledProject = {
  id: string;
  name: string;
  totalKwp: number;
  clientId?: string | null;
  clientName?: string | null;
  lossReason?: string | null;
  createdAt: string;
};

export type ProcuracaoAlert = {
  id: string;
  clientName: string;
  daysRemaining: number;
  isExpired: boolean;
};

export type AnalyticsMetrics = {
  openEstimatedRevenue: number;
  totalKwp: number;
  totalProjects: number;
  conversionRatePercent: number;
  closedProjects: number;
  averageTicket: number;
  canceledProjectsCount: number;
  canceledProjectsList: CanceledProject[];
  monthlyData: MonthlyDataPoint[];
  statusData: StatusDataPoint[];
  lossReasonData: LossReasonDataPoint[];
  concessionariaData: ConcessionariaDataPoint[];
  teamPerformance: TeamMemberPerformance[];
  procuracaoAlerts: ProcuracaoAlert[];
};
