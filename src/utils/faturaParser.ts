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
    '28.152.650/0001-71', '28152650000171', // EDP ES
    '03.238.961/0001-51', '03238961000151', // EDP SP
    '33.050.196/0001-44', '33050196000144', // Light
    '09.047.435/0001-55', '09047435000155', // Enel SP
    '04.920.816/0001-56', '04920816000156', // Enel RJ
    '17.155.730/0001-64', '17155730000164', // Cemig
    '02.429.980/0001-40', '02429980000140', // CPFL
  ];

  // Prioridade 1: Rótulo explícito CPF ou CNPJ (ex: "CPF: 14487106770", "CPF: 144.871.067-70", "CPF/CNPJ: 14487106770")
  const rotuloMatches = Array.from(cleanText.matchAll(/(?:CPF|CNPJ|CPF\/CNPJ|DOC(?:UMENTO)?)\s*(?:DO\s*CLIENTE|DO\s*TITULAR|DO\s*DESTINATÁRIO)?\s*[:\.\s\-]*\n?\s*([\d\.\/\-]{11,18})/gi));
  
  for (const match of rotuloMatches) {
    const rawVal = match[1];
    const rawDigits = rawVal.replace(/\D/g, '');
    if (rawDigits.length === 11) {
      cpfCnpj = rawDigits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      break;
    } else if (rawDigits.length === 14 && !cnpjsDistribuidoras.includes(rawDigits)) {
      cpfCnpj = rawDigits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
      break;
    }
  }

  // Prioridade 2: Se não encontrou por rótulo explícito, busca CPFs formatados no texto (XXX.XXX.XXX-XX)
  if (!cpfCnpj) {
    const todosCpfs = Array.from(cleanText.matchAll(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g)).map(m => m[0]);
    if (todosCpfs.length > 0) {
      cpfCnpj = todosCpfs[0];
    }
  }

  // Prioridade 3: Se não encontrou CPF, pega CNPJs formatados válidos (excluindo distribuidora)
  if (!cpfCnpj) {
    const todosCnpjs = Array.from(cleanText.matchAll(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g)).map(m => m[0]);
    const cnpjsValidosCliente = todosCnpjs.filter(c => !cnpjsDistribuidoras.includes(c) && !cnpjsDistribuidoras.includes(c.replace(/\D/g, '')));
    if (cnpjsValidosCliente.length > 0) {
      cpfCnpj = cnpjsValidosCliente[0];
    }
  }

  // Prioridade 4: Busca números puros de 11 dígitos isolados
  if (!cpfCnpj) {
    const raw11DigitsMatches = Array.from(cleanText.matchAll(/\b(\d{11})\b/g)).map(m => m[1]);
    for (const digitStr of raw11DigitsMatches) {
      cpfCnpj = digitStr.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
      break;
    }
  }

  // 3. Nº da Instalação / Unidade Consumidora (UC)
  let instalacao: string | undefined;
  const instMatch = cleanText.match(/(?:CÓDIGO\s*DA\s*INSTALAÇÃO|CODIGO\s*DA\s*INSTALACAO|INSTALAÇÃ|INSTALACAO|Nº\s*DA\s*UC|UNIDADE\s*CONSUMIDORA|CONTA\s*CONTRATO)\s*[:\s\n]*(\d{5,12})/i)
                 || cleanText.match(/\b(\d{8,10})\b/);
  if (instMatch) {
    instalacao = instMatch[1];
  }

  // 4. CEP, Endereço e Cidade
  let cep: string | undefined;
  const cepMatch = cleanText.match(/(?:CEP)?\s*[:\s]*(\d{5}-\d{3}|\d{8})\b/i);
  if (cepMatch) {
    const rawCep = cepMatch[1].replace(/\D/g, '');
    if (rawCep.length === 8) {
      cep = rawCep.replace(/(\d{5})(\d{3})/, '$1-$2');
    }
  }

  let endereco: string | undefined;
  const enderecoMatch = cleanText.match(/(?:RUA|R\.|AVENIDA|AV\.|ALAMEDA|PRAÇA|PRACA|ESTRADA|RODOVIA|SERVIDÃO|SERVIDAO|TRAVESSA|TV\.)\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ0-9\s,\.\-\/]{5,80}/i);
  if (enderecoMatch) {
    endereco = enderecoMatch[0].trim().split('\n')[0];
  }

  let cidade: string | undefined;
  // Tenta extrair padrao "BAIRRO / CIDADE - UF" (ex: "INTERLAGOS / LINHARES - ES")
  const cidadeUfMatch = cleanText.match(/\/\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{3,30})\s*-\s*([A-Z]{2})/i);
  if (cidadeUfMatch) {
    cidade = cidadeUfMatch[1].trim();
  } else {
    const cidadeListaMatch = cleanText.match(/(Vitória|Vila Velha|Serra|Cariacica|Guarapari|Linhares|São Mateus|Colatina|Cachoeiro de Itapemirim|Aracruz|Viana|Domingos Martins|São Paulo|Rio de Janeiro|Belo Horizonte)\b/i);
    if (cidadeListaMatch) cidade = cidadeListaMatch[0];
  }

  // 5. Extração Avançada de Nome do Cliente
  let clienteNome: string | undefined;

  const palavrasProibidas = [
    'EDP', 'ENEL', 'LIGHT', 'CEMIG', 'CPFL', 'NEOENERGIA', 'EQUATORIAL',
    'CONCESSIONARIA', 'DISTRIBUIDORA', 'ENERGIA', 'COMPANHIA', 'FATURA',
    'MINISTÉRIO', 'CONTA', 'CONSUMIDOR', 'NOTA FISCAL', 'ENDEREÇO', 'CIDADE',
    'BANCO', 'PAGAMENTO', 'TOTAL', 'DEBITO', 'REGULATÓRIO', 'SOLICITAÇÃO',
    'CLASSIFICAÇÃO', 'TENSÃO', 'MODALIDADE', 'FORNECIMENTO', 'MÊS', 'ANO',
    'VENCIMENTO', 'VALOR', 'INSTALAÇÃO', 'CÓDIGO', 'RESIDENCIAL', 'CONVENCIONAL'
  ];

  // Rótulos comuns em faturas de energia
  const nomeLabelRegex = /(?:NOME\s*DO\s*CLIENTE|NOME\s*DO\s*TITULAR|NOME\s*RAZÃO\s*SOCIAL|DESTINATÁRIO|TITULAR|CLIENTE|NOME)\s*[:\.\s\-]*\n?\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{4,60})/gi;
  let matchNome: RegExpExecArray | null;

  while ((matchNome = nomeLabelRegex.exec(cleanText)) !== null) {
    const candidato = matchNome[1].trim().split('\n')[0].trim();
    const candidatoUpper = candidato.toUpperCase();
    
    const ehProibido = palavrasProibidas.some(p => candidatoUpper.includes(p));
    if (!ehProibido && candidato.length >= 5 && candidato.includes(' ')) {
      clienteNome = candidato;
      break;
    }
  }

  // Se não achou por rótulo, procura por linha com Nome Próprio antes do Endereço/CEP/CPF
  if (!clienteNome) {
    const linhas = cleanText.split('\n');
    for (let i = 0; i < linhas.length; i++) {
      const trimmed = linhas[i].trim();
      // Nome próprio em maiúsculas de 2 a 5 palavras (ex: LUAN PARDIM MUNIZ)
      if (/^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]{2,20}(\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]{2,20}){1,4}$/.test(trimmed)) {
        const trimmedUpper = trimmed.toUpperCase();
        if (!palavrasProibidas.some(p => trimmedUpper.includes(p))) {
          clienteNome = trimmed;
          break;
        }
      }
    }
  }

  // 6. Tipo de Ligação (Mono, Bi ou Trifásico)
  let tipoLigacao: 'Monofásico' | 'Bifásico' | 'Trifásico' | undefined;
  if (/TRIFÁSI|TRIFASI|3\s*FASES|TRIPOLAR/i.test(cleanText)) {
    tipoLigacao = 'Trifásico';
  } else if (/BIFÁSI|BIFASI|2\s*FASES|BIPOLAR/i.test(cleanText)) {
    tipoLigacao = 'Bifásico';
  } else if (/MONOFÁSI|MONOFASI|1\s*FASE|MONOPOLAR/i.test(cleanText)) {
    tipoLigacao = 'Monofásico';
  }

  // 7. Grupo Tarifário
  let grupoTarifario: string | undefined;
  const grupoMatch = cleanText.match(/(?:GRUPO|SUBGRUPO|MODALIDADE|TIPO\s*DE\s*TARIFA|CLASSIFICAÇÃO)\s*[:\s\-]*(B1|B2|B3|A4|A3a|A2|VERDE|AZUL|CONVENCIONAL|B\s*-\s*B1-RESIDENCIAL)/i);
  if (grupoMatch) {
    const rawGroup = grupoMatch[1].toUpperCase();
    if (rawGroup.includes('B1')) grupoTarifario = 'B1 - Residencial';
    else if (rawGroup.includes('B2')) grupoTarifario = 'B2 - Rural';
    else if (rawGroup.includes('B3')) grupoTarifario = 'B3 - Comercial/Outros';
    else if (rawGroup.includes('A4')) grupoTarifario = 'A4 - Alta Tensão';
    else grupoTarifario = rawGroup;
  } else {
    grupoTarifario = 'B1 - Residencial';
  }

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
    endereco,
    cidade,
    cep,
    tipoLigacao: tipoLigacao || 'Monofásico',
    grupoTarifario,
    historicoConsumo,
    consumoMedioKwh,
    valorTotalFatura,
    textoBruto: cleanText.slice(0, 2000),
  };
}
