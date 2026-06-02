import {
  BarChart3,
  Boxes,
  ClipboardCheck,
  Home,
  PackageCheck,
  PackagePlus,
  QrCode,
  ScanLine,
  ShieldCheck,
  Warehouse,
  Wrench,
  type LucideIcon,
} from "lucide-react";

// ── Modelo de navegação ──────────────────────────────────────────────────────
// A sidebar é organizada em seções (rótulo opcional). Cada entrada é um item
// simples (link) ou um grupo colapsável com sub-itens.
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  soon?: boolean;
};

export type NavGroup = {
  label: string;
  icon: LucideIcon;
  children: NavItem[];
};

export type NavEntry = NavItem | NavGroup;

export type NavSection = {
  title?: string;
  entries: NavEntry[];
};

export function isGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry;
}

export const NAV: readonly NavSection[] = [
  {
    entries: [{ href: "/", label: "Início", icon: Home }],
  },
  {
    title: "Estoque & Produção",
    entries: [
      {
        label: "Insumos",
        icon: Boxes,
        children: [
          { href: "/entrada", label: "Entrada", icon: ScanLine },
          { href: "/insumos", label: "Estoque", icon: Warehouse },
          { href: "/insumos/inventario", label: "Inventário", icon: ClipboardCheck },
          { href: "/insumos/cadastro", label: "Cadastro", icon: PackageCheck },
        ],
      },
      { href: "/tipos-kit", label: "Tipos de kit", icon: Wrench },
      { href: "/producao", label: "Produção", icon: PackagePlus, soon: true },
      { href: "/saida", label: "Saída", icon: QrCode, soon: true },
    ],
  },
  {
    title: "Gestão",
    entries: [
      { href: "/eventos", label: "Eventos", icon: BarChart3 },
      { href: "/fiscal", label: "Certificados", icon: ShieldCheck },
      { href: "/dashboard", label: "Gráficos", icon: BarChart3, soon: true },
    ],
  },
] as const;

// ── Atalhos da home (/) ──────────────────────────────────────────────────────
// Lista curada das áreas principais, com descrição para os cards de atalho.
export type ModuleLink = {
  href: string;
  label: string;
  icon: LucideIcon;
  description: string;
  soon?: boolean;
};

export const MODULES: readonly ModuleLink[] = [
  {
    href: "/entrada",
    label: "Entrada",
    icon: ScanLine,
    description: "Bipe o código de barras e confira a nota na SEFAZ.",
  },
  {
    href: "/insumos",
    label: "Estoque",
    icon: Warehouse,
    description: "Saldo dos insumos em estoque, geral e por SPE.",
  },
  {
    href: "/insumos/inventario",
    label: "Inventário",
    icon: ClipboardCheck,
    description: "Conferência física × sistema e saldo de abertura.",
  },
  {
    href: "/insumos/cadastro",
    label: "Cadastro de insumos",
    icon: PackageCheck,
    description: "Catálogo de insumos e cadastro de novos itens.",
  },
  {
    href: "/tipos-kit",
    label: "Tipos de kit",
    icon: Wrench,
    description: "Cadastre kits e suas composições (BOM).",
  },
  {
    href: "/producao",
    label: "Produção",
    icon: PackagePlus,
    description: "Produza lotes: baixa o BOM e gera os QRs.",
    soon: true,
  },
  {
    href: "/saida",
    label: "Saída",
    icon: QrCode,
    description: "Bipe o QR na saída do kit e registre o destino.",
    soon: true,
  },
  {
    href: "/eventos",
    label: "Eventos",
    icon: BarChart3,
    description: "Trilha de auditoria: recebimentos, divergências e recusas.",
  },
  {
    href: "/fiscal",
    label: "Certificados",
    icon: ShieldCheck,
    description: "Certificados digitais (.pfx) por empreendimento.",
  },
] as const;
