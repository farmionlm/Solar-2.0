# Plano de Implementação — Dimensionamento de Sistemas Híbridos (Peak Shaving & Time Shifting)

> **Nota para Agentes de IA:** Este documento contém o plano técnico detalhado para a implementação futura do módulo de dimensionamento de inversores híbridos com banco de baterias (BESS) no Solar 2.0. Leia este plano integralmente antes de iniciar o desenvolvimento desta funcionalidade.

---

## 1. Visão Geral e Contexto

Este plano define a arquitetura, metodologia e estratégia de integração para adicionar o suporte a **Sistemas Fotovoltaicos Híbridos (Inversor Híbrido + Banco de Baterias LiFePO4)** no simulador do Solar 2.0.

As duas principais funções modeladas são:
1. **Peak Shaving (Corte de Ponta de Demanda):** Redução de picos de potência para respeitar a demanda contratada em clientes do **Grupo A** (evitando cobrança de ultrapassagem a 2x a tarifa).
2. **Time Shifting (Deslocamento de Carga / Arbitragem Tarifária):** Armazenamento de excedente solar diurno (ou energia comprada em horário barato) para consumo em horários de tarifa elevada (Horário de Ponta ou Tarifa Branca).

---

## 2. Revisão Técnica do Estudo e Algoritmo de Despacho

O cálculo utiliza um **motor de simulação de despacho temporal (resolução de 15 minutos / 96 pontos por dia)** em vez de fórmulas estáticas.

### Ajustes Críticos Incorporados no Algoritmo:
- **Prioridade Absoluta ao Peak Shaving:** Em instalações Grupo A, a bateria prioriza evitar estouro de demanda sobre o time shifting tarifário.
- **Trava de Carga pela Rede ($P_{\text{target}}$):** Ao recarregar da rede no horário Fora de Ponta, a potência de carga somada ao consumo instantâneo não pode ultrapassar o limite contratado ($P_{\text{target}}$).
- **Validação de C-Rate:** Validação se o módulo comercial de bateria suporta a taxa de carga/descarga necessária ($P_{\text{bat\_rated}}$).
- **Margens de Projeto Industriais:** Aplicação de profundidade de descarga ($DoD = 80\text{–}90\%$), eficiência de conversão ($\eta_{\text{ch}} = \eta_{\text{disch}} \approx 95\text{–}97\%$), degradação de fim de vida ($EOL = 80\%$) e derating térmico/operacional ($+10\%$).

---

## 3. Arquitetura Proposta e Arquivos no Codebase

### A. Módulo Core & Motor de Simulação (`src/lib/` e `src/types/`)
- `src/types/batteryTypes.ts`: Definições de interfaces (`BatteryModule`, `HybridInverter`, `DispatchSimulationInput`, `DispatchSimulationOutput`).
- `src/lib/batteryDispatchEngine.ts`: Motor de despacho em TypeScript puro, com funções:
  - `simulateDispatch()`: Roda o despacho para 96 intervalos de 15 min.
  - `sizeBatteryHybrid()`: Busca iterativa pelo tamanho ótimo do banco em passos comerciais (ex.: 5,12 kWh).
  - `generateDefaultLoadProfile()`: Gera curvas típicas de consumo por classe (Residencial, Comercial Diurno/Noturno, Industrial) escaladas pelo kWh mensal.

### B. Interface do Usuário (`src/components/simulador/` e `src/app/simulador/`)
- `src/components/simulador/BatterySizingSection.tsx`: Componente de configuração de armazenamento no simulador.
- `src/components/simulador/DispatchChart.tsx`: Gráfico de 24h (96 pontos) mostrando em tempo real Carga, PV, Bateria (Carga/Descarga), Rede e SOC %.
- `src/app/simulador/page.tsx`: Integração da etapa híbrida e recálculo de CAPEX, Payback e ROI no simulador.

### C. Geração de Proposta & Memorial (`src/utils/`)
- `src/utils/generateMemorial.ts` e `src/utils/generateMemorialDocx.ts`: Inclusão da seção técnica de armazenamento e gráfico de despacho no PDF/DOCX da proposta.
- `src/utils/solarMath.ts`: Métricas financeiras ajustadas para economia de demanda + arbitragem tarifária.

---

## 4. Estrutura do Motor de Despacho (Pseudocódigo TypeScript)

```typescript
export interface DispatchInput {
  loadProfile: number[];       // kW em 96 pontos (15 min)
  pvProfile: number[];         // kW em 96 pontos (15 min)
  tariffPeriods: ('ponta' | 'intermediario' | 'fora_ponta')[];
  dt: number;                  // 0.25h
  batCapacityKWh: number;
  batPowerKW: number;
  dod: number;                 // ex: 0.9
  etaCh: number;               // ex: 0.96
  etaDisch: number;            // ex: 0.96
  targetPeakKW: number | null; // Meta Peak Shaving (Grupo A)
  gridChargeAllowed: boolean;  // Carga na rede em fora-ponta
}

export function simulateDispatch(input: DispatchInput) {
  // Executa o balanço P_grid(t) = P_load(t) - P_PV(t) - P_bat(t)
  // Garante prioridade ao targetPeakKW e calcula SOC(t)
}
```

---

## 5. Plano de Testes e Validação

1. **Testes Unitários:** Validação de Peak Shaving em simulações com picos de demanda superiores a $P_{\text{target}}$.
2. **Testes de Conservação:** Garantir que o balanço de energia diário feche sem desvios.
3. **Validação de Bancos Comerciais:** Validação contra catálogos reais (ex: Deye, Growatt, BYD 5.12 kWh).
