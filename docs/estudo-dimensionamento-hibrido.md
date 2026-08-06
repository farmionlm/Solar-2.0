# Estudo de Dimensionamento — Sistemas FV com Inversor Híbrido
## Peak Shaving, Time Shifting e Dimensionamento de Banco de Baterias

---

## 1. Escopo e premissas

Este estudo define a metodologia de cálculo para dimensionamento de sistemas fotovoltaicos com inversor híbrido, cujo banco de baterias tem duas funções principais:

- **Peak Shaving (corte de ponta de demanda):** reduzir o pico de potência importado da rede, seja para respeitar um limite de demanda contratada (Grupo A) ou para reduzir picos de consumo instantâneo.
- **Time Shifting (deslocamento de carga / arbitragem tarifária):** armazenar energia gerada pelo FV (ou comprada em horário barato) para uso em horários de tarifa mais cara (horário de ponta, tarifa branca, bandeira tarifária).

A abordagem recomendada para a aplicação **não é uma fórmula fechada única**, e sim um **motor de simulação de despacho horário/15min**, pois o comportamento real depende da interação entre curva de carga, curva de geração FV e estrutura tarifária ao longo do dia — exatamente como os inversores híbridos operam na prática (modos "Self-Use", "Time of Use", "Peak Shaving" dos fabricantes). Fórmulas fechadas são fornecidas para pré-dimensionamento rápido (estimativa inicial), e a simulação refina o resultado.

---

## 2. Variáveis e dados de entrada

| Símbolo | Descrição | Unidade | Fonte no app |
|---|---|---|---|
| `P_load(t)` | Potência de carga no instante t | kW | Curva de carga (medida, ou estimada a partir do consumo mensal + curva típica por classe) |
| `Δt` | Intervalo de amostragem | h | 0,25 (15 min) ou 1 (horária) |
| `P_PV(t)` | Potência gerada pelo FV | kW | Simulador FV existente (HSP regional / NASA POWER) |
| `P_grid(t)` | Potência trocada com a rede (+import / -export) | kW | Calculado |
| `P_bat(t)` | Potência da bateria (+descarga / -carga) | kW | Calculado (saída do despacho) |
| `SOC(t)` | Estado de carga da bateria | % | Calculado |
| `E_bat_nom` | Capacidade nominal do banco de baterias | kWh | Variável de dimensionamento (saída) |
| `DoD` | Profundidade de descarga admissível | % | 80–90% para LiFePO4 |
| `η_ch`, `η_disch` | Eficiência de carga / descarga | % | ~95–97% cada (LiFePO4 + conversor) |
| `P_target` | Limite de demanda/potência-alvo da rede | kW | Definido pelo cliente/contrato (Grupo A) ou meta de corte (Grupo B) |
| Tarifa | Estrutura horária (ponta/intermediário/fora ponta, ou tarifa branca) | R$/kWh, R$/kW | Cadastro da distribuidora (já mapeado no OCR multidistribuidora do app) |

**Dado mínimo necessário:** curva de carga em resolução ≥ horária. Se o cliente só tiver a fatura mensal (kWh total), o app deve estimar a curva a partir de um **perfil típico de carga** por classe de consumo (residencial, comercial, industrial) escalado para bater com o consumo mensal real — esse perfil típico pode ser cadastrado como biblioteca de curvas de referência.

---

## 3. Peak Shaving — metodologia e fórmulas

**Objetivo:** manter `P_grid(t) ≤ P_target` em todo instante.

Balanço instantâneo de potência:

```
P_grid(t) = P_load(t) − P_PV(t) − P_bat(t)
```

Potência de descarga necessária para respeitar o alvo:

```
P_bat_necessaria(t) = max(0, [P_load(t) − P_PV(t)] − P_target)
```

**Potência nominal do banco (kW) — critério de peak shaving:**

```
P_bat_rated ≥ max_t [ P_bat_necessaria(t) ]   (para todo t do dia/mês crítico)
```

**Energia necessária por evento de corte (kWh):** para cada janela contínua onde há corte (t1 → t2):

```
E_shave_evento = Σ (t1 a t2) P_bat_necessaria(t) × Δt
```

**Capacidade nominal (kWh) — critério de peak shaving:**

```
E_bat_nom_shaving ≥ E_shave_evento_max / (DoD × η_disch)
```

onde `E_shave_evento_max` é o maior evento de corte do dia (ou do ciclo entre recargas), não a soma de todos os eventos do mês — a bateria recarrega entre eventos (à noite, fora de ponta, ou por PV ao meio-dia).

> **Nota Grupo A:** a demanda faturada é a **maior demanda registrada em qualquer intervalo de 15 min do mês** (Res. ANEEL). Logo, `P_target` deve ser definido como a demanda contratada (ou um valor abaixo dela com margem de segurança), e a simulação deve rodar sobre o mês inteiro (ou o dia historicamente mais crítico) para garantir que nenhum intervalo de 15 min ultrapasse o alvo.

---

## 4. Time Shifting — metodologia e fórmulas

**Objetivo:** suprir o consumo em horário de tarifa cara (ponta, ou período "branco" caro) com energia armazenada previamente (excedente FV do meio-dia, ou energia comprada em horário barato).

Energia a deslocar (por dia):

```
E_shift = Σ (t no horário caro) [ P_load(t) − P_PV(t) ]⁺ × Δt
```

**Capacidade nominal (kWh) — critério de time shifting:**

```
E_bat_nom_ts ≥ E_shift / (DoD × η_disch)
```

**Potência de carga necessária (kW)** para recarregar totalmente o banco na janela disponível (excedente FV do meio-dia + horário fora de ponta):

```
P_charge_rated ≥ E_bat_nom_ts / (Δt_janela_recarga × η_ch)
```

---

## 5. Dimensionamento combinado (peak shaving + time shifting)

Os dois usos compartilham o mesmo banco de baterias, então **não se somam ingenuamente**. O dimensionamento correto exige rodar o **ciclo diário completo** e verificar o pior caso de energia útil descarregada entre duas recargas consecutivas relevantes:

```
E_bat_nom = max sobre o dia [ energia descarregada acumulada entre recargas ] / (DoD × η_disch)
```

Isso é obtido diretamente como subproduto da simulação de despacho (seção 6) — o `SOC(t)` mínimo atingido ao longo do dia indica a capacidade mínima necessária:

```
E_bat_nom_final = E_bat_nom_tentativa × (SOC_inicial − SOC_min_atingido) / (1 − SOC_reserva)
```

**Potência nominal do inversor (lado bateria):**

```
P_bat_rated_final = max( P_bat_rated_peak_shaving , P_bat_rated_time_shifting )
```

**Margem de segurança recomendada** (aplicar sobre `E_bat_nom_final`):
- Degradação de fim de vida útil (EOL, ~10 anos): dividir por 0,80 (fabricante garante 80% da capacidade no fim da vida)
- Derating térmico (ambientes sem climatização, ES tem clima quente): +5 a 10%
- Margem operacional de projeto: +10%

```
E_bat_projeto = E_bat_nom_final / 0,80 × 1,10
```

Arredondar para o módulo comercial mais próximo (ex.: baterias LiFePO4 empilháveis de 5,12 kWh / 10,24 kWh / 15,36 kWh — já usado no simulador do app).

---

## 6. Algoritmo de despacho (motor de simulação) — pseudocódigo

```javascript
function simulateDispatch({
  loadProfile,      // array de kW por intervalo (ex: 96 pontos de 15min/dia)
  pvProfile,        // array de kW por intervalo (mesma resolução)
  tariffPeriods,    // array com o período tarifário de cada intervalo: 'ponta'|'intermediario'|'fora_ponta'
  dt,               // horas por intervalo (ex: 0.25)
  batCapacityKWh,   // capacidade nominal candidata (kWh) - variável de busca
  batPowerKW,       // potência nominal do inversor/bateria (kW)
  dod,              // profundidade de descarga (ex: 0.9)
  etaCh, etaDisch,  // eficiências
  targetPeakKW,     // meta de peak shaving (null se não aplicável)
  gridChargeAllowed // permitir carregar da rede em horário barato
}) {
  const socMin = 1 - dod;
  let soc = 1.0; // inicia cheio
  const socReserve = socMin;
  const results = [];
  let minSocReached = 1.0;

  for (let i = 0; i < loadProfile.length; i++) {
    const pLoad = loadProfile[i];
    const pPV = pvProfile[i];
    const period = tariffPeriods[i];
    const pNet = pLoad - pPV; // >0 = déficit, <0 = excedente FV

    let pBat = 0; // + descarga, - carga
    const socKWh = soc * batCapacityKWh;
    const availableDischargeKWh = Math.max(0, socKWh - socReserve * batCapacityKWh);
    const availableChargeKWh = Math.max(0, batCapacityKWh - socKWh);

    if (pNet < 0) {
      // Excedente de PV -> carregar bateria primeiro
      const pSurplus = -pNet;
      const pChargeMax = Math.min(pSurplus, batPowerKW, availableChargeKWh / (dt * etaCh));
      pBat = -pChargeMax;
    } else {
      // Déficit de carga -> decidir se bateria cobre
      const precisaCortarPico = targetPeakKW !== null && pNet > targetPeakKW;
      const horarioCaro = period === 'ponta';

      if (precisaCortarPico || horarioCaro) {
        const pNecessaria = precisaCortarPico ? (pNet - targetPeakKW) : pNet;
        const pDischargeMax = Math.min(pNecessaria, batPowerKW, availableDischargeKWh * etaDisch / dt);
        pBat = pDischargeMax;
      } else if (gridChargeAllowed && period === 'fora_ponta' && soc < 1.0) {
        // Oportunidade de carregar barato da rede (opcional, se economicamente favorável)
        const pChargeMax = Math.min(batPowerKW, availableChargeKWh / (dt * etaCh));
        pBat = -pChargeMax;
      }
    }

    // Atualiza SOC
    if (pBat >= 0) {
      soc -= (pBat / etaDisch) * dt / batCapacityKWh;
    } else {
      soc += (-pBat * etaCh) * dt / batCapacityKWh;
    }
    soc = Math.max(socReserve, Math.min(1.0, soc));
    minSocReached = Math.min(minSocReached, soc);

    const pGrid = pNet - pBat; // resto vem/vai da rede
    results.push({ i, pLoad, pPV, pBat, pGrid, soc, period });
  }

  return { results, minSocReached, peakGridReached: Math.max(...results.map(r => r.pGrid)) };
}
```

---

## 7. Recomendações para implementação no app

1. Criar módulo `batteryDispatchEngine.ts` isolado (backend/lib), reutilizável tanto pelo simulador de dimensionamento quanto por relatórios de ROI.
2. Entrada: perfil de carga (medido ou estimado por classe), perfil PV, estrutura tarifária, meta de corte de pico.
3. Saída: capacidade recomendada (kWh), potência recomendada (kW), economia estimada de demanda e de energia deslocada, gráfico de despacho horário.
