export function formatUnidadeConsumidora(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 15);
  let formatted = "";
  if (clean.length > 0) {
    formatted += clean[0];
  }
  if (clean.length > 1) {
    formatted += "." + clean.substring(1, Math.min(clean.length, 4));
  }
  if (clean.length > 4) {
    formatted += "." + clean.substring(4, Math.min(clean.length, 7));
  }
  if (clean.length > 7) {
    formatted += "." + clean.substring(7, Math.min(clean.length, 10));
  }
  if (clean.length > 10) {
    formatted += "." + clean.substring(10, Math.min(clean.length, 13));
  }
  if (clean.length > 13) {
    formatted += "-" + clean.substring(13, clean.length);
  }
  return formatted;
}

export function formatCpfCnpj(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 14);
  if (clean.length <= 11) {
    let formatted = "";
    if (clean.length > 0) formatted += clean.substring(0, 3);
    if (clean.length > 3) formatted += "." + clean.substring(3, 6);
    if (clean.length > 6) formatted += "." + clean.substring(6, 9);
    if (clean.length > 9) formatted += "-" + clean.substring(9, 11);
    return formatted;
  } else {
    let formatted = "";
    if (clean.length > 0) formatted += clean.substring(0, 2);
    if (clean.length > 2) formatted += "." + clean.substring(2, 5);
    if (clean.length > 5) formatted += "." + clean.substring(5, 8);
    if (clean.length > 8) formatted += "/" + clean.substring(8, 12);
    if (clean.length > 12) formatted += "-" + clean.substring(12, 14);
    return formatted;
  }
}

export function formatPhone(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 11);
  if (clean.length <= 10) {
    let formatted = "";
    if (clean.length > 0) formatted += "(" + clean.substring(0, 2);
    if (clean.length > 2) formatted += ") " + clean.substring(2, 6);
    if (clean.length > 6) formatted += "-" + clean.substring(6, 10);
    return formatted;
  } else {
    let formatted = "";
    if (clean.length > 0) formatted += "(" + clean.substring(0, 2);
    if (clean.length > 2) formatted += ") " + clean.substring(2, 7);
    if (clean.length > 7) formatted += "-" + clean.substring(7, 11);
    return formatted;
  }
}

export function formatCep(value: string): string {
  const clean = value.replace(/\D/g, "").slice(0, 8);
  let formatted = "";
  if (clean.length > 0) formatted += clean.substring(0, Math.min(clean.length, 5));
  if (clean.length > 5) formatted += "-" + clean.substring(5, clean.length);
  return formatted;
}
