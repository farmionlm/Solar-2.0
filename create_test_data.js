const XLSX = require('xlsx');

const data = [
  ['Código de Instalação', 'Nome da Unidade', 'Consumo Médio Mensal (kWh)'],
  ['UC-001', 'Escola Municipal A', 1500],
  ['UC-002', 'Escola Municipal B', 2200],
  ['UC-003', 'Escola Municipal C', 800],
];

const ws = XLSX.utils.aoa_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Consumo');
XLSX.writeFile(wb, 'c:/Users/luan_/.gemini/antigravity/scratch/solar-v2/test_data.xlsx');
console.log('Planilha de teste criada!');
