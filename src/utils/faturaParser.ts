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
 * Função inteligente de extração avançada de dados de faturas brasileiras (EDP, Light, Enel, Cemig, CPFL, Neoenergia, etc.)
 */
export function parseFaturaTexto(texto: string): FaturaExtraida {
  const cleanText = texto.replace(/\r/g, '');

  // 1. Identificar Concessionária
  let concessionaria = "EDP Espírito Santo";
  if (/LIGHT/i.test(cleanText)) {
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
  } else if (/EDP|Escri\s*Energia|ESCELSA|EDP\s*ES|EDP\s*SP/i.test(cleanText)) {
    concessionaria = "EDP Espírito Santo";
  }

  // 2. Extração Avançada de CPF / CNPJ do Cliente (Ignorando CNPJ da Distribuidora)
  let cpfCnpj: string | undefined;

  // Lista de CNPJs conhecidos de distribuidoras para ignorar
  const cnpjsDistribuidoras = [
    '28.152.650/0001-71', // EDP ES
    '03.238.961/0001-51', // EDP SP
    '33.050.196/0001-44', // Light
    '09.047.435/0001-55', // Enel SP
    '04.920.816/0001-56', // Enel RJ
    '17.155.730/0001-64', // Cemig
    '02.429.980/0001-40', // CPFL
  ];

  // Extrai todos os CPFs e CNPJs do texto
  const todosCpfs = Array.from(cleanText.matchAll(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g)).map(m => m[0]);
  const todosCnpjs = Array.from(cleanText.matchAll(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g)).map(m => m[0]);

  // Filtrar CNPJs das distribuidoras
  const cnpjsValidosCliente = todosCnpjs.filter(c => !cnpjsDistribuidoras.includes(c));

  // Prioridade 1: Buscar CPF/CNPJ com rótulo explícito do cliente (ex: "CPF: 055.577.507-03" ou "CPF/CNPJ do Cliente")
  const rotuloClienteMatch = cleanText.match(/(?:CPF|CNPJ|CPF\/CNPJ|DOC(?:UMENTO)?)\s*(?:DO\s*CLIENTE|DO\s*TITULAR|DO\s*DESTINATÁRIO)?\s*[:\.\s\-]*\n?\s*(\d{2,3}[\.\s]?\d{3}[\.\s]?\d{3}[\/\.\s\-]?\d{2,4}[\.\s\-]?\d{2})/i);
  
  if (rotuloClienteMatch) {
    const rawDigits = rotuloClienteMatch[1].replace(/\D/g, '');
    if (rawDigits.length === 11) {
      cpfCnpj = rawDigits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (rawDigits.length === 14) {
      cpfCnpj = rawDigits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  }

  // Prioridade 2: Se não encontrou por rótulo, pega o primeiro CPF formatado encontrado no texto
  if (!cpfCnpj && todosCpfs.length > 0) {
    cpfCnpj = todosCpfs[0];
  }

  // Prioridade 3: Se não encontrou CPF, pega o CNPJ do cliente (excluindo distribuidora)
  if (!cpfCnpj && cnpjsValidosCliente.length > 0) {
    cpfCnpj = cnpjsValidosCliente[0];
  }

  // Prioridade 4: Busca números puros de 11 dígitos no bloco de dados do cliente
  if (!cpfCnpj) {
    const rawCpfMatch = cleanText.match(/(?:CLIENTE|TITULAR|CONSUMIDOR|DESTINATÁRIO)[\s\S]{0,120}?\b(\d{11})\b/i);
    if (rawCpfMatch) {
      cpfCnpj = rawCpfMatch[1].replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
  }

  // 3. Extração Avançada de Nome do Cliente
  let clienteNome: string | undefined;

  // Rótulos comuns em faturas de energia
  const nomeLabelRegex = /(?:NOME\s*DO\s*CLIENTE|NOME\s*DO\s*TITULAR|NOME\s*RAZÃO\s*SOCIAL|DESTINATÁRIO|TITULAR|CLIENTE|NOME)\s*[:\.\s\-]*\n?\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{4,60})/gi;
  let matchNome: RegExpExecArray | null;

  const palavrasProibidas = [
    'EDP', 'ENEL', 'LIGHT', 'CEMIG', 'CPFL', 'NEOENERGIA', 'EQUATORIAL',
    'CONCESSIONARIA', 'DISTRIBUIDORA', 'ENERGIA', 'COMPANHIA', 'FATURA',
    'MINISTÉRIO', 'CONTA', 'CONSUMIDOR', 'NOTA FISCAL', 'ENDEREÇO', 'CIDADE',
    'BANCO', 'PAGAMENTO', 'TOTAL', 'DEBITO', 'REGULATÓRIO', 'SOLICITAÇÃO'
  ];

  while ((matchNome = nomeLabelRegex.exec(cleanText)) !== null) {
    const candidato = matchNome[1].trim().split('\n')[0].trim();
    const candidatoUpper = candidato.toUpperCase();
    
    const ehProibido = palavrasProibidas.some(p => candidatoUpper.includes(p));
    if (!ehProibido && candidato.length >= 5 && candidato.includes(' ')) {
      clienteNome = candidato;
      break;
    }
  }

  // Se não achou por rótulo, procura linha com Nome Próprio de 2 a 4 palavras em MAIÚSCULAS antes do endereço
  if (!clienteNome) {
    const linhas = cleanText.split('\n');
    for (const linha of linhas) {
      const trimmed = linha.trim();
      // Nome próprio em maiúsculas (ex: RODRIGO PIANNA PERIN ou PABLO BRAZ PEDRONI)
      if (/^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]{3,20}(\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]{2,20}){1,4}$/.test(trimmed)) {
        const trimmedUpper = trimmed.toUpperCase();
        if (!palavrasProibidas.some(p => trimmedUpper.includes(p))) {
          clienteNome = trimmed;
          break;
        }
      }
    }
  }

  // 4. Nº da Instalação / Unidade Consumidora (UC)
  let instalacao: string | undefined;
  const instMatch = cleanText.match(/(?:INSTALAÇÃ|INSTALACAO|Nº\s*DA\s*UC|UNIDADE\s*CONSUMIDORA|CONTA\s*CONTRATO|Nº\s*DO\s*CLIENTE|CÓDIGO\s*DA\s*UC)\s*[:\s]*(\d{5,12})/i)
                 || cleanText.match(/\b(\d{7,10})\b/);
  if (instMatch) {
    instalacao = instMatch[1];
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
    grupoTarifario = 'B1 - Residencial';
  }

  // 7. CEP e Cidade
  let cep: string | undefined;
  const cepMatch = cleanText.match(/\b\d{5}-\d{3}\b/);
  if (cepMatch) cep = cepMatch[0];

  let cidade: string | undefined;
  const cidadeMatch = cleanText.match(/(Vitória|Vila Velha|Serra|Cariacica|Guarapari|Linhares|São Mateus|Colatina|Cachoeiro de Itapemirim|Aracruz|Viana|Domingos Martins|São Paulo|Rio de Janeiro|Belo Horizonte)\b/i);
  if (cidadeMatch) cidade = cidadeMatch[0];

  // 8. Valor Total da Fatura (R$)
  let valorTotalFatura: number | undefined;
  const valorMatch = cleanText.match(/(?:TOTAL\s*A\s*PAGAR|VALOR\s*TOTAL|TOTAL\s*DA\s*CONTA|TOTAL\s*R\$)\s*[:\s]*R?\$?\s*(\d{1,5}[,\.]\d{2})/i);
  if (valorMatch) {
    const cleanValue = valorMatch[1].replace('.', '').replace(',', '.');
    valorTotalFatura = parseFloat(cleanValue);
  }

  // 9. Histórico de Consumo (Extração dos últimos 12 meses)
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
    textoBruto: cleanText.slice(0, 2000),
  };
}
