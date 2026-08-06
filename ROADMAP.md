# Roadmap Solar 2.0: Evolução para Plataforma B2B Profissional (SaaS)

Este documento serve como um guia mestre para as próximas implementações do projeto. Qualquer nova funcionalidade solicitada deve, idealmente, seguir as diretrizes deste plano para manter a evolução estruturada e coesa.

## Visão Geral
Atualmente, o Solar 2.0 possui uma base técnica robusta (Next.js, PostgreSQL/Prisma, Autenticação Hierárquica B2B e processamento de planilhas). O objetivo deste roadmap é guiar o projeto da fase de "Calculadora de Dimensionamento" para uma verdadeira **Plataforma Profissional B2B (SaaS)**, com alto valor agregado para vendas e engenharia.

---

## 🚀 Módulo 1: Ferramentas Comerciais (Foco em Vendas)
*Objetivo: Entregar ferramentas que ajudam o Parceiro a fechar mais negócios.*

### 1.1. Proposta Comercial Profissional (Gerador de PDF)
- **Status:** Planejado
- **Descrição:** Além do Memorial Descritivo técnico, gerar um PDF de "Proposta Comercial" focado no cliente final.
- **Funcionalidades Chaves:** 
  - Gráficos de economia acumulada em 25 anos.
  - Cálculo de Payback (ex: "O sistema se paga em 3.5 anos").
  - Retorno sobre Investimento (ROI).
  - Design premium e focado em conversão.

### 1.2. Funil de Vendas (Mini-CRM / Kanban)
- **Status:** Planejado
- **Descrição:** Transformar a simples "Lista de Clientes" em um pipeline de vendas visual.
- **Funcionalidades Chaves:**
  - Board estilo Kanban (Arrastar e Soltar).
  - Colunas sugeridas: *Lead, Orçamento Enviado, Em Negociação, Fechado, Perdido*.
  - Histórico de interações com o cliente.

### 1.3. White-Label (Personalização de Marca)
- **Status:** Planejado
- **Descrição:** Permitir que o Parceiro (B2B) insira sua própria identidade visual.
- **Funcionalidades Chaves:**
  - Upload de Logo (armazenada em bucket ou base64 leve).
  - Seleção de Cor Principal (Primary Color) para a interface do dashboard dos seus técnicos e para os PDFs gerados.

---

## ⚙️ Módulo 2: Precisão Técnica e Engenharia
*Objetivo: Tornar o cálculo automatizado, livre de erros humanos e matematicamente inquestionável.*

### 2.1. Catálogo Integrado de Equipamentos (Banco de Dados)
- **Status:** Planejado
- **Descrição:** Eliminar a digitação manual de especificações de equipamentos.
- **Funcionalidades Chaves:**
  - CRUD administrativo de Módulos Solares (Canadian, Jinko, etc) contendo: Potência, Tensão, Corrente, Área.
  - CRUD administrativo de Inversores (Growatt, Fronius, etc) contendo: Potência Nominal, Corrente Máxima, Quantidade de MPPTs, Entradas por MPPT.
  - Dropdowns na interface de simulação em vez de inputs de texto livre.

### 2.2. Geolocalização e Irradiação Automática (API)
- **Status:** Planejado
- **Descrição:** Automatizar a métrica mais crítica do cálculo fotovoltaico: Horas de Sol Pico (HSP).
- **Funcionalidades Chaves:**
  - Ao digitar o CEP do cliente (ou coordenadas), consultar APIs (Ex: CRESESB, NASA POWER, ou INPE) para obter a irradiação solar média exata daquela localidade.
  - Ajustar automaticamente a geração (kWh/mês) e a eficiência com base nessa variável geográfica real.

### 2.3. Dimensionamento de Sistemas Híbridos (Inversor Híbrido + Baterias)
- **Status:** Planejado (Estudo & Plano Concluídos)
- **Descrição:** Dimensionamento de armazenamento com baterias (LiFePO4) para Peak Shaving (Grupo A) e Time Shifting (Arbitragem Tarifária / Tarifa Branca).
- **Funcionalidades Chaves:**
  - Motor de simulação de despacho diário em resolução de 15 minutos (96 pontos/dia).
  - Cálculo automatizado de potência (kW) e capacidade de energia (kWh) recomendados.
  - Gráfico interativo de despacho no simulador e memorial descritivo.
- **Documentação Técnica:** Veja [Plano de Implementação Híbrido](file:///c:/Luan/Github/Solar-2.0/docs/PLANO_DIMENSIONAMENTO_HIBRIDO.md) e [Estudo de Referência](file:///c:/Luan/Github/Solar-2.0/docs/estudo-dimensionamento-hibrido.md).

---

## 📊 Módulo 3: UX e Inteligência de Dados
*Objetivo: Proporcionar uma experiência de usuário (UX) engajadora e dados valiosos para a gestão da empresa Parceira.*

### 3.1. Dashboard Analítico (Home Page)
- **Status:** Planejado
- **Descrição:** A tela inicial deve ser um painel de indicadores, e não diretamente a calculadora.
- **Funcionalidades Chaves:**
  - Gráficos visuais (usando Recharts ou Chart.js).
  - Métricas: Total de Orçamentos no Mês, Potência Total Simulada (kWp), Taxa de Conversão de Vendas (baseado no CRM).
  - Ranking de Técnicos (quem gerou mais propostas).

### 3.2. Sistema de Status de Instalação (Pós-Venda)
- **Status:** Planejado
- **Descrição:** Para projetos movidos para "Fechado", iniciar um fluxo de gestão de obra.
- **Funcionalidades Chaves:**
  - Etapas de engenharia: *Visita Técnica, Aprovação na Concessionária, Instalação, Homologação/Troca de Relógio*.

### 3.3. Auditoria e Logs de Atividades
- **Status:** Planejado
- **Descrição:** Rastreabilidade completa das ações na plataforma.
- **Funcionalidades Chaves:**
  - Registro de histórico: "O Técnico [Nome] alterou o projeto [X] às [Hora]".
  - Visão gerencial exclusiva para a conta `PARTNER`.

---

> **Nota para o Agente IA (Antigravity):** Antes de iniciar qualquer nova solicitação de implementação de *features*, verifique este arquivo (`ROADMAP.md`) para garantir que o código, arquitetura e UX sugeridos estejam alinhados com a evolução proposta neste documento. Evite criar "puxadinhos" e foque em desenvolver módulos sólidos que se integram a esta visão de longo prazo.
