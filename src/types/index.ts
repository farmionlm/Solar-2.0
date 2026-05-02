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
};

export type ClientListItem = {
  id: string;
  name: string;
  cpfCnpj?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  createdAt?: string;
  _count?: { projects: number };
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
  units: ProcessedUnit[];
  _count?: { units: number };
  client?: ClientListItem | null;
};

export type ClientDetail = ClientListItem & {
  projects: Project[];
};
