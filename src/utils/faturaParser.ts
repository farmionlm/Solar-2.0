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

  // Palavras proibidas de sistema/concessionária
  const palavrasProibidas = [
    'EDP', 'ENEL', 'LIGHT', 'CEMIG', 'CPFL', 'NEOENERGIA', 'EQUATORIAL',
    'CONCESSIONARIA', 'DISTRIBUIDORA', 'ENERGIA', 'COMPANHIA', 'FATURA',
    'MINISTÉRIO', 'CONTA', 'CONSUMIDOR', 'NOTA FISCAL', 'ENDEREÇO', 'CIDADE',
    'BANCO', 'PAGAMENTO', 'TOTAL', 'DEBITO', 'REGULATÓRIO', 'SOLICITAÇÃO',
    'CLASSIFICAÇÃO', 'TENSÃO', 'MODALIDADE', 'FORNECIMENTO', 'MÊS', 'ANO',
    'VENCIMENTO', 'VALOR', 'INSTALAÇÃO', 'CÓDIGO', 'RESIDENCIAL', 'CONVENCIONAL'
  ];

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

  // CEPs conhecidos de sedes de distribuidoras para ignorar
  const cepsDistribuidoras = [
    '29050-670', '29050670', // EDP ES (Vitória - Enseada do Suá)
    '20050-000', '20050000', // Light RJ
    '01000-000', // Enel SP
    '30190-000', // Cemig MG
  ];

  // Trechos de endereços de sedes de distribuidoras para ignorar
  const enderecosDistribuidoras = [
    'FLORENTINO FALLER',
    'ENSEADA DO SUÁ',
    'ENSEADA DO SUA',
    'FABIO RUSCHI',
    'FÁBIO RUSCHI',
    'MARECHAL FLORIANO',
    'LAMEGO',
    'EMÍLIO RIBAS',
    'EMILIO RIBAS'
  ];

  const isDistributorData = (lineStr: string) => {
    const u = lineStr.toUpperCase();
    return cnpjsDistribuidoras.some(c => u.includes(c)) ||
           cepsDistribuidoras.some(c => u.includes(c)) ||
           enderecosDistribuidoras.some(e => u.includes(e));
  };

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

  let clienteNome: string | undefined;
  let cpfCnpj: string | undefined;
  let endereco: string | undefined;
  let cidade: string | undefined;
  let cep: string | undefined;
  let instalacao: string | undefined;

  // --- Funções Auxiliares para Limpeza de Colunas Concatenadas do PDF ---
  const sanitizeLineRightColumn = (raw: string) => {
    return raw
      .replace(/CÓDIGO\s*DA\s*INSTALAÇÃO.*/i, '')
      .replace(/CÓDIGO\s*DO\s*CLIENTE.*/i, '')
      .replace(/UNIDADE\s*CONSUMIDORA.*/i, '')
      .replace(/CONTA\s*CONTRATO.*/i, '')
      .replace(/\b\d{8,12}\b\s*$/, '') // Remove código da instalação ou cliente concatenado no final da linha
      .trim();
  };

  // --- 2. EXTRAÇÃO CONTEXTUAL DO BLOCO DO CLIENTE (EDP/Light/Enel) ---
  const rawLinhas = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
  
  // Encontrar o índice pivô do bloco do cliente (ignorando cabeçalho da distribuidora)
  let clienteBlockIndex = -1;
  for (let i = 0; i < rawLinhas.length; i++) {
    const l = rawLinhas[i];
    if (isDistributorData(l)) continue; // Ignora o cabeçalho da EDP / distribuidora

    if (
      /(?:CPF|CPF\/CNPJ|DOC)\s*[:\s]*\d+/i.test(l) ||
      /CEP\s*[:\s]*\d+/i.test(l) ||
      /CÓDIGO\s*DO\s*CLIENTE/i.test(l) ||
      /\/\s*[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{3,30}\s*-\s*[A-Z]{2}/i.test(l)
    ) {
      clienteBlockIndex = i;
      break;
    }
  }

  if (clienteBlockIndex !== -1) {
    const startIdx = Math.max(0, clienteBlockIndex - 6);
    const endIdx = Math.min(rawLinhas.length, clienteBlockIndex + 5);
    const blocoLinhas = rawLinhas.slice(startIdx, endIdx);

    // Passagem 1: Extrair CPF, CEP, Cidade e Instalação do Bloco
    for (const rawLinha of blocoLinhas) {
      if (isDistributorData(rawLinha)) continue;

      // a) CPF do Cliente no Bloco (ex: "CPF: 14487106770")
      if (!cpfCnpj) {
        const cpfMatch = rawLinha.match(/(?:CPF|CNPJ|CPF\/CNPJ|DOC(?:UMENTO)?)\s*[:\.\s\-]*\s*([\d\.\/\-]{11,18})/i);
        if (cpfMatch) {
          const rawDigits = cpfMatch[1].replace(/\D/g, '');
          if (rawDigits.length === 11) {
            cpfCnpj = rawDigits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
          } else if (rawDigits.length === 14 && !cnpjsDistribuidoras.includes(rawDigits)) {
            cpfCnpj = rawDigits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
          }
        }
      }

      // b) CEP no Bloco (ex: "CEP: 29903-610")
      if (!cep) {
        const cepMatch = rawLinha.match(/(?:CEP)?\s*[:\s]*(\d{5}-\d{3}|\d{8})\b/i);
        if (cepMatch) {
          const rawCep = cepMatch[1].replace(/\D/g, '');
          if (rawCep.length === 8 && !cepsDistribuidoras.includes(rawCep) && !cepsDistribuidoras.includes(cepMatch[1])) {
            cep = rawCep.replace(/(\d{5})(\d{3})/, '$1-$2');
          }
        }
      }

      // c) Cidade no Bloco (ex: "INTERLAGOS / LINHARES - ES")
      if (!cidade) {
        const cidadeMatch = rawLinha.match(/\/\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{3,30})\s*-\s*([A-Z]{2})/i);
        if (cidadeMatch) {
          cidade = cidadeMatch[1].trim();
        } else {
          const cidLista = rawLinha.match(/(Vitória|Vila Velha|Serra|Cariacica|Guarapari|Linhares|São Mateus|Colatina|Cachoeiro de Itapemirim|Aracruz|Viana|Domingos Martins)\b/i);
          if (cidLista) cidade = cidLista[0];
        }
      }

      // d) Número da Instalação (UC)
      if (!instalacao) {
        const instM = rawLinha.match(/(?:CÓDIGO\s*DA\s*INSTALAÇÃO|CODIGO\s*DA\s*INSTALACAO|INSTALAÇÃ|INSTALACAO|Nº\s*DA\s*UC)\s*[:\s\n]*(\d{5,12})/i);
        if (instM) {
          instalacao = instM[1];
        }
      }
    }

    // Passagem 2: Extrair Nome do Cliente e Endereço por Sequência do Bloco
    // No PDF da EDP, as linhas do bloco do cliente vêm em sequência perfeita:
    // Linha A: NOME DO CLIENTE (ex: "LUAN PARDIM MUNIZ")
    // Linha B: ENDEREÇO (ex: "RUA MONTEIRO LOBATO 2137 CX 01")
    // Linha C: BAIRRO / CIDADE - UF (ex: "INTERLAGOS / LINHARES - ES")
    for (let i = 0; i < blocoLinhas.length; i++) {
      if (isDistributorData(blocoLinhas[i])) continue;

      const lineClean = sanitizeLineRightColumn(blocoLinhas[i]);
      const lineUpper = lineClean.toUpperCase();

      // Identifica o Nome do Cliente (linha de 2 a 5 palavras em maiúsculas sem palavras de sistema/endereço)
      if (!clienteNome && /^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]{2,20}(\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]{2,20}){1,4}$/.test(lineClean)) {
        const isForbidden = palavrasProibidas.some(p => lineUpper.includes(p));
        const isAddrOrDetails = /(?:RUA|R\.|AVENIDA|AV\.|CEP|CPF|INTERLAGOS|LINHARES|SERRA|VITÓRIA)/i.test(lineClean);
        if (!isForbidden && !isAddrOrDetails) {
          clienteNome = lineClean;
          
          // O Endereço no modelo EDP é a linha IMEDIATAMENTE APÓS o Nome do Cliente!
          if (i + 1 < blocoLinhas.length) {
            const nextLineClean = sanitizeLineRightColumn(blocoLinhas[i + 1]);
            if (nextLineClean && !isDistributorData(nextLineClean) && !nextLineClean.includes('CPF:') && !nextLineClean.includes('CEP:')) {
              endereco = nextLineClean;
            }
          }
        }
      }

      // Se ainda não capturou o endereço via linha seguinte do nome, busca por palavra-chave de logradouro (RUA, R., AVENUE, PRAÇA, etc.)
      if (!endereco) {
        const isStreetPrefix = /(?:RUA|R\.|AVENIDA|AV\.|ALAMEDA|PRAÇA|PRACA|ESTRADA|RODOVIA|SERVIDÃO|SERVIDAO|TRAVESSA|TV\.|SÍTIO|SITIO|FAZENDA|CONJUNTO|QUADRA|PARQUE)\s+/i.test(lineClean);
        const isHeaderAddr = palavrasProibidas.some(p => lineUpper.includes(p)) || isDistributorData(lineClean);
        if (isStreetPrefix && !isHeaderAddr) {
          endereco = lineClean;
        }
      }
    }
  }

  // --- FALLBACKS GLOBAIS (Se algum campo não tiver sido extraído do bloco, garantindo que ignora a concessionária) ---
  if (!cpfCnpj) {
    const rotuloMatches = Array.from(cleanText.matchAll(/(?:CPF|CNPJ|CPF\/CNPJ|DOC(?:UMENTO)?)\s*(?:DO\s*CLIENTE|DO\s*TITULAR|DO\s*DESTINATÁRIO)?\s*[:\.\s\-]*\n?\s*([\d\.\/\-]{11,18})/gi));
    for (const match of rotuloMatches) {
      if (isDistributorData(match[0])) continue;
      const rawDigits = match[1].replace(/\D/g, '');
      if (rawDigits.length === 11) {
        cpfCnpj = rawDigits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
        break;
      } else if (rawDigits.length === 14 && !cnpjsDistribuidoras.includes(rawDigits)) {
        cpfCnpj = rawDigits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
        break;
      }
    }
  }

  if (!cpfCnpj) {
    const todosCpfs = Array.from(cleanText.matchAll(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g)).map(m => m[0]);
    if (todosCpfs.length > 0) cpfCnpj = todosCpfs[0];
  }

  if (!clienteNome) {
    const nomeLabelRegex = /(?:NOME\s*DO\s*CLIENTE|NOME\s*DO\s*TITULAR|NOME\s*RAZÃO\s*SOCIAL|DESTINATÁRIO|TITULAR|CLIENTE|NOME)\s*[:\.\s\-]*\n?\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ\s]{4,60})/gi;
    let matchNome: RegExpExecArray | null;
    while ((matchNome = nomeLabelRegex.exec(cleanText)) !== null) {
      const candidato = matchNome[1].trim().split('\n')[0].trim();
      const ehProibido = palavrasProibidas.some(p => candidato.toUpperCase().includes(p)) || isDistributorData(candidato);
      if (!ehProibido && candidato.length >= 5 && candidato.includes(' ')) {
        clienteNome = candidato;
        break;
      }
    }
  }

  if (!endereco) {
    const linhas = cleanText.split('\n').map(l => l.trim()).filter(Boolean);
    for (const l of linhas) {
      if (isDistributorData(l)) continue;
      const lClean = sanitizeLineRightColumn(l);
      const isStreetPrefix = /(?:RUA|R\.|AVENIDA|AV\.|ALAMEDA|PRAÇA|PRACA|ESTRADA|RODOVIA|SERVIDÃO|SERVIDAO|TRAVESSA|TV\.|SÍTIO|SITIO|FAZENDA|CONJUNTO|QUADRA|PARQUE)\s+/i.test(lClean);
      if (isStreetPrefix && !palavrasProibidas.some(p => lClean.toUpperCase().includes(p))) {
        endereco = lClean;
        break;
      }
    }
  }

  if (!cidade) {
    const cidadeMatch = cleanText.match(/(Vitória|Vila Velha|Serra|Cariacica|Guarapari|Linhares|São Mateus|Colatina|Cachoeiro de Itapemirim|Aracruz|Viana|Domingos Martins|São Paulo|Rio de Janeiro|Belo Horizonte)\b/i);
    if (cidadeMatch) cidade = cidadeMatch[0];
  }

  if (!cep) {
    const cepMatches = Array.from(cleanText.matchAll(/(?:CEP)?\s*[:\s]*(\d{5}-\d{3}|\d{8})\b/gi));
    for (const cepM of cepMatches) {
      const rawCep = cepM[1].replace(/\D/g, '');
      if (rawCep.length === 8 && !cepsDistribuidoras.includes(rawCep) && !cepsDistribuidoras.includes(cepM[1])) {
        cep = rawCep.replace(/(\d{5})(\d{3})/, '$1-$2');
        break;
      }
    }
  }

  if (!instalacao) {
    const instMatch = cleanText.match(/(?:CÓDIGO\s*DA\s*INSTALAÇÃO|CODIGO\s*DA\s*INSTALACAO|INSTALAÇÃ|INSTALACAO|Nº\s*DA\s*UC|UNIDADE\s*CONSUMIDORA|CONTA\s*CONTRATO)\s*[:\s\n]*(\d{5,12})/i)
                   || cleanText.match(/\b(\d{8,10})\b/);
    if (instMatch) {
      instalacao = instMatch[1];
    }
  }

  // 4. Tipo de Ligação (Mono, Bi ou Trifásico)
  let tipoLigacao: 'Monofásico' | 'Bifásico' | 'Trifásico' | undefined;
  if (/TRIFÁSI|TRIFASI|3\s*FASES|TRIPOLAR/i.test(cleanText)) {
    tipoLigacao = 'Trifásico';
  } else if (/BIFÁSI|BIFASI|2\s*FASES|BIPOLAR/i.test(cleanText)) {
    tipoLigacao = 'Bifásico';
  } else if (/MONOFÁSI|MONOFASI|1\s*FASE|MONOPOLAR/i.test(cleanText)) {
    tipoLigacao = 'Monofásico';
  }

  // 5. Grupo Tarifário
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

  // 6. Valor Total da Fatura (R$)
  let valorTotalFatura: number | undefined;
  const valorMatch = cleanText.match(/(?:TOTAL\s*A\s*PAGAR|VALOR\s*TOTAL|TOTAL\s*DA\s*CONTA|TOTAL\s*R\$)\s*[:\s]*R?\$?\s*(\d{1,5}[,\.]\d{2})/i);
  if (valorMatch) {
    const cleanValue = valorMatch[1].replace('.', '').replace(',', '.');
    valorTotalFatura = parseFloat(cleanValue);
  }

  // 7. Histórico de Consumo (Extração dos últimos 12 meses)
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

  // 8. Cálculo da Média de Consumo (kWh/mês)
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
