export type HistoricoConsumoItem = {
  mesAno: string;
  kwh: number;
};

export type FaturaExtraida = {
  clienteNome?: string;
  cpfCnpj?: string;
  instalacao?: string;
  concessionaria?: string;
  endereco?: string;
  cidade?: string;
  cep?: string;
  tipoLigacao?: 'Monofásico' | 'Bifásico' | 'Trifásico';
  grupoTarifario?: string;
  historicoConsumo: HistoricoConsumoItem[];
  consumoMedioKwh: number;
  valorTotalFatura?: number;
  textoBruto: string;
};

/**
 * Função utilitária de extração inteligente de dados de fatura de energia via Expressões Regulares (Regex).
 */
export function parseFaturaTexto(texto: string): FaturaExtraida {
  const cleanText = texto.replace(/\r/g, '');

  // 1. Identificar Concessionária
  let concessionaria = "Desconhecida";
  if (/EDP|Escri\s*Energia|EDP\s*ES|EDP\s*SP/i.test(cleanText)) {
    concessionaria = "EDP Espírito Santo";
  } else if (/LIGHT/i.test(cleanText)) {
    concessionaria = "Light";
  } else if (/ENEL/i.test(cleanText)) {
    concessionaria = "Enel";
  } else if (/CEMIG/i.test(cleanText)) {
    concessionaria = "Cemig";
  } else if (/CPFL/i.test(cleanText)) {
    concessionaria = "CPFL Energia";
  } else if (/NEOENERGIA|COELBA|COSERN|CELPE|ELEKTRO/i.test(cleanText)) {
    concessionaria = "Neoenergia";
  } else if (/EQUATORIAL/i.test(cleanText)) {
    concessionaria = "Equatorial Energia";
  }

  // 2. CPF / CNPJ
  let cpfCnpj: string | undefined;
  const cnpjMatch = cleanText.match(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/);
  const cpfMatch = cleanText.match(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/);

  if (cnpjMatch) {
    cpfCnpj = cnpjMatch[0];
  } else if (cpfMatch) {
    cpfCnpj = cpfMatch[0];
  }

  // 3. Nº da Instalação / Unidade Consumidora (UC)
  let instalacao: string | undefined;
  const instMatch = cleanText.match(/(?:INSTALAÇÃ|INSTALACAO|Nº\s*DA\s*UC|UNIDADE\s*CONSUMIDORA|CONTA\s*CONTRATO|Nº\s*DO\s*CLIENTE)\s*[:\s]*(\d{5,12})/i)
                 || cleanText.match(/\b(\d{7,10})\b/);
  if (instMatch) {
    instalacao = instMatch[1];
  }

  // 4. Nome do Cliente
  let clienteNome: string | undefined;
  const nomeMatch = cleanText.match(/(?:NOME\s*DO\s*CLIENTE|CLIENTE|DESTINATÁRIO|TITULAR)\s*[:\s]*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{5,40})/i);
  if (nomeMatch && nomeMatch[1].trim().length > 3) {
    clienteNome = nomeMatch[1].trim();
  }

  // 5. Tipo de Ligação (Mono, Bi ou Trifásico)
  let tipoLigacao: 'Monofásico' | 'Bifásico' | 'Trifásico' | undefined;
  if (/TRIFÁSI|TRIFASI|3\s*FASES|TRIPOLAR/i.test(cleanText)) {
    tipoLigacao = 'Trifásico';
  } else if (/BIFÁSI|BIFASI|2\s*FASES|BIPOLAR/i.test(cleanText)) {
    tipoLigacao = 'Bifásico';
  } else if (/MONOFÁSI|MONOFASI|1\s*FASE|MONOPOLAR/i.test(cleanText)) {
    tipoLigacao = 'Monofásico';
  }

  // 6. Grupo Tarifário
  let grupoTarifario: string | undefined;
  const grupoMatch = cleanText.match(/(?:GRUPO|SUBGRUPO|MODALIDADE|TIPO\s*DE\s*TARIFA)\s*[:\s]*(B1|B2|B3|A4|A3a|A2|VERDE|AZUL|CONVENCIONAL)/i);
  if (grupoMatch) {
    const rawGroup = grupoMatch[1].toUpperCase();
    if (rawGroup === 'B1') grupoTarifario = 'B1 - Residencial';
    else if (rawGroup === 'B2') grupoTarifario = 'B2 - Rural';
    else if (rawGroup === 'B3') grupoTarifario = 'B3 - Comercial/Outros';
    else if (rawGroup === 'A4') grupoTarifario = 'A4 - Alta Tensão';
    else grupoTarifario = rawGroup;
  } else {
    // Fallback padrão residencial
    grupoTarifario = 'B1 - Residencial';
  }

  // 7. CEP e Cidade
  let cep: string | undefined;
  const cepMatch = cleanText.match(/\b\d{5}-\d{3}\b/);
  if (cepMatch) cep = cepMatch[0];

  let cidade: string | undefined;
  const cidadeMatch = cleanText.match(/(Vitória|Vila Velha|Serra|Cariacica|Guarapari|Linhares|São Mateus|Colatina|Cachoeiro de Itapemirim|São Paulo|Rio de Janeiro|Belo Horizonte)\b/i);
  if (cidadeMatch) cidade = cidadeMatch[0];

  // 8. Valor Total da Fatura (R$)
  let valorTotalFatura: number | undefined;
  const valorMatch = cleanText.match(/(?:TOTAL\s*A\s*PAGAR|VALOR\s*TOTAL|TOTAL\s*DA\s*CONTA|TOTAL\s*R\$)\s*[:\s]*R?\$?\s*(\d{1,5}[,\.]\d{2})/i);
  if (valorMatch) {
    const cleanValue = valorMatch[1].replace('.', '').replace(',', '.');
    valorTotalFatura = parseFloat(cleanValue);
  }

  // 9. Histórico de Consumo (Extração dos últimos 12 meses)
  // Padrão comum em faturas brasileiras: MES/ANO seguido por consumo em kWh (ex: JAN/24 450 ou 01/2024 450 kWh)
  const historicoConsumo: HistoricoConsumoItem[] = [];
  const regexHistorico = /\b(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ|\d{2})\/(\d{2,4})\s+[:\-]?\s*(\d{2,5})\b/gi;
  
  let match: RegExpExecArray | null;
  const mesSiglas: Record<string, string> = {
    '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun',
    '07': 'Jul', '08': 'Ago', '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez'
  };

  while ((match = regexHistorico.exec(cleanText)) !== null) {
    let mes = match[1].toUpperCase();
    if (mesSiglas[mes]) {
      mes = mesSiglas[mes];
    } else {
      mes = mes.charAt(0).toUpperCase() + mes.slice(1).toLowerCase();
    }
    const ano = match[2].length === 2 ? `20${match[2]}` : match[2];
    const kwh = parseInt(match[3], 10);

    // Evitar valores irreais (como ano ou códigos)
    if (kwh >= 20 && kwh <= 100000) {
      historicoConsumo.push({
        mesAno: `${mes}/${ano}`,
        kwh
      });
    }
  }

  // Se não encontrou pelo padrão com barras, busca por números sequenciais de kWh
  if (historicoConsumo.length === 0) {
    const regexNumerosKwh = /\b(\d{2,5})\s*(?:kWh|KWH)\b/gi;
    let kwhMatch: RegExpExecArray | null;
    let index = 1;
    while ((kwhMatch = regexNumerosKwh.exec(cleanText)) !== null && index <= 12) {
      const kwh = parseInt(kwhMatch[1], 10);
      if (kwh >= 30 && kwh <= 100000) {
        historicoConsumo.push({
          mesAno: `Mês ${index}`,
          kwh
        });
        index++;
      }
    }
  }

  // 10. Cálculo da Média de Consumo (kWh/mês)
  let consumoMedioKwh = 0;
  if (historicoConsumo.length > 0) {
    const soma = historicoConsumo.reduce((acc, item) => acc + item.kwh, 0);
    consumoMedioKwh = Math.round(soma / historicoConsumo.length);
  } else {
    // Tenta capturar linha de consumo do mês atual
    const consumoAtualMatch = cleanText.match(/(?:CONSUMO\s*DO\s*MÊS|CONSUMO\s*KWH|TOTAL\s*CONSUMIDO)\s*[:\s]*(\d{2,5})/i);
    if (consumoAtualMatch) {
      consumoMedioKwh = parseInt(consumoAtualMatch[1], 10);
    }
  }

  return {
    clienteNome,
    cpfCnpj,
    instalacao,
    concessionaria,
    endereco: undefined,
    cidade,
    cep,
    tipoLigacao: tipoLigacao || 'Bifásico',
    grupoTarifario,
    historicoConsumo,
    consumoMedioKwh,
    valorTotalFatura,
    textoBruto: cleanText.slice(0, 2000), // primeiras 2000 chars
  };
}
