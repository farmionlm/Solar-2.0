# Plano de Implementação: Tema Claro (Light Mode) — Solar 2.0

> **Status**: Implementado com sucesso.  
> **Data de Atualização**: 22 de Julho de 2026  

Este documento descreve o plano detalhado para implementar o **Tema Claro (Light Mode)** e o alternador de temas (Dark/Light Switcher) no sistema **Solar 2.0**, seguindo rigorosamente as especificações visuais solicitadas.

---

## 🎨 1. Diretrizes de Cores Solicitadas

* **Fundo Principal (`--background`)**: `#f2f2f2` (Cinza claro suave / Off-white para conforto visual).
* **Texto Principal (`--foreground`)**: `#555555` (Cinza chumbo sóbrio para excelente legibilidade sem contraste excessivo).
* **Superfície dos Cards (`--card`)**: `#ffffff` (Branco puro para destacar os cards em relação ao fundo `#f2f2f2`).
* **Bordas (`--border`)**: `#e2e8f0` ou `#e0e0e0` (Linhas de divisão sutis e limpas).
* **Texto Secundário (`--muted-foreground`)**: `#777777` (Cinza médio para rótulos e legendas secundárias).
* **Destaque Primário (`--primary`)**: `#2563eb` ou `#1e40af` (Azul corporativo sóbrio e elegante).
* **Menu Lateral (`Sidebar`)**: **Mantém a cor escura atual** (`oklch(0.17 0.01 240)` / tom escuro original) em ambos os temas (Claro e Escuro).

---

## 🛠️ 2. Mapeamento de Tokens CSS (`src/app/globals.css`)

Quando for implementar, atualize o bloco `:root` em `[src/app/globals.css](file:///c:/Luan/Github/Solar-2.0/src/app/globals.css)` da seguinte forma:

```css
:root {
  /* Fundo e Texto Padrão (Tema Claro) */
  --background: #f2f2f2;
  --foreground: #555555;
  
  /* Cards e Modais */
  --card: #ffffff;
  --card-foreground: #444444;
  --popover: #ffffff;
  --popover-foreground: #444444;
  
  /* Sidebar (Menu Lateral - Mantém a cor escura atual) */
  --sidebar: oklch(0.17 0.01 240);
  --sidebar-foreground: oklch(0.92 0.01 240);
  --sidebar-border: oklch(0.24 0.01 240);
  --sidebar-accent: oklch(0.22 0.01 240);
  --sidebar-accent-foreground: oklch(0.98 0 0);
  
  /* Cores de Ação e Destaque */
  --primary: oklch(0.55 0.12 240); /* Azul sóbrio */
  --primary-foreground: #ffffff;
  --secondary: #e5e5e5;
  --secondary-foreground: #333333;
  
  /* Estados Muted e Bordas */
  --muted: #e8e8e8;
  --muted-foreground: #777777;
  --border: #e0e0e0;
  --input: #e0e0e0;
  --ring: oklch(0.55 0.12 240);
  --radius: 0.75rem;
}

/* O tema escuro atual passará para a classe .dark */
.dark {
  --background: oklch(0.13 0.01 240);
  --foreground: oklch(0.92 0.01 240);
  --card: oklch(0.17 0.01 240);
  --card-foreground: oklch(0.92 0.01 240);
  --popover: oklch(0.17 0.01 240);
  --popover-foreground: oklch(0.92 0.01 240);
  --primary: oklch(0.62 0.09 240);
  --primary-foreground: oklch(0.98 0 0);
  --border: oklch(0.24 0.01 240);

  /* Sidebar no tema escuro (idêntico ao tema claro) */
  --sidebar: oklch(0.17 0.01 240);
  --sidebar-foreground: oklch(0.92 0.01 240);
  --sidebar-border: oklch(0.24 0.01 240);
}
```

---

## ⚙️ 3. Mecanismo de Alternância de Tema (Theme Switcher)

### Passo 1: Adicionar o Provedor de Tema (`ThemeProvider`)
Utilizar a biblioteca `next-themes` no arquivo `[src/app/layout.tsx](file:///c:/Luan/Github/Solar-2.0/src/app/layout.tsx)`:

```tsx
import { ThemeProvider } from "next-themes";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Passo 2: Adicionar o Botão de Alternância no Menu (`Navbar` / `Sidebar`)
Criar um botão com ícones `Sun` / `Moon` no componente `[src/components/layout/Navbar.tsx](file:///c:/Luan/Github/Solar-2.0/src/components/layout/Navbar.tsx)`:

```tsx
"use client";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="p-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground transition-all"
      title="Alternar Tema Claro / Escuro"
    >
      {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
    </button>
  );
}
```

---

## 🔍 4. Passos de Revisão de Código na Execução Futura

Quando for aplicar este plano no futuro, atente-se para:
1. **Menu Lateral (`Sidebar.tsx`)**: Utilizar tokens de sidebar (`bg-sidebar`, `text-sidebar-foreground`, `border-sidebar-border`) para garantir que o menu lateral mantenha o fundo escuro original em ambos os temas.
2. **Classes Tailwind Hardcoded**: Substituir classes puras como `text-white` por `text-foreground` e `bg-black` por `bg-card` em páginas com fundo fixo escuro.
3. **Gráficos Recharts**: Garantir que as linhas de grade (`CartesianGrid`) e textos de eixos do Recharts (`XAxis`, `YAxis`) utilizem a cor da variável `var(--muted-foreground)` para manter alta legibilidade em ambos os temas.
4. **Logotipos / Assinaturas**: Garantir contraste dos ícones e marcas tanto no fundo claro (`#f2f2f2`) quanto no fundo escuro.

---

## 📁 Localização deste Arquivo
Este documento está salvo permanentemente na raiz do repositório em:
`PLANO_TEMA_CLARO.md`
