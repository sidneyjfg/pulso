export type DocPage = {
  slug: string;
  title: string;
  description: string;
  file: string;
  group: "Comece aqui" | "Fundacao" | "Operacao" | "Fiscal";
};

export const docPages: DocPage[] = [
  {
    slug: "overview",
    title: "Visao geral",
    description: "Como o ERP esta organizado e como navegar pela API.",
    file: "overview.mdoc",
    group: "Comece aqui"
  },
  {
    slug: "auth",
    title: "Autenticacao",
    description: "Login, contexto ativo, tokens e permissao.",
    file: "auth.mdoc",
    group: "Fundacao"
  },
  {
    slug: "tenant-context",
    title: "Multiempresa",
    description: "Organization, Company, Branch e isolamento por tenant.",
    file: "tenant-context.mdoc",
    group: "Fundacao"
  },
  {
    slug: "foundation",
    title: "Empresas e usuarios",
    description: "Companies, branches, warehouses, roles e usuarios.",
    file: "foundation.mdoc",
    group: "Fundacao"
  },
  {
    slug: "products",
    title: "Produtos",
    description: "Produtos, categorias, codigos de barras e preco por loja.",
    file: "products.mdoc",
    group: "Operacao"
  },
  {
    slug: "people",
    title: "Clientes e fornecedores",
    description: "Cadastros simples com isolamento por empresa.",
    file: "people.mdoc",
    group: "Operacao"
  },
  {
    slug: "inventory",
    title: "Estoque",
    description: "Saldos, movimentos, transferencias e inventario fisico.",
    file: "inventory.mdoc",
    group: "Operacao"
  },
  {
    slug: "sales-purchases",
    title: "Vendas e compras",
    description: "Venda, cancelamento, compra e recebimento de estoque.",
    file: "sales-purchases.mdoc",
    group: "Operacao"
  },
  {
    slug: "dashboard",
    title: "Dashboard",
    description: "Metricas acionaveis para a loja ativa.",
    file: "dashboard.mdoc",
    group: "Operacao"
  },
  {
    slug: "fiscal",
    title: "Fiscal",
    description: "Perfis fiscais, pendencias e regras versionadas.",
    file: "fiscal.mdoc",
    group: "Fiscal"
  },
  {
    slug: "admin-health",
    title: "Admin e saude",
    description: "Rotas administrativas globais, health check e readiness.",
    file: "admin-health.mdoc",
    group: "Comece aqui"
  },
  {
    slug: "errors",
    title: "Erros",
    description: "Padrao de resposta, validacao e autorizacao.",
    file: "errors.mdoc",
    group: "Comece aqui"
  }
];

export function getDocPage(slug: string) {
  return docPages.find((page) => page.slug === slug);
}

export function groupedDocPages() {
  return docPages.reduce<Record<DocPage["group"], DocPage[]>>(
    (groups, page) => {
      groups[page.group].push(page);
      return groups;
    },
    {
      "Comece aqui": [],
      Fundacao: [],
      Operacao: [],
      Fiscal: []
    }
  );
}
