export type ProcessedUnit = {
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
  createdAt?: string;
  _count?: { projects: number };
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
};


export type Project = {
  id: string;
  name: string;
  createdAt: string;
  modulePower: number;
  totalKwp: number;
  totalModules: number;
  moduleModel: string | null;
  inverterModel: string | null;
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
  units: ProcessedUnit[];
  inverters?: Inverter[];
  _count?: { units: number };
  client?: ClientListItem | null;
};

export type ClientDetail = ClientListItem & {
  projects: Project[];
};
