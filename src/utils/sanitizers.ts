/**
 * Utilitários de Sanitização e Validação de Dados para Documentos Regulatórios ANEEL
 */

/**
 * Remove caracteres não numéricos e formata/sanitiza CPF ou CNPJ.
 */
export function sanitizeCpfCnpj(value?: string | null): string {
  if (!value) return "";
  const cleaned = value.replace(/\D/g, "");
  
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  
  if (cleaned.length === 14) {
    return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }

  return cleaned;
}

/**
 * Sanitiza números de instalação / código da unidade consumidora.
 */
export function sanitizeInstallationNumber(value?: string | null): string {
  if (!value) return "";
  return value.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

/**
 * Validação simples de formato de CPF/CNPJ para alertas de auditoria.
 */
export function isValidCpfCnpjFormat(value?: string | null): boolean {
  if (!value) return false;
  const cleaned = value.replace(/\D/g, "");
  return cleaned.length === 11 || cleaned.length === 14;
}
