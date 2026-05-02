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
};
