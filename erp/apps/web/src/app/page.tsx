"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Activity,
  ArrowRight,
  ArrowRightLeft,
  BarChart3,
  Bell,
  Box,
  Boxes,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Check,
  ClipboardCheck,
  CreditCard,
  Eye,
  FileText,
  Gauge,
  ImageIcon,
  Layers3,
  Landmark,
  Pencil,
  Loader2,
  LogOut,
  Menu,
  PackageCheck,
  PackagePlus,
  Plug,
  ReceiptText,
  RefreshCw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingUp,
  Upload,
  Users,
  X
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  createAlertRule,
  createCategory,
  createBranch,
  createProduct,
  createImportJob,
  createIntegrationConnection,
  createInventoryCount,
  cancelPurchase,
  cancelFinancialEntry,
  cancelSale,
  completeIfoodOauth,
  createProductFromIfoodItem,
  createPurchase,
  createReportJob,
  createSale,
  createStockTransfer,
  createTaxRule,
  createUser,
  createWarehouse,
  getBranches,
  getCategories,
  getDashboard,
  getIfoodCatalogItems,
  getIfoodOrders,
  getIfoodPendingItems,
  getIfoodSaleExternalDetails,
  getIfoodCancellationReasons,
  getIfoodIntegrationHealth,
  getCustomers,
  getMe,
  getPaginatedResource,
  getPricingSettings,
  getProducts,
  getRoles,
  getSuppliers,
  getStockBalances,
  getUsers,
  getUserPreferences,
  login,
  logoutSession,
  register,
  linkIfoodCatalogItem,
  pollIfoodEvents,
  reprocessIfoodEvents,
  resolveIfoodPendingItem,
  receivePurchase,
  settleFinancialEntry,
  refreshSession,
  startIfoodOauth,
  syncIfoodCatalog,
  runIfoodOrderAction,
  upsertProductFiscalProfile,
  updatePricingSettings,
  updateCategoryActive,
  updateIntegrationConnection,
  updateProduct,
  updateProductActive,
  switchContext,
  updateUserAccess,
  updateUserPreferences,
  type BranchListResponse,
  type CategoryListResponse,
  type DashboardResponse,
  type GenericListItem,
  type GenericListResponse,
  type IfoodOauthStartResponse,
  type IfoodOrderActionBody,
  type LoginBody,
  type LoginResponse,
  type MeResponse,
  type PersonListResponse,
  type PricingSettingsResponse,
  type ProductListResponse,
  type RegisterBody,
  type RoleListResponse,
  type StockBalanceListResponse,
  type UserListResponse
} from "./api-client";

const loginFormSchema = z.object({
  email: z.string().email("Informe um e-mail válido.").max(254),
  password: z.string().min(1, "Informe sua senha.").max(256)
});

const registerFormSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome.").max(120),
  email: z.string().trim().email("Informe um e-mail válido.").max(254),
  password: z.string().min(10, "Use pelo menos 10 caracteres.").max(256),
  companyName: z.string().trim().min(2, "Informe o nome da empresa.").max(160),
  branchName: z.string().trim().min(2, "Informe o nome da loja.").max(120)
});

const categoryFormSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da categoria.").max(120, "Use no máximo 120 caracteres.")
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 2
});

const numberFormatter = new Intl.NumberFormat("pt-BR");

function money(value: string | number) {
  return currencyFormatter.format(Number(value));
}

type StoredSession = {
  accessToken: string;
};

function LogoMark({ className = "" }: { className?: string }) {
  return (
    <span className={`relative flex shrink-0 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-emerald-100 ${className}`} aria-hidden="true">
      <Image src="/brand/pulso-mark.png" alt="" width={192} height={192} sizes="48px" className="h-full w-full object-contain p-1" />
    </span>
  );
}

function BrandMark({ compact = false, priority = false }: { compact?: boolean; priority?: boolean }) {
  if (compact) {
    return <LogoMark className="h-10 w-10" />;
  }

  return (
    <Image
      src="/brand/pulso-logo.webp"
      alt="Pulso ERP"
      width={256}
      height={71}
      sizes="(max-width: 640px) 124px, 152px"
      priority={priority}
      className="h-auto w-[136px] sm:w-[152px]"
    />
  );
}

function ModernSwitch({
  checked,
  onCheckedChange,
  label,
  disabled = false
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={`group relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border p-1 transition-[transform,background-color,border-color,box-shadow] duration-200 ease-[var(--ease-out)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
        checked
          ? "border-emerald-500 bg-emerald-600 shadow-[0_0_0_4px_rgba(16,185,129,0.10),0_8px_18px_rgba(16,185,129,0.20)]"
          : "border-slate-200 bg-slate-100 shadow-inner"
      }`}
    >
      <span className={`absolute inset-y-1 rounded-full transition-opacity duration-200 ${checked ? "left-1 right-6 bg-white/10 opacity-100" : "left-6 right-1 bg-white opacity-60"}`} />
      <span
        className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-[transform,color] duration-200 ease-[var(--ease-out)] ${
          checked ? "translate-x-6 text-emerald-700" : "translate-x-0 text-slate-400"
        }`}
      >
        {checked ? <Check aria-hidden="true" size={13} strokeWidth={3} /> : <X aria-hidden="true" size={13} strokeWidth={3} />}
      </span>
    </button>
  );
}

function LoginForm({ onLoggedIn }: { onLoggedIn: (session: LoginResponse) => void }) {
  const form = useForm<LoginBody>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "admin@local.test",
      password: "ChangeMe123!"
    }
  });

  const mutation = useMutation({
    mutationFn: (body: LoginBody) => login(body),
    onSuccess: onLoggedIn
  });

  return (
      <form className="grid gap-3" onSubmit={form.handleSubmit((body) => mutation.mutate(body))} noValidate>
        <label className="grid gap-1 text-sm font-medium">
          E-mail
          <input
            type="email"
            autoComplete="email"
            className="rounded-md border border-border px-3 py-2 font-normal outline-none transition-shadow duration-150 ease-[var(--ease-out)] focus:ring-2 focus:ring-emerald-500"
            {...form.register("email")}
          />
        </label>
        {form.formState.errors.email ? <p className="text-sm text-red-600">{form.formState.errors.email.message}</p> : null}

        <label className="grid gap-1 text-sm font-medium">
          Senha
          <input
            type="password"
            autoComplete="current-password"
            className="rounded-md border border-border px-3 py-2 font-normal outline-none transition-shadow duration-150 ease-[var(--ease-out)] focus:ring-2 focus:ring-emerald-500"
            {...form.register("password")}
          />
        </label>
        {form.formState.errors.password ? <p className="text-sm text-red-600">{form.formState.errors.password.message}</p> : null}

        {mutation.error ? <p className="text-sm text-red-600">{mutation.error.message}</p> : null}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-[transform,background-color,box-shadow] duration-150 ease-[var(--ease-out)] hover:bg-emerald-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          {mutation.isPending ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : null}
          Entrar na demonstração
          {!mutation.isPending ? <ArrowRight aria-hidden="true" size={16} /> : null}
        </button>
      </form>
  );
}

function SignUpForm({ onLoggedIn }: { onLoggedIn: (session: LoginResponse) => void }) {
  const form = useForm<RegisterBody>({
    resolver: zodResolver(registerFormSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      companyName: "",
      branchName: "Loja Principal"
    }
  });

  const mutation = useMutation({
    mutationFn: (body: RegisterBody) => register(body),
    onSuccess: onLoggedIn
  });

  return (
    <form className="grid gap-3" onSubmit={form.handleSubmit((body) => mutation.mutate(body))} noValidate>
      <label className="grid gap-1 text-sm font-medium">
        Nome
        <input
          type="text"
          autoComplete="name"
          placeholder="Seu nome"
          className="rounded-md border border-border px-3 py-2 font-normal outline-none transition-shadow duration-150 ease-[var(--ease-out)] focus:ring-2 focus:ring-emerald-500"
          {...form.register("name")}
        />
      </label>
      {form.formState.errors.name ? <p className="text-sm text-red-600">{form.formState.errors.name.message}</p> : null}
      <label className="grid gap-1 text-sm font-medium">
        E-mail
        <input
          type="email"
          autoComplete="email"
          placeholder="voce@empresa.com.br"
          className="rounded-md border border-border px-3 py-2 font-normal outline-none transition-shadow duration-150 ease-[var(--ease-out)] focus:ring-2 focus:ring-emerald-500"
          {...form.register("email")}
        />
      </label>
      {form.formState.errors.email ? <p className="text-sm text-red-600">{form.formState.errors.email.message}</p> : null}
      <label className="grid gap-1 text-sm font-medium">
        Senha
        <input
          type="password"
          autoComplete="new-password"
          placeholder="Mínimo 10 caracteres"
          className="rounded-md border border-border px-3 py-2 font-normal outline-none transition-shadow duration-150 ease-[var(--ease-out)] focus:ring-2 focus:ring-emerald-500"
          {...form.register("password")}
        />
      </label>
      {form.formState.errors.password ? <p className="text-sm text-red-600">{form.formState.errors.password.message}</p> : null}
      <label className="grid gap-1 text-sm font-medium">
        Empresa
        <input
          type="text"
          autoComplete="organization"
          placeholder="Nome da sua empresa"
          className="rounded-md border border-border px-3 py-2 font-normal outline-none transition-shadow duration-150 ease-[var(--ease-out)] focus:ring-2 focus:ring-emerald-500"
          {...form.register("companyName")}
        />
      </label>
      {form.formState.errors.companyName ? <p className="text-sm text-red-600">{form.formState.errors.companyName.message}</p> : null}
      <label className="grid gap-1 text-sm font-medium">
        Loja
        <input
          type="text"
          autoComplete="off"
          placeholder="Loja Principal"
          className="rounded-md border border-border px-3 py-2 font-normal outline-none transition-shadow duration-150 ease-[var(--ease-out)] focus:ring-2 focus:ring-emerald-500"
          {...form.register("branchName")}
        />
      </label>
      {form.formState.errors.branchName ? <p className="text-sm text-red-600">{form.formState.errors.branchName.message}</p> : null}
      {mutation.error ? <p className="text-sm text-red-600">{mutation.error.message}</p> : null}
      <button
        type="submit"
        disabled={mutation.isPending}
        className="mt-2 inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white transition-[transform,background-color] duration-150 ease-[var(--ease-out)] hover:bg-slate-800 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
      >
        {mutation.isPending ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : null}
        Criar conta e entrar
        {!mutation.isPending ? <ArrowRight aria-hidden="true" size={16} /> : null}
      </button>
      <p className="text-center text-xs leading-5 text-muted-foreground">
        Ao criar a conta, o Pulso prepara sua empresa, loja e estoque principal automaticamente.
      </p>
    </form>
  );
}

function AuthDialog({
  open,
  mode,
  onModeChange,
  onClose,
  onLoggedIn
}: {
  open: boolean;
  mode: "login" | "signup";
  onModeChange: (mode: "login" | "signup") => void;
  onClose: () => void;
  onLoggedIn: (session: LoginResponse) => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="custom-scrollbar fixed inset-0 z-50 overflow-y-auto bg-slate-950/55 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-title"
    >
      <section className="auth-card-enter mx-auto grid h-[calc(100svh-3rem)] min-h-0 w-full max-w-4xl overflow-hidden rounded-xl border border-white/20 bg-white text-slate-950 shadow-2xl shadow-slate-950/30 md:max-h-[760px] md:grid-cols-[0.92fr_1.08fr]">
        <div className="custom-scrollbar hidden min-h-0 max-h-full overflow-y-auto overscroll-contain bg-slate-950 p-6 text-white md:block">
          <div className="inline-flex rounded-xl bg-white px-3 py-2">
            <BrandMark />
          </div>
          <h2 className="mt-10 max-w-sm text-3xl font-semibold tracking-normal text-pretty">
            Tenha o Pulso das suas vendas antes do fechamento do mês.
          </h2>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Acompanhe estoque, vendas, lojas e pendências com sinais claros para agir no mesmo dia.
          </p>
          <div className="mt-8 grid gap-3">
            {[
              ["R$ 3.840,00/mês", "economia estimada na operação"],
              ["7 produtos", "pedindo reposição agora"],
              ["30s", "para abrir a demonstração local"]
            ].map(([value, label]) => (
              <article key={label} className="rounded-lg border border-white/10 bg-white/5 p-4">
                <p className="text-xl font-semibold tabular-nums">{value}</p>
                <p className="mt-1 text-sm text-slate-300">{label}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="custom-scrollbar relative min-h-0 max-h-full overflow-y-auto overscroll-contain p-5 [scrollbar-gutter:stable] sm:p-7">
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar autenticação"
            className="absolute right-4 top-4 rounded-md p-2 text-slate-500 transition-[transform,background-color,color] duration-150 ease-[var(--ease-out)] hover:bg-slate-100 hover:text-slate-950 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <X aria-hidden="true" size={18} />
          </button>

          <div className="mx-auto mb-5 flex max-w-sm flex-col items-center text-center">
            <LogoMark className="h-12 w-12 rounded-full" />
            <h2 id="auth-title" className="mt-4 text-2xl font-semibold tracking-normal">
              {mode === "login" ? "Entrar no Pulso" : "Criar acesso ao Pulso"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {mode === "login" ? "Use a demonstração local para sentir o fluxo real do ERP." : "Deixe os dados principais para preparar seu onboarding."}
            </p>
          </div>

          <div className="mb-5 grid grid-cols-2 rounded-lg border border-border bg-slate-50 p-1">
            {[
              ["login", "Entrar"],
              ["signup", "Criar conta"]
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => onModeChange(value as "login" | "signup")}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-[transform,background-color,color] duration-150 ease-[var(--ease-out)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  mode === value ? "bg-white text-slate-950 shadow-sm" : "text-muted-foreground hover:text-slate-950"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === "login" ? <LoginForm onLoggedIn={onLoggedIn} /> : <SignUpForm onLoggedIn={onLoggedIn} />}

          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">ou</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-slate-950 transition-[transform,border-color,background-color] duration-150 ease-[var(--ease-out)] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Activity aria-hidden="true" size={16} />
            Ver preview sem entrar
          </button>
        </div>
      </section>
    </div>
  );
}

function MarketingHome({ onLoggedIn }: { onLoggedIn: (session: LoginResponse) => void }) {
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const savings = {
    stockWaste: 1860,
    missedSales: 1240,
    rework: 740
  };
  const monthlySavings = savings.stockWaste + savings.missedSales + savings.rework;

  const benefits = [
    {
      icon: PackageCheck,
      title: "Estoque que fecha a conta",
      description: "Cada entrada, venda, ajuste e transferência gera histórico. Nada some sem explicação."
    },
    {
      icon: Store,
      title: "Empresa e loja sem confusão",
      description: "Troque de loja no topo e veja preço, estoque, vendas e permissões do contexto certo."
    },
    {
      icon: FileText,
      title: "Fiscal preparado",
      description: "Cadastre simples hoje e resolva pendências fiscais em uma central própria quando precisar."
    },
    {
      icon: Upload,
      title: "Migração sem trauma",
      description: "CSV e XLSX passam por prévia, validação e correção antes de entrar nos cadastros oficiais."
    },
    {
      icon: ShieldCheck,
      title: "Segurança dos seus dados",
      description: "Seus dados ficam protegidos e cada pessoa acessa apenas o que precisa para trabalhar."
    },
    {
      icon: Layers3,
      title: "Pronto para canais",
      description: "A base já nasce preparada para integração iFood com operação simples, sincronização de catálogo e pedidos."
    }
  ];

  function openAuth(mode: "login" | "signup") {
    setAuthMode(mode);
    setAuthOpen(true);
  }

  return (
    <main id="main" className="min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_44%,#f8fafc_100%)]">
      <header className="sticky top-0 z-20 border-b border-white/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <BrandMark priority />
          <nav aria-label="Principal" className="ml-auto hidden items-center gap-5 text-sm font-medium text-muted-foreground md:flex">
            <a className="transition-colors duration-150 ease-[var(--ease-out)] hover:text-foreground" href="#preview">Preview</a>
            <a className="transition-colors duration-150 ease-[var(--ease-out)] hover:text-foreground" href="#economia">Economia</a>
            <a className="transition-colors duration-150 ease-[var(--ease-out)] hover:text-foreground" href="#controle">Controle</a>
            <a className="transition-colors duration-150 ease-[var(--ease-out)] hover:text-foreground" href="#precos">Preços</a>
            <Link className="transition-colors duration-150 ease-[var(--ease-out)] hover:text-foreground" href="/docs">Docs</Link>
          </nav>
          <button
            type="button"
            onClick={() => openAuth("signup")}
            className="hidden rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-slate-900 transition-[transform,border-color,background-color] duration-150 ease-[var(--ease-out)] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:inline-flex"
          >
            Criar conta
          </button>
          <button
            type="button"
            onClick={() => openAuth("login")}
            className="ml-auto inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-[transform,background-color] duration-150 ease-[var(--ease-out)] hover:bg-emerald-700 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 md:ml-3"
          >
            Ver demo
            <ArrowRight aria-hidden="true" size={16} />
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-7xl gap-10 px-4 pb-14 pt-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:pb-20 lg:pt-16">
        <div className="preview-enter max-w-2xl">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800">
            <Sparkles aria-hidden="true" size={15} />
            ERP moderno para pequenos negócios brasileiros
          </div>
          <h1 className="max-w-3xl text-4xl font-semibold tracking-normal text-pretty text-slate-950 sm:text-5xl lg:text-6xl">
            Tenha o Pulso das suas vendas antes do prejuízo virar rotina.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-600">
            O Pulso mostra estoque, vendas, compras, lojas e pendências em uma tela clara. Você sabe onde agir hoje sem depender de planilha nem de relatório difícil.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => openAuth("login")}
              className="electric-border inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition-[transform,background-color] duration-150 ease-[var(--ease-out)] hover:bg-slate-800 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              Abrir demonstração em 30s
              <ArrowRight aria-hidden="true" size={16} />
            </button>
            <button
              type="button"
              onClick={() => openAuth("signup")}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition-[transform,border-color,background-color] duration-150 ease-[var(--ease-out)] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              Criar conta para minha loja
            </button>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">Demonstração local com dados de exemplo. Sem cartão e sem configuração fiscal obrigatória.</p>

          <div id="economia" className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              [money(savings.stockWaste), "menos perda de estoque"],
              [money(savings.missedSales), "menos venda perdida"],
              [money(savings.rework), "menos retrabalho"]
            ].map(([value, label]) => (
              <article key={label} className="rounded-lg border border-border bg-white p-4 shadow-sm">
                <p className="text-xl font-semibold tabular-nums text-slate-950">{value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{label}/mês</p>
              </article>
            ))}
          </div>
        </div>

        <ProductPreview monthlySavings={monthlySavings} />
      </section>

      <section id="preview" className="border-y border-border bg-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 lg:grid-cols-[360px_1fr] lg:items-start">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Bateu o olho, decidiu</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal text-pretty text-slate-950">O sistema fala a língua da loja.</h2>
            <p className="mt-4 text-base leading-7 text-muted-foreground">
              Em vez de despejar gráficos, o Pulso prioriza sinais: produto acabando, compra pendente, loja com preço diferente e ação rápida para corrigir.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { icon: AlertTriangle, title: "7 produtos precisam de reposição", text: "Restam 3 unidades de Coca-Cola 2L." },
              { icon: TrendingUp, title: "R$ 4.238 vendidos hoje", text: "38 pedidos na Loja Centro." },
              { icon: ClipboardCheck, title: "12 pendências fiscais", text: "Complete NCM depois, sem travar o cadastro." }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.title} className="rounded-lg border border-border bg-slate-50 p-4">
                  <Icon aria-hidden="true" size={20} className="text-emerald-700" />
                  <h3 className="mt-4 text-base font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="controle" className="mx-auto max-w-7xl px-4 py-14">
        <div className="mb-7 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Controle real</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-normal text-pretty text-slate-950">Tudo que o MVP já prepara para operar e crescer.</h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            A experiência fica simples para uma loja, mas a arquitetura já respeita empresa, filial, depósito, usuário e permissões.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {benefits.map((benefit) => {
            const Icon = benefit.icon;
            return (
              <article key={benefit.title} className="group rounded-lg border border-border bg-white p-5 shadow-sm transition-[transform,border-color,box-shadow] duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
                <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
                  <Icon aria-hidden="true" size={20} />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-slate-950">{benefit.title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{benefit.description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <PricingSection onOpenAuth={openAuth} />

      <section className="bg-slate-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 lg:grid-cols-[1fr_380px] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-300">Pulso financeiro</p>
            <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-normal text-pretty">O dono para de descobrir o problema no fechamento do mês.</h2>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                ["18", "produtos em reposição"],
                ["4", "lojas comparáveis"],
                [money(monthlySavings), "economia estimada/mês"]
              ].map(([value, label]) => (
                <article key={label} className="rounded-lg border border-white/10 bg-white/5 p-4">
                  <p className="text-2xl font-semibold tabular-nums">{value}</p>
                  <p className="mt-1 text-sm text-slate-300">{label}</p>
                </article>
              ))}
            </div>
          </div>
          <aside id="entrar" className="electric-border scroll-mt-20 rounded-xl border border-white/10 bg-white/5 p-5">
            <LogoMark className="h-11 w-11" />
            <h2 className="mt-5 text-2xl font-semibold tracking-normal text-pretty">Abra o Pulso da sua operação.</h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              Entre na demonstração ou reserve o cadastro para validar o fluxo com sua loja.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <button
                type="button"
                onClick={() => openAuth("login")}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-500 px-3 py-2 text-sm font-medium text-white transition-[transform,background-color] duration-150 ease-[var(--ease-out)] hover:bg-emerald-400 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                Entrar na demo
                <ArrowRight aria-hidden="true" size={16} />
              </button>
              <button
                type="button"
                onClick={() => openAuth("signup")}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-white transition-[transform,border-color,background-color] duration-150 ease-[var(--ease-out)] hover:border-white/25 hover:bg-white/15 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
              >
                Criar conta
              </button>
            </div>
          </aside>
        </div>
      </section>
      <AuthDialog
        open={authOpen}
        mode={authMode}
        onModeChange={setAuthMode}
        onClose={() => setAuthOpen(false)}
        onLoggedIn={(session) => {
          setAuthOpen(false);
          onLoggedIn(session);
        }}
      />
      <LandingFooter onOpenAuth={openAuth} />
    </main>
  );
}

function ProductPreview({ monthlySavings }: { monthlySavings: number }) {
  const rows = [
    ["Coca-Cola 2L", "3 un", "Acabando", "text-amber-700 bg-amber-50"],
    ["Heineken 600ml", "0 un", "Sem estoque", "text-red-700 bg-red-50"],
    ["Arroz 5kg", "48 un", "Saudável", "text-emerald-700 bg-emerald-50"]
  ];

  return (
    <div className="preview-enter relative">
      <div className="electric-border electric-border-soft rounded-xl border border-slate-200 bg-slate-950 p-2 shadow-2xl shadow-slate-950/20">
        <div className="rounded-lg bg-white">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <BrandMark compact />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-950">Empresa Teste LTDA</p>
              <p className="truncate text-xs text-muted-foreground">Loja Centro · Estoque Principal</p>
            </div>
            <div className="ml-auto hidden items-center gap-2 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-slate-700 sm:flex">
              <Gauge aria-hidden="true" size={14} />
              Ao vivo
            </div>
          </div>

          <div className="grid gap-3 p-4">
            <div className="grid gap-3 sm:grid-cols-4">
              {[
                [money(4238), "Vendas"],
                ["38", "Pedidos"],
                ["7", "Acabando"],
                ["2", "Sem estoque"]
              ].map(([value, label]) => (
                <article key={label} className="rounded-lg border border-border bg-slate-50 p-3">
                  <p className="text-xl font-semibold tabular-nums text-slate-950">{value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{label}</p>
                </article>
              ))}
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_220px]">
              <section className="rounded-lg border border-border">
                <div className="flex items-center justify-between border-b border-border px-3 py-2">
                  <h3 className="text-sm font-semibold text-slate-950">Precisa da sua atenção</h3>
                  <span className="rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700">Agora</span>
                </div>
                <div className="divide-y divide-border">
                  {rows.map(([name, qty, status, className]) => (
                    <article key={name} className="grid grid-cols-[1fr_auto] gap-3 px-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-950">{name}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Restam {qty} na Loja Centro</p>
                      </div>
                      <span className={`self-start rounded-full px-2 py-1 text-xs font-medium ${className}`}>{status}</span>
                    </article>
                  ))}
                </div>
              </section>

              <aside className="rounded-lg border border-border bg-slate-50 p-3">
                <h3 className="text-sm font-semibold text-slate-950">Ações rápidas</h3>
                <div className="mt-3 grid gap-2">
                  {[
                    [ShoppingCart, "Nova venda"],
                    [PackagePlus, "Novo produto"],
                    [ArrowRightLeft, "Transferir estoque"]
                  ].map(([Icon, label]) => {
                    const TypedIcon = Icon as typeof ShoppingCart;
                    return (
                      <button
                        key={label as string}
                        type="button"
                        className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-left text-sm font-medium text-slate-900 transition-[transform,border-color] duration-150 ease-[var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
                        <TypedIcon aria-hidden="true" size={15} />
                        {label as string}
                      </button>
                    );
                  })}
                </div>
              </aside>
            </div>
          </div>
        </div>
      </div>
      <div className="absolute -bottom-3 right-5 hidden rounded-lg border border-border bg-white px-4 py-3 shadow-lg lg:block">
        <p className="text-xs font-medium text-muted-foreground">Economia estimada</p>
        <p className="mt-1 text-xl font-semibold tabular-nums text-emerald-700">{money(monthlySavings)}/mês</p>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs text-muted-foreground">
        <p className="rounded-lg border border-border bg-white px-2 py-2">Multiempresa</p>
        <p className="rounded-lg border border-border bg-white px-2 py-2">Multiloja</p>
        <p className="rounded-lg border border-border bg-white px-2 py-2">Ledger de estoque</p>
      </div>
    </div>
  );
}

function PricingSection({ onOpenAuth }: { onOpenAuth: (mode: "login" | "signup") => void }) {
  const plans = [
    {
      name: "Essencial",
      role: "Para uma loja sair da planilha",
      price: "R$ 149",
      period: "/mes",
      description: "Controle simples de vendas, produtos e estoque principal.",
      cta: "Comecar no Essencial",
      highlighted: false,
      features: [
        "1 empresa e 1 loja",
        "Produtos, clientes e fornecedores",
        "Estoque com historico de movimentos",
        "Dashboard do dia",
        "Importacao CSV"
      ]
    },
    {
      name: "Crescimento",
      role: "Mais escolhido",
      price: "R$ 249",
      period: "/mes",
      description: "Para quem tem mais operacao e precisa ver loja, estoque e compras no mesmo pulso.",
      cta: "Criar conta recomendada",
      highlighted: true,
      features: [
        "Ate 3 lojas no mesmo CNPJ",
        "Preco por loja e deposito",
        "Transferencia entre lojas",
        "Compras, vendas e alertas de reposicao",
        "Pendencias fiscais organizadas",
        "Importacao CSV e XLSX"
      ]
    },
    {
      name: "Rede",
      role: "Para grupos e franquias",
      price: "R$ 499",
      period: "/mes",
      description: "Base preparada para grupos com multiplas empresas, lojas e permissoes.",
      cta: "Falar sobre minha rede",
      highlighted: false,
      features: [
        "Multiempresa e multiloja",
        "Usuarios e permissoes por escopo",
        "Relatorios por empresa e filial",
        "Fila para importacoes pesadas",
        "Base para canais externos",
        "Suporte de migracao assistida"
      ]
    }
  ];

  return (
    <section id="precos" className="border-y border-border bg-white">
      <div className="mx-auto max-w-7xl px-4 py-14">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] text-emerald-700">Planos iniciais</p>
          <h2 className="mt-3 text-3xl font-semibold tracking-normal text-pretty text-slate-950">
            Comece pequeno, mantenha o Pulso quando crescer.
          </h2>
          <p className="mt-4 text-base leading-7 text-muted-foreground">
            Os valores abaixo servem como ancora comercial para o MVP. A ideia e vender controle operacional, nao uma lista infinita de modulos.
          </p>
        </div>

        <div className="mt-9 grid gap-4 lg:grid-cols-3">
          {plans.map((plan) => (
            <article
              key={plan.name}
              className={`relative rounded-xl border bg-white p-5 shadow-sm transition-[transform,box-shadow,border-color] duration-200 ease-[var(--ease-out)] hover:-translate-y-0.5 ${
                plan.highlighted
                  ? "electric-border electric-border-soft border-emerald-200 shadow-xl shadow-emerald-950/10"
                  : "border-border hover:border-emerald-200 hover:shadow-md"
              }`}
            >
              {plan.highlighted ? (
                <span className="absolute right-4 top-4 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white">
                  Recomendado
                </span>
              ) : null}
              <p className="text-sm font-semibold text-emerald-700">{plan.role}</p>
              <h3 className="mt-3 text-2xl font-semibold tracking-normal text-slate-950">{plan.name}</h3>
              <p className="mt-2 min-h-[3rem] text-sm leading-6 text-muted-foreground">{plan.description}</p>
              <div className="mt-5 flex items-end gap-1">
                <p className="text-4xl font-semibold tracking-normal text-slate-950">{plan.price}</p>
                <p className="pb-1 text-sm text-muted-foreground">{plan.period}</p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">Sem fidelidade no piloto. Sem cartao para testar a demo local.</p>
              <button
                type="button"
                onClick={() => onOpenAuth(plan.highlighted ? "signup" : "login")}
                className={`mt-6 inline-flex w-full items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold transition-[transform,background-color,border-color] duration-150 ease-[var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  plan.highlighted
                    ? "bg-emerald-600 text-white hover:bg-emerald-700"
                    : "border border-border bg-white text-slate-950 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {plan.cta}
                <ArrowRight aria-hidden="true" size={16} />
              </button>
              <ul className="mt-6 grid gap-3">
                {plan.features.map((feature, index) => (
                  <li key={feature} className={`flex gap-2 text-sm leading-6 ${index === 0 || index === plan.features.length - 1 ? "font-medium text-slate-950" : "text-muted-foreground"}`}>
                    <Check aria-hidden="true" size={16} className="mt-1 shrink-0 text-emerald-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-border bg-slate-50 p-4 text-sm leading-6 text-muted-foreground lg:flex lg:items-center lg:justify-between lg:gap-6">
          <p>
            A economia estimada na landing e de <strong className="font-semibold text-slate-950">R$ 3.840,00/mes</strong>. O plano recomendado custa menos que um dia comum de perda operacional.
          </p>
          <button
            type="button"
            onClick={() => onOpenAuth("signup")}
            className="mt-3 inline-flex items-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white transition-[transform,background-color] duration-150 ease-[var(--ease-out)] hover:bg-slate-800 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 lg:mt-0"
          >
            Ver meu primeiro painel
            <ArrowRight aria-hidden="true" size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}

function LandingFooter({ onOpenAuth }: { onOpenAuth: (mode: "login" | "signup") => void }) {
  const columns: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
    {
      title: "Produto",
      links: [
        { label: "Preview", href: "#preview" },
        { label: "Economia", href: "#economia" },
        { label: "Controle", href: "#controle" },
        { label: "Precos", href: "#precos" }
      ]
    },
    {
      title: "Operacao",
      links: [
        { label: "Produtos", href: "/docs/products" },
        { label: "Estoque", href: "/docs/inventory" },
        { label: "Vendas e compras", href: "/docs/sales-purchases" },
        { label: "Fiscal", href: "/docs/fiscal" }
      ]
    },
    {
      title: "Plataforma",
      links: [
        { label: "Autenticacao", href: "/docs/auth" },
        { label: "Multiempresa", href: "/docs/tenant-context" },
        { label: "Erros", href: "/docs/errors" },
        { label: "Saude da API", href: "/docs/admin-health" }
      ]
    }
  ];

  return (
    <footer className="border-t border-border bg-white">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <BrandMark />
            <p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">
              ERP SaaS para pequenos negocios que querem acompanhar vendas, estoque e lojas com clareza, sem carregar a complexidade de um ERP tradicional.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onOpenAuth("signup")}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition-[transform,background-color] duration-150 ease-[var(--ease-out)] hover:bg-emerald-700 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                Criar conta
                <ArrowRight aria-hidden="true" size={16} />
              </button>
              <Link
                href="/docs"
                className="inline-flex items-center rounded-md border border-border px-3 py-2 text-sm font-semibold text-slate-950 transition-[transform,border-color,background-color] duration-150 ease-[var(--ease-out)] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                Ler docs
              </Link>
            </div>
          </div>

          <nav aria-label="Rodape" className="grid gap-6 sm:grid-cols-3">
            {columns.map((column) => (
              <div key={column.title}>
                <h2 className="text-sm font-semibold text-slate-950">{column.title}</h2>
                <ul className="mt-3 grid gap-2">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link href={link.href} className="text-sm text-muted-foreground transition-colors duration-150 ease-[var(--ease-out)] hover:text-slate-950">
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Pulso ERP. Produto em desenvolvimento.</p>
          <div className="flex flex-wrap gap-4">
            <Link href="/docs/overview" className="hover:text-slate-950">Visao geral</Link>
            <Link href="/docs/auth" className="hover:text-slate-950">Seguranca</Link>
            <button type="button" onClick={() => onOpenAuth("login")} className="hover:text-slate-950">
              Entrar
            </button>
          </div>
        </div>
      </div>
    </footer>
  );
}

type DashboardTab =
  | "overview"
  | "products"
  | "inventory"
  | "customers"
  | "suppliers"
  | "categories"
  | "sales"
  | "sales-history"
  | "payments"
  | "receivables"
  | "payables"
  | "purchases"
  | "transfers"
  | "counts"
  | "fiscal"
  | "imports"
  | "integrations"
  | "channels"
  | "ifood-catalog"
  | "ifood-pending"
  | "ifood-orders"
  | "reports"
  | "users"
  | "settings"
  | "alerts"
  | "global-search"
  | "multistore";

type SidebarItem = {
  label: string;
  icon: typeof ShoppingCart;
  tab?: DashboardTab;
  href?: string;
  badge?: string;
  status?: "available" | "foundation" | "soon";
  requiresIfood?: boolean;
};

type AppAlert = {
  tone: "info" | "warning" | "success";
  title: string;
  description: string;
};

type ConfirmAction = {
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "default" | "danger";
  onConfirm: () => void | Promise<void>;
};

type DetailsDialogState = {
  title: string;
  data: unknown;
  variant?: "product";
};

type IfoodOauthDialogState = IfoodOauthStartResponse & {
  connectionId: string;
};

type IfoodStockSettingsDialogState = {
  connection: GenericListItem;
};

type IfoodCancellationDialogState = {
  saleId: string;
  title: string;
  reasons: Array<{ code: string; description: string }>;
};

type IfoodCatalogLinkDialogState = {
  item: GenericListItem;
  source: "catalog" | "pending";
};

type PurchaseCreateDialogState = {
  open: boolean;
};
type IfoodOrdersView = "orders" | "pending" | "logs";
type IfoodOrderStatusFilter = "ALL" | "PENDING" | "RESERVED" | "PREPARATION_STARTED" | "READY_TO_PICKUP" | "DISPATCHED" | "COMPLETED" | "CANCELLED";

type ProductItem = ProductListResponse["data"][number];
type ProductEditInput = {
  sku: string;
  name: string;
  unit: string;
  salePrice: string;
  costPrice?: string | null;
  categoryId?: string | null;
  imageDataUrl?: string | null;
  imageFileName?: string | null;
};
type SalePaymentMethod = "CASH" | "CREDIT_CARD" | "DEBIT_CARD" | "PIX" | "BANK_TRANSFER" | "VOUCHER" | "OTHER";
type UserItem = UserListResponse["data"][number];
type ProductFiscalProfileInput = {
  ncm?: string;
  cest?: string;
  fiscalUnit?: string;
  icmsCst?: string;
  icmsCsosn?: string;
  pisCst?: string;
  cofinsCst?: string;
};

const salePaymentOptions: Array<{ value: SalePaymentMethod; label: string }> = [
  { value: "PIX", label: "PIX" },
  { value: "CASH", label: "Dinheiro" },
  { value: "DEBIT_CARD", label: "Cartão de débito" },
  { value: "CREDIT_CARD", label: "Cartão de crédito" },
  { value: "VOUCHER", label: "Voucher" },
  { value: "BANK_TRANSFER", label: "Transferência" },
  { value: "OTHER", label: "Outro" }
];

function PurchaseCreateDialog({
  open,
  suppliers,
  products,
  warehouses,
  isSaving,
  onClose,
  onSave
}: {
  open: boolean;
  suppliers: PersonListResponse["data"];
  products: ProductListResponse["data"];
  warehouses: Array<{ id: string; name: string }>;
  isSaving: boolean;
  onClose: () => void;
  onSave: (input: { supplierId: string; warehouseId: string; productId: string; quantity: string; unitCost: string }) => void;
}) {
  const [supplierId, setSupplierId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");

  useEffect(() => {
    if (!open) return;
    setSupplierId((value) => value || suppliers[0]?.id || "");
    setWarehouseId((value) => value || warehouses[0]?.id || "");
    setProductId((value) => value || products[0]?.id || "");
  }, [open, products, suppliers, warehouses]);

  useEffect(() => {
    const product = products.find((item) => item.id === productId);
    if (product && !unitCost) setUnitCost(product.costPrice ?? "");
  }, [productId, products, unitCost]);

  if (!open) return null;

  const noOptions = suppliers.length === 0 || products.length === 0 || warehouses.length === 0;
  return (
    <div className="custom-scrollbar fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/60 px-4 py-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="create-purchase-title">
      <div className="auth-card-enter flex w-full max-w-lg flex-col overflow-hidden rounded-lg border border-border bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Reposição</p>
            <h2 id="create-purchase-title" className="mt-1 text-lg font-semibold text-slate-950">Nova compra</h2>
            <p className="mt-1 text-sm text-muted-foreground">Registre o pedido para acompanhar a entrega e o pagamento.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" aria-label="Fechar nova compra">
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <form
          className="grid gap-4 p-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSave({ supplierId, warehouseId, productId, quantity: quantity.trim(), unitCost: unitCost.trim() });
          }}
        >
          {noOptions ? <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Para registrar uma compra, cadastre um fornecedor, um produto ativo e um depósito.</p> : null}
          <label className="grid gap-1 text-sm font-medium text-slate-950">Fornecedor
            <select required value={supplierId} onChange={(event) => setSupplierId(event.target.value)} className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">Selecione</option>
              {suppliers.map((supplier) => <option key={supplier.id} value={supplier.id}>{supplier.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-950">Depósito de entrega
            <select required value={warehouseId} onChange={(event) => setWarehouseId(event.target.value)} className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">Selecione</option>
              {warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-medium text-slate-950">Produto
            <select required value={productId} onChange={(event) => { setProductId(event.target.value); setUnitCost(products.find((item) => item.id === event.target.value)?.costPrice ?? ""); }} className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">Selecione</option>
              {products.map((product) => <option key={product.id} value={product.id}>{product.name}</option>)}
            </select>
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-slate-950">Quantidade
              <input required min="0.001" step="0.001" inputMode="decimal" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-500" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-950">Custo unitário
              <input required min="0" step="0.01" inputMode="decimal" value={unitCost} onChange={(event) => setUnitCost(event.target.value)} placeholder="0,00" className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-500" />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">O estoque só será atualizado quando você confirmar o recebimento da compra.</p>
          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-2 text-sm font-medium text-slate-950 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">Cancelar</button>
            <button type="submit" disabled={isSaving || noOptions} className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
              {isSaving ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : <ShoppingBag aria-hidden="true" size={16} />} Registrar compra
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function productIfoodReadiness(product: ProductItem) {
  const issues: string[] = [];
  const salePrice = Number(product.branchPrices[0]?.salePrice ?? product.salePrice);

  if (!product.active) {
    issues.push("Produto inativo");
  }
  if (!product.category) {
    issues.push("Sem categoria");
  }
  if (!product.barcodes[0]?.barcode) {
    issues.push("Sem EAN");
  }
  if (!Number.isFinite(salePrice) || salePrice <= 0) {
    issues.push("Preço inválido");
  }

  return {
    ready: issues.length === 0,
    issues
  };
}

function readProductImageFile(file: File) {
  return new Promise<{ imageDataUrl: string; imageFileName: string }>((resolve, reject) => {
    const allowedTypes = new Set(["image/png", "image/jpeg"]);
    if (!allowedTypes.has(file.type)) {
      reject(new Error("Use uma imagem PNG ou JPG."));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      reject(new Error("A imagem deve ter no máximo 5 MB."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.onload = () => {
      if (typeof reader.result !== "string") {
        reject(new Error("Não foi possível ler a imagem."));
        return;
      }
      resolve({ imageDataUrl: reader.result, imageFileName: file.name });
    };
    reader.readAsDataURL(file);
  });
}

type SettingsState = {
  darkMode: boolean;
  compactMenu: boolean;
  showSavings: boolean;
  confirmCriticalActions: boolean;
  sessionWarnings: boolean;
  hideSensitiveData: boolean;
  blockNegativeStock: boolean;
  lowStockAlerts: boolean;
  currentBranchOnly: boolean;
  showFiscalPending: boolean;
  prepareChannelSync: boolean;
};

type PricingConfig = {
  taxPercent: number;
  feePercent: number;
};

const defaultPricingConfig: PricingConfig = {
  taxPercent: 6,
  feePercent: 3
};

type OperationalTab = Exclude<DashboardTab, "overview" | "products" | "inventory" | "customers" | "suppliers" | "categories">;

type OperationalModuleConfig = {
  title: string;
  eyebrow: string;
  description: string;
  endpoint?: `/api/v1/${string}`;
  searchPlaceholder?: string;
  emptyMessage: string;
  primaryAction?: string;
  actionTitle?: string;
  actionDescription?: string;
  status: "connected" | "foundation" | "planned";
};

const tabRoutes: Record<DashboardTab, string> = {
  overview: "/app/hoje",
  alerts: "/app/alertas",
  "global-search": "/app/busca",
  sales: "/app/vendas",
  "sales-history": "/app/historico-vendas",
  payments: "/app/pagamentos",
  receivables: "/app/contas-a-receber",
  payables: "/app/contas-a-pagar",
  purchases: "/app/compras",
  multistore: "/app/multiloja",
  products: "/app/produtos",
  inventory: "/app/estoque",
  transfers: "/app/transferencias",
  counts: "/app/inventario",
  customers: "/app/clientes",
  suppliers: "/app/fornecedores",
  categories: "/app/categorias",
  settings: "/app/configuracoes",
  fiscal: "/app/fiscal",
  imports: "/app/migracao",
  integrations: "/app/integracoes",
  channels: "/app/canais",
  "ifood-catalog": "/app/catalogo-ifood",
  "ifood-pending": "/app/pendencias-ifood",
  "ifood-orders": "/app/pedidos-ifood",
  reports: "/app/relatorios",
  users: "/app/usuarios"
};

const routeTabs = new Map<string, DashboardTab>(Object.entries(tabRoutes).map(([tab, href]) => [href, tab as DashboardTab]));

function tabFromPathname(pathname: string): DashboardTab {
  return routeTabs.get(pathname) ?? "overview";
}

type PricingAnalysis = {
  salePrice: number;
  costPrice: number;
  taxPercent: number;
  feePercent: number;
  variableCosts: number;
  netProfit: number;
  netMargin: number;
  markup: number;
  status: "good" | "attention" | "bad" | "unknown";
};

function analyzePricing(product: ProductItem, pricingConfig: PricingConfig): PricingAnalysis {
  const salePrice = Number(product.branchPrices[0]?.salePrice ?? product.salePrice);
  const costPrice = Number(product.costPrice ?? 0);
  const taxPercent = pricingConfig.taxPercent;
  const feePercent = pricingConfig.feePercent;
  const variableCosts = salePrice * ((taxPercent + feePercent) / 100);
  const netProfit = salePrice - costPrice - variableCosts;
  const netMargin = salePrice > 0 ? (netProfit / salePrice) * 100 : 0;
  const markup = costPrice > 0 ? ((salePrice - costPrice) / costPrice) * 100 : 0;
  const status = !costPrice || !salePrice ? "unknown" : netMargin >= 18 ? "good" : netMargin >= 8 ? "attention" : "bad";

  return {
    salePrice,
    costPrice,
    taxPercent,
    feePercent,
    variableCosts,
    netProfit,
    netMargin,
    markup,
    status
  };
}

function SystemAlert({ alert, onDismiss }: { alert: AppAlert; onDismiss: () => void }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(false);
    const frame = window.requestAnimationFrame(() => setIsVisible(true));
    const timeout = window.setTimeout(() => {
      setIsVisible(false);
      window.setTimeout(onDismiss, 180);
    }, 5200);

    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [alert, onDismiss]);

  const toneClass = {
    info: "border-slate-200 bg-white text-slate-900",
    warning: "border-amber-200 bg-white text-slate-900",
    success: "border-emerald-200 bg-white text-slate-900"
  }[alert.tone];

  const iconClass = {
    info: "bg-slate-100 text-slate-700",
    warning: "bg-amber-100 text-amber-700",
    success: "bg-emerald-100 text-emerald-700"
  }[alert.tone];

  const Icon = alert.tone === "success" ? Check : alert.tone === "warning" ? AlertTriangle : Bell;

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[90] w-[min(92vw,420px)]">
      <aside
        className={`pointer-events-auto rounded-xl border p-4 shadow-xl shadow-slate-950/10 transition-all duration-200 ease-out ${toneClass} ${
          isVisible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
        }`}
        role="status"
        aria-live="polite"
      >
        <div className="flex gap-3">
          <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${iconClass}`}>
            <Icon aria-hidden="true" size={15} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{alert.title}</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">{alert.description}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsVisible(false);
              window.setTimeout(onDismiss, 180);
            }}
            aria-label="Fechar alerta"
            className="self-start rounded-md p-1 text-slate-500 transition-[transform,background-color,color] duration-150 ease-[var(--ease-out)] hover:bg-slate-100 hover:text-slate-900 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <X aria-hidden="true" size={16} />
          </button>
        </div>
      </aside>
    </div>
  );
}

function ConfirmDialog({ action, onClose }: { action: ConfirmAction | null; onClose: () => void }) {
  if (!action) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/55 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
      <section className="auth-card-enter w-full max-w-md rounded-xl border border-white/20 bg-white p-5 text-slate-950 shadow-2xl shadow-slate-950/30">
        <div className="flex gap-4">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border ${action.tone === "danger" ? "border-red-200 bg-red-50 text-red-600" : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}>
            <AlertTriangle aria-hidden="true" size={18} />
          </div>
          <div className="min-w-0">
            <h2 id="confirm-title" className="text-lg font-semibold tracking-normal">{action.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{action.description}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-slate-950 transition-[transform,border-color,background-color] duration-150 ease-[var(--ease-out)] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={async () => {
              await action.onConfirm();
              onClose();
            }}
            className={`inline-flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium text-white transition-[transform,background-color] duration-150 ease-[var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 ${
              action.tone === "danger" ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-500" : "bg-emerald-600 hover:bg-emerald-700 focus-visible:ring-emerald-500"
            }`}
          >
            {action.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function IfoodOauthDialog({
  state,
  isSaving,
  onClose,
  onComplete
}: {
  state: IfoodOauthDialogState | null;
  isSaving: boolean;
  onClose: () => void;
  onComplete: (authorizationCode: string) => void;
}) {
  const [authorizationCode, setAuthorizationCode] = useState("");

  useEffect(() => {
    if (state) {
      setAuthorizationCode("");
    }
  }, [state]);

  if (!state) {
    return null;
  }

  const trimmedCode = authorizationCode.trim();

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="ifood-oauth-title">
      <section className="auth-card-enter w-full max-w-lg rounded-lg border border-border bg-white p-5 text-slate-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">iFood</p>
            <h2 id="ifood-oauth-title" className="mt-1 text-lg font-semibold tracking-normal">Conectar iFood</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Depois de aceitar no Portal iFood, cole aqui o código exibido para finalizar.
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" aria-label="Fechar autorização iFood">
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="mt-5 rounded-md border border-border bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Código para ativar no iFood</p>
          <p className="mt-2 text-2xl font-semibold tracking-normal text-slate-950">{state.userCode}</p>
        </div>

        <label className="mt-4 block">
          <span className="text-sm font-medium text-slate-950">Código gerado pelo iFood</span>
          <input
            value={authorizationCode}
            onChange={(event) => setAuthorizationCode(event.target.value.toUpperCase())}
            placeholder="Ex.: MPNG-MFSH"
            className="mt-2 w-full rounded-md border border-border bg-white px-3 py-2 text-sm font-medium tracking-normal text-slate-950 outline-none transition-colors placeholder:text-muted-foreground focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500"
            autoFocus
          />
        </label>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <a
            href={state.verificationUrlComplete}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-slate-950 transition-[transform,border-color,background-color] duration-150 ease-[var(--ease-out)] hover:border-emerald-200 hover:bg-emerald-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            Abrir Portal iFood
          </a>
          <button
            type="button"
            disabled={!trimmedCode || isSaving}
            onClick={() => onComplete(trimmedCode)}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-[transform,background-color] duration-150 ease-[var(--ease-out)] hover:bg-emerald-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {isSaving ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : <Check aria-hidden="true" size={16} />}
            Conectar loja
          </button>
        </div>
      </section>
    </div>
  );
}

function IfoodStockSettingsDialog({
  state,
  isSaving,
  onClose,
  onSave
}: {
  state: IfoodStockSettingsDialogState | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (input: { ecommerceStockMode: "FULL" | "PERCENT" | "FIXED"; ecommerceStockPercent?: string | null; ecommerceStockFixedQuantity?: string | null }) => void;
}) {
  const connection = state?.connection;
  const [mode, setMode] = useState<"FULL" | "PERCENT" | "FIXED">("FULL");
  const [percent, setPercent] = useState("");
  const [fixedQuantity, setFixedQuantity] = useState("");

  useEffect(() => {
    if (!connection) {
      return;
    }
    const currentMode = textValue(connection.ecommerceStockMode, "FULL");
    setMode(currentMode === "PERCENT" || currentMode === "FIXED" ? currentMode : "FULL");
    setPercent(textValue(connection.ecommerceStockPercent, ""));
    setFixedQuantity(textValue(connection.ecommerceStockFixedQuantity, ""));
  }, [connection]);

  if (!connection) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="ifood-stock-title">
      <section className="auth-card-enter w-full max-w-lg rounded-lg border border-border bg-white p-5 text-slate-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">iFood</p>
            <h2 id="ifood-stock-title" className="mt-1 text-lg font-semibold tracking-normal">Estoque para ecommerce</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Escolha quanto do estoque desta loja fica disponível para venda no iFood.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" aria-label="Fechar configuração">
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          <label className="grid gap-1 text-sm font-medium text-slate-950">
            Modo
            <select value={mode} onChange={(event) => setMode(event.target.value as "FULL" | "PERCENT" | "FIXED")} className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="FULL">Usar todo o estoque disponível</option>
              <option value="PERCENT">Separar uma porcentagem para o iFood</option>
              <option value="FIXED">Separar uma quantidade máxima</option>
            </select>
          </label>
          {mode === "PERCENT" ? (
            <label className="grid gap-1 text-sm font-medium text-slate-950">
              Porcentagem do estoque para o iFood
              <input value={percent} onChange={(event) => setPercent(event.target.value)} placeholder="20" className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-500" />
            </label>
          ) : null}
          {mode === "FIXED" ? (
            <label className="grid gap-1 text-sm font-medium text-slate-950">
              Máximo de unidades para o iFood
              <input value={fixedQuantity} onChange={(event) => setFixedQuantity(event.target.value)} placeholder="15" className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-500" />
            </label>
          ) : null}
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-2 text-sm font-medium text-slate-950 transition-[transform,background-color] hover:bg-slate-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
            Cancelar
          </button>
          <button
            type="button"
            disabled={isSaving}
            onClick={() =>
              onSave({
                ecommerceStockMode: mode,
                ecommerceStockPercent: mode === "PERCENT" ? percent.trim() || "0" : null,
                ecommerceStockFixedQuantity: mode === "FIXED" ? fixedQuantity.trim() || "0" : null
              })
            }
            className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-[transform,background-color] hover:bg-emerald-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {isSaving ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : <Check aria-hidden="true" size={16} />}
            Salvar
          </button>
        </div>
      </section>
    </div>
  );
}

function IfoodCancellationDialog({
  state,
  isSaving,
  onClose,
  onConfirm
}: {
  state: IfoodCancellationDialogState | null;
  isSaving: boolean;
  onClose: () => void;
  onConfirm: (reasonCode: string) => void;
}) {
  const [reasonCode, setReasonCode] = useState("");

  useEffect(() => {
    setReasonCode(state?.reasons[0]?.code ?? "");
  }, [state]);

  if (!state) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/55 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="ifood-cancel-title">
      <section className="auth-card-enter w-full max-w-md rounded-xl border border-white/20 bg-white p-5 text-slate-950 shadow-2xl shadow-slate-950/30">
        <div className="flex gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600">
            <AlertTriangle aria-hidden="true" size={18} />
          </div>
          <div className="min-w-0">
            <h2 id="ifood-cancel-title" className="text-lg font-semibold tracking-normal">Solicitar cancelamento no iFood?</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{state.title} será enviado ao iFood para análise. O pedido só será cancelado no ERP quando o iFood retornar o evento de cancelamento.</p>
          </div>
        </div>

        <label className="mt-5 grid gap-1 text-sm font-medium text-slate-950">
          Motivo aceito pelo iFood
          <select value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-red-500">
            {state.reasons.map((reason) => (
              <option key={reason.code} value={reason.code}>{reason.code} - {reason.description}</option>
            ))}
          </select>
        </label>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="inline-flex items-center justify-center rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-slate-950 transition-[transform,border-color,background-color] duration-150 ease-[var(--ease-out)] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
            Fechar
          </button>
          <button type="button" disabled={isSaving || !reasonCode} onClick={() => onConfirm(reasonCode)} className="inline-flex items-center justify-center gap-2 rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white transition-[transform,background-color] duration-150 ease-[var(--ease-out)] hover:bg-red-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
            {isSaving ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : <X aria-hidden="true" size={16} />}
            Solicitar cancelamento
          </button>
        </div>
      </section>
    </div>
  );
}

function IfoodCatalogLinkDialog({
  state,
  products,
  categories,
  isSaving,
  onClose,
  onLink,
  onCreate
}: {
  state: IfoodCatalogLinkDialogState | null;
  products: ProductListResponse["data"];
  categories: CategoryListResponse["data"];
  isSaving: boolean;
  onClose: () => void;
  onLink: (productId: string, saveCatalogMapping?: boolean) => void;
  onCreate: (categoryId?: string) => void;
}) {
  const [productId, setProductId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [saveCatalogMapping, setSaveCatalogMapping] = useState(true);
  const item = state?.item;
  const isPendingResolution = state?.source === "pending";

  useEffect(() => {
    setProductId("");
    setCategoryId("");
    setSaveCatalogMapping(true);
  }, [item]);

  if (!item) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="ifood-catalog-link-title">
      <section className="auth-card-enter w-full max-w-2xl rounded-lg border border-border bg-white p-5 text-slate-950 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Item iFood</p>
            <h2 id="ifood-catalog-link-title" className="mt-1 text-lg font-semibold tracking-normal">{textValue(item.name, "Item iFood")}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Vincule este item a um produto existente ou crie um produto no ERP com os dados do iFood.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" aria-label="Fechar vínculo">
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {[
            ["Código", textValue(item.externalCode, "-")],
            ["Item ID", textValue(item.ifoodItemId, "-")],
            ["Preço", money(textValue(item.price, "0"))]
          ].map(([label, value]) => (
            <article key={label} className="min-w-0 rounded-md border border-border bg-slate-50 p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 break-words font-mono text-sm text-slate-950">{value}</p>
            </article>
          ))}
        </div>

        <div className={`mt-5 grid gap-4 ${isPendingResolution ? "" : "lg:grid-cols-2"}`}>
          <section className="rounded-lg border border-border p-3">
            <h3 className="text-sm font-semibold text-slate-950">Vincular produto existente</h3>
            <label className="mt-3 grid gap-1 text-sm font-medium text-slate-950">
              Produto ERP
              <select value={productId} onChange={(event) => setProductId(event.target.value)} className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">Selecione...</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>
                ))}
              </select>
            </label>
            {isPendingResolution ? (
              <label className="mt-3 flex items-start gap-2 rounded-md border border-border bg-slate-50 p-3 text-sm text-slate-950">
                <input
                  type="checkbox"
                  checked={saveCatalogMapping}
                  onChange={(event) => setSaveCatalogMapping(event.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  <span className="block font-medium">Salvar vínculo para próximos pedidos</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">Novos pedidos com este mesmo item iFood usarão automaticamente o produto ERP selecionado.</span>
                </span>
              </label>
            ) : null}
            <button type="button" disabled={isSaving || !productId} onClick={() => onLink(productId, isPendingResolution ? saveCatalogMapping : undefined)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white transition-[transform,background-color] hover:bg-slate-800 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500">
              {isSaving ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : <Plug aria-hidden="true" size={16} />}
              Vincular
            </button>
          </section>

          {!isPendingResolution ? <section className="rounded-lg border border-border p-3">
            <h3 className="text-sm font-semibold text-slate-950">Criar produto no ERP</h3>
            <label className="mt-3 grid gap-1 text-sm font-medium text-slate-950">
              Categoria
              <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">Sem categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>{category.name}</option>
                ))}
              </select>
            </label>
            <button type="button" disabled={isSaving} onClick={() => onCreate(categoryId || undefined)} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-[transform,background-color] hover:bg-emerald-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
              {isSaving ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : <PackagePlus aria-hidden="true" size={16} />}
              Criar e vincular
            </button>
          </section> : null}
        </div>
      </section>
    </div>
  );
}

function DetailsDialog({
  details,
  pricingConfig,
  onClose
}: {
  details: DetailsDialogState | null;
  pricingConfig: PricingConfig;
  onClose: () => void;
}) {
  if (!details) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="details-title">
      <div className="auth-card-enter w-full max-w-3xl overflow-hidden rounded-lg border border-border bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Detalhes</p>
            <h2 id="details-title" className="mt-1 text-lg font-semibold text-slate-950">{details.title}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" aria-label="Fechar detalhes">
            <X aria-hidden="true" size={18} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">
          {details.variant === "product" && isProductDetailsData(details.data) ? (
            <ProductDetailsContent product={details.data} pricingConfig={pricingConfig} />
          ) : textValue(asRecord(details.data)?.kind) === "IFOOD_EVENT" ? (
            <IfoodEventDetailsContent event={details.data} />
          ) : textValue(asRecord(details.data)?.source) === "IFOOD" ? (
            <IfoodOrderDetailsContent order={details.data} />
          ) : (
            <ReadableDetailsContent data={details.data} />
          )}
        </div>
      </div>
    </div>
  );
}

function ProductDetailsContent({ product, pricingConfig }: { product: ProductItem; pricingConfig: PricingConfig }) {
  const displaySalePrice = product.branchPrices[0]?.salePrice ?? product.salePrice;
  const analysis = analyzePricing(product, pricingConfig);
  const [showMetrics, setShowMetrics] = useState(false);
  const metricsPopoverRef = useRef<HTMLElement | null>(null);
  const metricsButtonRef = useRef<HTMLButtonElement | null>(null);
  const marginPercent = analysis.netMargin.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const markupPercent = analysis.markup.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  useEffect(() => {
    if (!showMetrics) {
      return;
    }

    const onMouseDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) {
        return;
      }
      if (metricsPopoverRef.current?.contains(target) || metricsButtonRef.current?.contains(target)) {
        return;
      }
      setShowMetrics(false);
    };

    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [showMetrics]);

  return (
    <div className="relative space-y-5">
      <div className="flex justify-end">
        <button
          ref={metricsButtonRef}
          type="button"
          title={showMetrics ? "Ocultar análise de precificação" : "Ver análise de precificação"}
          aria-label={showMetrics ? "Ocultar análise de precificação" : "Ver análise de precificação"}
          onClick={() => setShowMetrics((current) => !current)}
          className="inline-flex items-center justify-center p-0 text-slate-500 transition-[transform,color] duration-150 ease-[var(--ease-out)] hover:text-emerald-700 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <CircleHelp aria-hidden="true" size={17} />
        </button>
      </div>
      {showMetrics ? (
        <aside ref={metricsPopoverRef} className="absolute right-0 top-7 z-10 w-[min(92vw,460px)] rounded-xl border border-border bg-white p-4 shadow-2xl shadow-slate-950/15">
          <p className="text-sm font-semibold text-slate-950">Análise de precificação</p>
          <p className="mt-1 text-sm text-slate-600">
            {analysis.status === "unknown"
              ? "Preencha custo e preço para calcular margem e lucro."
              : `Margem ${marginPercent}% = margem líquida estimada após custo, impostos e taxas. Não é percentual de imposto.`}
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              ["Preço de venda", money(analysis.salePrice)],
              ["Custo informado", analysis.costPrice ? money(analysis.costPrice) : "Sem custo"],
              [`Impostos (${analysis.taxPercent}%)`, money(analysis.salePrice * (analysis.taxPercent / 100))],
              [`Taxas (${analysis.feePercent}%)`, money(analysis.salePrice * (analysis.feePercent / 100))],
              ["Lucro líquido", analysis.status === "unknown" ? "Sem cálculo" : money(analysis.netProfit)],
              ["Markup", analysis.status === "unknown" ? "Sem cálculo" : `${markupPercent}%`]
            ].map(([label, value]) => (
              <article key={label} className="rounded-md border border-border bg-slate-50 p-2.5">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{value}</p>
              </article>
            ))}
          </div>
        </aside>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["SKU", product.sku],
          ["Categoria", product.category?.name ?? "Sem categoria"],
          ["Unidade", product.unit],
          ["Preço de venda", money(displaySalePrice)],
          ["Preço base", money(product.salePrice)],
          ["Custo", product.costPrice ? money(product.costPrice) : "Sem custo"],
          ["Status", product.active ? "Ativo" : "Inativo"],
          ["ID", product.id]
        ].map(([label, value]) => (
          <article key={label} className="rounded-lg border border-border bg-slate-50 p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-medium text-slate-950">{value}</p>
          </article>
        ))}
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-950">Códigos de barras</h3>
        {product.barcodes.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {product.barcodes.map((barcode) => (
              <article key={barcode.id} className="rounded-md border border-border bg-white px-3 py-2">
                <p className="text-xs text-muted-foreground">EAN</p>
                <p className="mt-1 font-mono text-sm text-slate-950">{barcode.barcode}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum código de barras cadastrado.</p>
        )}
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-950">Preços por loja</h3>
        {product.branchPrices.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {product.branchPrices.map((branchPrice, index) => (
              <article key={`${product.id}-price-${index}`} className="rounded-md border border-border bg-white px-3 py-2">
                <p className="text-xs text-muted-foreground">Loja {index + 1}</p>
                <p className="mt-1 text-sm font-semibold text-slate-950">{money(branchPrice.salePrice)}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Nenhum preço por loja cadastrado.</p>
        )}
      </section>
    </div>
  );
}

function PaginationBar({
  page,
  limit,
  onLimitChange,
  canPrevious,
  canNext,
  isFetching,
  onPrevious,
  onNext
}: {
  page: number;
  limit: number;
  onLimitChange: (limit: number) => void;
  canPrevious: boolean;
  canNext: boolean;
  isFetching: boolean;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        Por tela
        <select
          value={limit}
          onChange={(event) => onLimitChange(Number(event.target.value))}
          className="rounded-md border border-border bg-white px-2 py-1.5 text-sm font-medium text-slate-950 outline-none focus:ring-2 focus:ring-emerald-500"
        >
          {[5, 10, 25, 50].map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
      <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-white p-1">
        <button
          type="button"
          onClick={onPrevious}
          disabled={!canPrevious || isFetching}
          className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-[transform,background-color,color] duration-150 ease-[var(--ease-out)] hover:bg-slate-100 hover:text-slate-950 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          Anterior
        </button>
        <span className="min-w-10 rounded-md bg-slate-950 px-3 py-2 text-center text-sm font-semibold text-white">{page}</span>
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext || isFetching}
          className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-[transform,background-color,color] duration-150 ease-[var(--ease-out)] hover:bg-slate-100 hover:text-slate-950 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          Próxima
        </button>
      </div>
    </div>
  );
}

function PeopleDirectorySection({
  title,
  description,
  emptyMessage,
  query,
  searchDraft,
  onSearchDraftChange,
  onApplySearch,
  onClearSearch,
  limit,
  onLimitChange,
  page,
  onPrevious,
  onNext,
  onViewDetails
}: {
  title: string;
  description: string;
  emptyMessage: string;
  query: {
    data: PersonListResponse | undefined;
    isLoading: boolean;
    isFetching: boolean;
    error: Error | null;
  };
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onApplySearch: () => void;
  onClearSearch: () => void;
  limit: number;
  onLimitChange: (limit: number) => void;
  page: number;
  onPrevious: () => void;
  onNext: () => void;
  onViewDetails: (person: PersonListResponse["data"][number]) => void;
}) {
  return (
    <section className="rounded-lg border border-border bg-white">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <form
          className="flex min-w-0 flex-col gap-2 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            onApplySearch();
          }}
        >
          <label className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-emerald-500">
            <Search aria-hidden="true" size={16} className="text-muted-foreground" />
            <span className="sr-only">Buscar</span>
            <input
              value={searchDraft}
              onChange={(event) => onSearchDraftChange(event.target.value)}
              placeholder="Buscar nome, documento, e-mail..."
              className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
            />
          </label>
          <button
            type="submit"
            className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white transition-[transform,background-color] duration-150 ease-[var(--ease-out)] hover:bg-slate-800 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
          >
            Buscar
          </button>
          <button
            type="button"
            onClick={onClearSearch}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-slate-950 transition-[transform,border-color,background-color] duration-150 ease-[var(--ease-out)] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            Limpar
          </button>
        </form>
      </div>

      <div className="divide-y divide-border">
        {query.isLoading ? <p className="px-4 py-5 text-sm text-muted-foreground">Carregando...</p> : null}
        {query.error ? <p className="px-4 py-5 text-sm text-red-600">{query.error.message}</p> : null}
        {query.data?.data.map((person) => (
          <article key={person.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[1fr_150px_190px_220px] lg:items-center">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="truncate text-sm font-medium">{person.name}</h3>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${person.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {person.active ? "Ativo" : "Inativo"}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{person.type === "COMPANY" ? "Pessoa jurídica" : "Pessoa física"}</p>
            </div>
            <p className="text-sm text-muted-foreground">{person.document ?? "Sem documento"}</p>
            <div className="min-w-0 text-sm text-muted-foreground">
              <p className="truncate">{person.email ?? "Sem e-mail"}</p>
              <p className="truncate">{person.phone ?? "Sem telefone"}</p>
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">{new Date(person.createdAt).toLocaleDateString("pt-BR")}</p>
              <button
                type="button"
                onClick={() => onViewDetails(person)}
                title="Ver detalhes"
                aria-label="Ver detalhes"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white text-slate-950 transition-[transform,border-color,background-color] duration-150 ease-[var(--ease-out)] hover:border-emerald-200 hover:bg-emerald-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <Eye aria-hidden="true" size={14} />
              </button>
            </div>
          </article>
        ))}
        {query.data?.data.length === 0 ? <p className="px-4 py-5 text-sm text-muted-foreground">{emptyMessage}</p> : null}
      </div>

      <PaginationBar
        page={page}
        limit={limit}
        onLimitChange={onLimitChange}
        canPrevious={page > 1}
        canNext={Boolean(query.data?.nextCursor)}
        isFetching={query.isFetching}
        onPrevious={onPrevious}
        onNext={onNext}
      />
    </section>
  );
}

function CategorySection({
  query,
  searchDraft,
  onSearchDraftChange,
  onApplySearch,
  onClearSearch,
  limit,
  onLimitChange,
  page,
  onPrevious,
  onNext,
  newCategoryName,
  onNewCategoryNameChange,
  onCreate,
  isCreating,
  onToggleActive,
  isUpdating
}: {
  query: {
    data: CategoryListResponse | undefined;
    isLoading: boolean;
    isFetching: boolean;
  };
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onApplySearch: () => void;
  onClearSearch: () => void;
  limit: number;
  onLimitChange: (limit: number) => void;
  page: number;
  onPrevious: () => void;
  onNext: () => void;
  newCategoryName: string;
  onNewCategoryNameChange: (value: string) => void;
  onCreate: () => void;
  isCreating: boolean;
  onToggleActive: (category: CategoryListResponse["data"][number], active: boolean) => void;
  isUpdating: boolean;
}) {
  return (
    <section className="rounded-lg border border-border bg-white">
      <div className="grid gap-4 border-b border-border px-4 py-4 lg:grid-cols-[1fr_360px]">
        <div>
          <h2 className="text-base font-semibold">Categorias</h2>
          <p className="mt-1 text-sm text-muted-foreground">Organize produtos sem carregar a lista inteira. Página {page}, até {limit} por tela.</p>
          <form
            className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              onApplySearch();
            }}
          >
            <label className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-emerald-500">
              <Search aria-hidden="true" size={16} className="text-muted-foreground" />
              <span className="sr-only">Buscar categoria</span>
              <input
                value={searchDraft}
                onChange={(event) => onSearchDraftChange(event.target.value)}
                placeholder="Buscar categoria..."
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </label>
            <button
              type="submit"
              className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white transition-[transform,background-color] duration-150 ease-[var(--ease-out)] hover:bg-slate-800 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              Buscar
            </button>
            <button
              type="button"
              onClick={onClearSearch}
              className="rounded-md border border-border px-3 py-2 text-sm font-medium text-slate-950 transition-[transform,border-color,background-color] duration-150 ease-[var(--ease-out)] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              Limpar
            </button>
          </form>
        </div>

        <form
          className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3"
          onSubmit={(event) => {
            event.preventDefault();
            onCreate();
          }}
        >
          <label className="grid gap-1 text-sm font-medium text-slate-950">
            Nova categoria
            <input
              value={newCategoryName}
              onChange={(event) => onNewCategoryNameChange(event.target.value)}
              placeholder="Ex: Bebidas"
              className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none transition-shadow duration-150 ease-[var(--ease-out)] focus:ring-2 focus:ring-emerald-500"
            />
          </label>
          <button
            type="submit"
            disabled={isCreating}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-[transform,background-color] duration-150 ease-[var(--ease-out)] hover:bg-emerald-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {isCreating ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : <Layers3 aria-hidden="true" size={16} />}
            Criar categoria
          </button>
        </form>
      </div>

      <div className="divide-y divide-border">
        {query.isLoading ? <p className="px-4 py-5 text-sm text-muted-foreground">Carregando categorias...</p> : null}
        {query.data?.data.map((category) => (
          <article key={category.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_150px_150px] sm:items-center">
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h3 className="truncate text-sm font-medium">{category.name}</h3>
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${category.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {category.active ? "Ativa" : "Inativa"}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">Criada em {new Date(category.createdAt).toLocaleDateString("pt-BR")}</p>
            </div>
            <p className="text-sm text-muted-foreground">Escopo da empresa atual</p>
            <div className="flex items-center justify-between gap-3 sm:justify-end">
              <span className="text-xs text-muted-foreground sm:hidden">Disponível</span>
              <ModernSwitch
                checked={category.active}
                disabled={isUpdating}
                label={category.active ? `Desativar ${category.name}` : `Ativar ${category.name}`}
                onCheckedChange={(checked) => onToggleActive(category, checked)}
              />
            </div>
          </article>
        ))}
        {query.data?.data.length === 0 ? <p className="px-4 py-5 text-sm text-muted-foreground">Nenhuma categoria encontrada.</p> : null}
      </div>

      <PaginationBar
        page={page}
        limit={limit}
        onLimitChange={onLimitChange}
        canPrevious={page > 1}
        canNext={Boolean(query.data?.nextCursor)}
        isFetching={query.isFetching}
        onPrevious={onPrevious}
        onNext={onNext}
      />
    </section>
  );
}

function ProductCreateDialog({
  open,
  categories,
  warehouses,
  canManageFiscalProfile,
  isSaving,
  isCreatingCategory,
  onClose,
  onCreateCategory,
  onSave
}: {
  open: boolean;
  categories: CategoryListResponse["data"];
  warehouses: Array<{ id: string; name: string }>;
  canManageFiscalProfile: boolean;
  isSaving: boolean;
  isCreatingCategory: boolean;
  onClose: () => void;
  onCreateCategory: (name: string) => Promise<{ id: string; name: string; active: boolean }>;
  onSave: (input: {
    sku: string;
    name: string;
    unit: string;
    salePrice: string;
    costPrice?: string;
    categoryId?: string;
    imageDataUrl?: string;
    imageFileName?: string;
    barcodes: string[];
    initialStock?: { warehouseId: string; quantity: string };
    fiscalProfile?: ProductFiscalProfileInput;
  }) => void;
}) {
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("UN");
  const [salePrice, setSalePrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [createdCategories, setCreatedCategories] = useState<Array<{ id: string; name: string; active: boolean }>>([]);
  const [barcode, setBarcode] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [imageFileName, setImageFileName] = useState("");
  const [imageError, setImageError] = useState("");
  const [initialQuantity, setInitialQuantity] = useState("");
  const [initialWarehouseId, setInitialWarehouseId] = useState("");
  const [ncm, setNcm] = useState("");
  const [cest, setCest] = useState("");
  const [fiscalUnit, setFiscalUnit] = useState("UN");
  const [icmsCst, setIcmsCst] = useState("");
  const [icmsCsosn, setIcmsCsosn] = useState("");
  const [pisCst, setPisCst] = useState("");
  const [cofinsCst, setCofinsCst] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }
    setInitialWarehouseId((current) => current || warehouses[0]?.id || "");
  }, [open, warehouses]);

  const categoryOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();

    for (const category of categories) {
      map.set(category.id, { id: category.id, name: category.name });
    }

    for (const category of createdCategories) {
      map.set(category.id, { id: category.id, name: category.name });
    }

    return Array.from(map.values()).sort((left, right) => left.name.localeCompare(right.name, "pt-BR"));
  }, [categories, createdCategories]);

  if (!open) {
    return null;
  }

  return (
    <div className="custom-scrollbar fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/60 px-4 py-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="create-product-title">
      <div className="auth-card-enter flex max-h-[calc(100svh-2rem)] min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-white shadow-2xl">
        <div className="shrink-0 flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Cadastro</p>
            <h2 id="create-product-title" className="mt-1 text-lg font-semibold text-slate-950">Novo produto</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" aria-label="Fechar cadastro de produto">
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <form
          className="custom-scrollbar grid min-h-0 gap-4 overflow-y-auto p-5 [scrollbar-gutter:stable]"
          onSubmit={(event) => {
            event.preventDefault();
            onSave({
              sku: sku.trim(),
              name: name.trim(),
              unit: unit.trim() || "UN",
              salePrice: salePrice.trim(),
              ...(costPrice.trim() ? { costPrice: costPrice.trim() } : {}),
              ...(categoryId ? { categoryId } : {}),
              ...(imageDataUrl ? { imageDataUrl, imageFileName } : {}),
              barcodes: barcode.trim() ? [barcode.trim()] : [],
              ...(initialQuantity.trim() && initialWarehouseId
                ? {
                    initialStock: {
                      warehouseId: initialWarehouseId,
                      quantity: initialQuantity.trim()
                    }
                  }
                : {}),
              ...(canManageFiscalProfile &&
              (ncm.trim() ||
                cest.trim() ||
                icmsCst.trim() ||
                icmsCsosn.trim() ||
                pisCst.trim() ||
                cofinsCst.trim() ||
                fiscalUnit.trim().toUpperCase() !== "UN")
                ? {
                    fiscalProfile: {
                      ...(ncm.trim() ? { ncm: ncm.trim() } : {}),
                      ...(cest.trim() ? { cest: cest.trim() } : {}),
                      ...(fiscalUnit.trim() ? { fiscalUnit: fiscalUnit.trim().toUpperCase() } : {}),
                      ...(icmsCst.trim() ? { icmsCst: icmsCst.trim() } : {}),
                      ...(icmsCsosn.trim() ? { icmsCsosn: icmsCsosn.trim() } : {}),
                      ...(pisCst.trim() ? { pisCst: pisCst.trim() } : {}),
                      ...(cofinsCst.trim() ? { cofinsCst: cofinsCst.trim() } : {})
                    }
                  }
                : {})
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-slate-950">
              SKU
              <input value={sku} onChange={(event) => setSku(event.target.value)} required placeholder="Ex: COCA-2L" className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-500" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-950">
              Unidade
              <input value={unit} onChange={(event) => setUnit(event.target.value)} placeholder="UN" className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-500" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-950 sm:col-span-2">
              Nome
              <input value={name} onChange={(event) => setName(event.target.value)} required placeholder="Ex: Coca-Cola 2L" className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-500" />
            </label>
            <div className="grid gap-2 text-sm font-medium text-slate-950 sm:col-span-2">
              Foto do produto
              <div className="flex flex-col gap-3 rounded-lg border border-border bg-slate-50 p-3 sm:flex-row sm:items-center">
                <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white">
                  {imageDataUrl ? (
                    <img src={imageDataUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon aria-hidden="true" size={24} className="text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap gap-2">
                    <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-slate-950 transition-[transform,border-color,background-color] duration-150 ease-[var(--ease-out)] hover:border-emerald-200 hover:bg-emerald-50 active:scale-[0.97] focus-within:ring-2 focus-within:ring-emerald-500">
                      <Upload aria-hidden="true" size={15} />
                      Selecionar foto
                      <input
                        type="file"
                        accept="image/png,image/jpeg"
                        className="sr-only"
                        onChange={async (event) => {
                          const file = event.target.files?.[0];
                          event.currentTarget.value = "";
                          if (!file) {
                            return;
                          }
                          try {
                            const image = await readProductImageFile(file);
                            setImageDataUrl(image.imageDataUrl);
                            setImageFileName(image.imageFileName);
                            setImageError("");
                          } catch (error) {
                            setImageError(error instanceof Error ? error.message : "Imagem inválida.");
                          }
                        }}
                      />
                    </label>
                    {imageDataUrl ? (
                      <button
                        type="button"
                        onClick={() => {
                          setImageDataUrl("");
                          setImageFileName("");
                          setImageError("");
                        }}
                        className="rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-slate-950 transition-[transform,background-color] hover:bg-slate-100 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
                        Remover
                      </button>
                    ) : null}
                  </div>
                  <p className="mt-2 truncate text-xs font-normal text-muted-foreground">{imageFileName || "PNG ou JPG até 5 MB. A foto será enviada ao iFood na sincronização."}</p>
                  {imageError ? <p className="mt-1 text-xs font-normal text-red-600">{imageError}</p> : null}
                </div>
              </div>
            </div>
            <label className="grid gap-1 text-sm font-medium text-slate-950">
              Preço de venda
              <input value={salePrice} onChange={(event) => setSalePrice(event.target.value)} required placeholder="12.90" className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-500" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-950">
              Preço de custo
              <input value={costPrice} onChange={(event) => setCostPrice(event.target.value)} placeholder="8.50" className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-500" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-950">
              Categoria
              <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">Sem categoria</option>
                {categoryOptions.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid gap-1 text-sm font-medium text-slate-950">
              Nova categoria
              <div className="flex gap-2">
                <input
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder="Ex: Bebidas"
                  className="flex-1 rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  disabled={isCreatingCategory || !newCategoryName.trim()}
                  onClick={async () => {
                    const categoryName = newCategoryName.trim();
                    if (!categoryName) {
                      return;
                    }

                    try {
                      const created = await onCreateCategory(categoryName);
                      setCreatedCategories((current) => {
                        const exists = current.some((item) => item.id === created.id);
                        return exists ? current : [...current, created];
                      });
                      setCategoryId(created.id);
                      setNewCategoryName("");
                    } catch {
                      // Feedback handled by global notification.
                    }
                  }}
                  className="inline-flex min-w-[88px] items-center justify-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-slate-950 transition-[transform,border-color,background-color] duration-150 ease-[var(--ease-out)] hover:border-emerald-200 hover:bg-emerald-50 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  {isCreatingCategory ? <Loader2 aria-hidden="true" size={15} className="animate-spin" /> : null}
                  Criar
                </button>
              </div>
              <p className="text-xs font-normal text-muted-foreground">Criando aqui, ela já entra no select e fica selecionada.</p>
            </div>
            <label className="grid gap-1 text-sm font-medium text-slate-950">
              EAN/Barcode
              <input value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder="789..." className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-500" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-950">
              Estoque inicial (opcional)
              <input value={initialQuantity} onChange={(event) => setInitialQuantity(event.target.value)} placeholder="10" className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-500" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-950">
              Depósito inicial
              <select value={initialWarehouseId} onChange={(event) => setInitialWarehouseId(event.target.value)} className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">Selecione</option>
                {warehouses.map((warehouse) => (
                  <option key={warehouse.id} value={warehouse.id}>
                    {warehouse.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
            <div className="mb-2">
              <p className="text-sm font-semibold text-slate-950">Dados fiscais do produto</p>
              <p className="text-xs text-muted-foreground">
                {canManageFiscalProfile ? "Preencha NCM/CST agora para evitar pendências fiscais depois." : "Seu usuário não tem permissão fiscal para editar esses dados."}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-medium text-slate-950">
                NCM
                <input disabled={!canManageFiscalProfile} value={ncm} onChange={(event) => setNcm(event.target.value)} placeholder="22021000" className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none disabled:bg-slate-100 disabled:text-muted-foreground focus:ring-2 focus:ring-emerald-500" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-950">
                CEST
                <input disabled={!canManageFiscalProfile} value={cest} onChange={(event) => setCest(event.target.value)} placeholder="03.001.00" className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none disabled:bg-slate-100 disabled:text-muted-foreground focus:ring-2 focus:ring-emerald-500" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-950">
                Unidade fiscal
                <input disabled={!canManageFiscalProfile} value={fiscalUnit} onChange={(event) => setFiscalUnit(event.target.value)} placeholder="UN" className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none disabled:bg-slate-100 disabled:text-muted-foreground focus:ring-2 focus:ring-emerald-500" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-950">
                ICMS CST
                <input disabled={!canManageFiscalProfile} value={icmsCst} onChange={(event) => setIcmsCst(event.target.value)} placeholder="00" className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none disabled:bg-slate-100 disabled:text-muted-foreground focus:ring-2 focus:ring-emerald-500" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-950">
                ICMS CSOSN
                <input disabled={!canManageFiscalProfile} value={icmsCsosn} onChange={(event) => setIcmsCsosn(event.target.value)} placeholder="102" className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none disabled:bg-slate-100 disabled:text-muted-foreground focus:ring-2 focus:ring-emerald-500" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-950">
                PIS CST
                <input disabled={!canManageFiscalProfile} value={pisCst} onChange={(event) => setPisCst(event.target.value)} placeholder="01" className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none disabled:bg-slate-100 disabled:text-muted-foreground focus:ring-2 focus:ring-emerald-500" />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-950">
                COFINS CST
                <input disabled={!canManageFiscalProfile} value={cofinsCst} onChange={(event) => setCofinsCst(event.target.value)} placeholder="01" className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none disabled:bg-slate-100 disabled:text-muted-foreground focus:ring-2 focus:ring-emerald-500" />
              </label>
            </div>
          </div>

          <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-col-reverse gap-2 border-t border-border bg-white px-5 py-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-2 text-sm font-medium text-slate-950 transition-[transform,background-color] hover:bg-slate-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
              Cancelar
            </button>
            <button type="submit" disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-[transform,background-color] hover:bg-emerald-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
              {isSaving ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : <PackagePlus aria-hidden="true" size={16} />}
              Criar produto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ProductEditDialog({
  product,
  categories,
  isSaving,
  onClose,
  onSave
}: {
  product: ProductItem | null;
  categories: CategoryListResponse["data"];
  isSaving: boolean;
  onClose: () => void;
  onSave: (input: ProductEditInput) => void;
}) {
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("UN");
  const [salePrice, setSalePrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [imageFileName, setImageFileName] = useState("");
  const [imageChanged, setImageChanged] = useState(false);
  const [imageError, setImageError] = useState("");

  useEffect(() => {
    if (!product) {
      return;
    }
    setSku(product.sku);
    setName(product.name);
    setUnit(product.unit || "UN");
    setSalePrice(product.branchPrices[0]?.salePrice ?? product.salePrice);
    setCostPrice(product.costPrice ?? "");
    setCategoryId(product.category?.id ?? "");
    setImageDataUrl(product.imageDataUrl ?? "");
    setImageFileName(product.imageFileName ?? "");
    setImageChanged(false);
    setImageError("");
  }, [product]);

  if (!product) {
    return null;
  }

  return (
    <div className="custom-scrollbar fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/60 px-4 py-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="edit-product-title">
      <div className="auth-card-enter flex max-h-[calc(100svh-2rem)] min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-white shadow-2xl">
        <div className="shrink-0 flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Produto</p>
            <h2 id="edit-product-title" className="mt-1 text-lg font-semibold text-slate-950">Editar produto</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" aria-label="Fechar edição de produto">
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <form
          className="custom-scrollbar grid min-h-0 gap-4 overflow-y-auto p-5 [scrollbar-gutter:stable]"
          onSubmit={(event) => {
            event.preventDefault();
            onSave({
              sku: sku.trim(),
              name: name.trim(),
              unit: unit.trim() || "UN",
              salePrice: salePrice.trim(),
              costPrice: costPrice.trim() ? costPrice.trim() : null,
              categoryId: categoryId || null,
              ...(imageChanged ? { imageDataUrl: imageDataUrl || null, imageFileName: imageFileName || null } : {})
            });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-slate-950">
              SKU
              <input value={sku} onChange={(event) => setSku(event.target.value)} required className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-500" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-950">
              Unidade
              <input value={unit} onChange={(event) => setUnit(event.target.value)} className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-500" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-950 sm:col-span-2">
              Nome
              <input value={name} onChange={(event) => setName(event.target.value)} required className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-500" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-950">
              Preço de venda
              <input value={salePrice} onChange={(event) => setSalePrice(event.target.value)} required className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-500" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-950">
              Preço de custo
              <input value={costPrice} onChange={(event) => setCostPrice(event.target.value)} className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-500" />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-950 sm:col-span-2">
              Categoria
              <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-500">
                <option value="">Sem categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid gap-2 text-sm font-medium text-slate-950">
            Foto do produto
            <div className="flex flex-col gap-3 rounded-lg border border-border bg-slate-50 p-3 sm:flex-row sm:items-center">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-white">
                {imageDataUrl ? <img src={imageDataUrl} alt="" className="h-full w-full object-cover" /> : <ImageIcon aria-hidden="true" size={24} className="text-slate-400" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-slate-950 transition-[transform,border-color,background-color] duration-150 ease-[var(--ease-out)] hover:border-emerald-200 hover:bg-emerald-50 active:scale-[0.97] focus-within:ring-2 focus-within:ring-emerald-500">
                    <Upload aria-hidden="true" size={15} />
                    Trocar foto
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="sr-only"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        event.currentTarget.value = "";
                        if (!file) {
                          return;
                        }
                        try {
                          const image = await readProductImageFile(file);
                          setImageDataUrl(image.imageDataUrl);
                          setImageFileName(image.imageFileName);
                          setImageChanged(true);
                          setImageError("");
                        } catch (error) {
                          setImageError(error instanceof Error ? error.message : "Imagem inválida.");
                        }
                      }}
                    />
                  </label>
                  {imageDataUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        setImageDataUrl("");
                        setImageFileName("");
                        setImageChanged(true);
                        setImageError("");
                      }}
                      className="rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-slate-950 transition-[transform,background-color] hover:bg-slate-100 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      Remover
                    </button>
                  ) : null}
                </div>
                <p className="mt-2 truncate text-xs font-normal text-muted-foreground">{imageFileName || "PNG ou JPG até 5 MB."}</p>
                {imageError ? <p className="mt-1 text-xs font-normal text-red-600">{imageError}</p> : null}
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 -mx-5 -mb-5 flex flex-col-reverse gap-2 border-t border-border bg-white px-5 py-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-2 text-sm font-medium text-slate-950 transition-[transform,background-color] hover:bg-slate-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
              Cancelar
            </button>
            <button type="submit" disabled={isSaving} className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-[transform,background-color] hover:bg-emerald-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
              {isSaving ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : <Check aria-hidden="true" size={16} />}
              Salvar alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function SalesPdvSection({
  products,
  warehouses,
  productsIsLoading,
  productsIsFetching,
  productsError,
  warehousesIsLoading,
  warehousesError,
  searchDraft,
  onSearchDraftChange,
  onApplySearch,
  onClearSearch,
  page,
  hasNextPage,
  hasPreviousPage,
  onNextPage,
  onPreviousPage,
  resetKey,
  isCreating,
  onCreateSale
}: {
  products: ProductListResponse["data"];
  warehouses: Array<{ id: string; name: string }>;
  productsIsLoading: boolean;
  productsIsFetching: boolean;
  productsError: Error | null;
  warehousesIsLoading: boolean;
  warehousesError: Error | null;
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onApplySearch: () => void;
  onClearSearch: () => void;
  page: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onNextPage: () => void;
  onPreviousPage: () => void;
  resetKey: number;
  isCreating: boolean;
  onCreateSale: (input: { warehouseId: string; paymentMethod: SalePaymentMethod; items: Array<{ productId: string; quantity: string; unitPrice: string }> }) => void;
}) {
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>("PIX");
  const [cart, setCart] = useState<Array<{ productId: string; name: string; unitPrice: string; quantity: number }>>([]);

  useEffect(() => {
    setSelectedWarehouseId((current) => (warehouses.some((warehouse) => warehouse.id === current) ? current : warehouses[0]?.id || ""));
  }, [warehouses]);

  useEffect(() => {
    setCart([]);
  }, [resetKey]);

  const total = useMemo(
    () =>
      cart.reduce((sum, item) => {
        return sum + Number(item.unitPrice) * item.quantity;
      }, 0),
    [cart]
  );
  const selectedWarehouseIsValid = warehouses.some((warehouse) => warehouse.id === selectedWarehouseId);

  function addProduct(product: ProductItem) {
    if (!product.active) {
      return;
    }
    const unitPrice = product.branchPrices[0]?.salePrice ?? product.salePrice;
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      if (existing) {
        return current.map((item) => (item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item));
      }
      return [...current, { productId: product.id, name: product.name, unitPrice, quantity: 1 }];
    });
  }

  return (
    <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
      <article className="rounded-lg border border-border bg-white">
        <div className="border-b border-border px-4 py-3">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <h2 className="text-base font-semibold">PDV - Produtos</h2>
              <p className="text-sm text-muted-foreground">Busque por nome, SKU ou código de barras e adicione ao carrinho.</p>
            </div>
            <form
              className="w-full min-w-0 xl:max-w-xl"
              onSubmit={(event) => {
                event.preventDefault();
                onApplySearch();
              }}
            >
              <label className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-emerald-500">
                <Search aria-hidden="true" size={16} className="text-muted-foreground" />
                <input
                  value={searchDraft}
                  onChange={(event) => onSearchDraftChange(event.target.value)}
                  maxLength={120}
                  placeholder="Buscar por nome, SKU ou EAN..."
                  className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                />
                {searchDraft ? (
                  <button type="button" onClick={onClearSearch} className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-slate-100 hover:text-slate-950" aria-label="Limpar busca">
                    <X aria-hidden="true" size={14} />
                  </button>
                ) : null}
              </label>
            </form>
          </div>
        </div>
        <div className="divide-y divide-border">
          {productsIsLoading ? <p className="px-4 py-5 text-sm text-muted-foreground">Carregando produtos do PDV...</p> : null}
          {productsError ? <p className="px-4 py-5 text-sm text-red-600">{productsError.message}</p> : null}
          {products.map((product) => (
            <div key={product.id} className="grid gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-slate-50">
                  {product.imageDataUrl ? (
                    <img src={product.imageDataUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon aria-hidden="true" size={18} className="text-slate-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-slate-950">{product.name}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {product.sku} · {product.barcodes[0]?.barcode ?? "Sem EAN"} · {product.category?.name ?? "Sem categoria"}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 md:justify-end">
                <span className="text-sm font-semibold">{money(product.branchPrices[0]?.salePrice ?? product.salePrice)}</span>
                <button
                  type="button"
                  onClick={() => addProduct(product)}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-[transform,background-color] hover:bg-emerald-700 active:scale-[0.97]"
                >
                  Adicionar
                </button>
              </div>
            </div>
          ))}
          {!productsIsLoading && products.length === 0 ? <p className="px-4 py-5 text-sm text-muted-foreground">Nenhum produto ativo encontrado para vender neste PDV.</p> : null}
        </div>
        <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {productsIsFetching ? "Atualizando produtos..." : `Página ${page}. Use a busca para localizar por nome, SKU ou EAN.`}
          </p>
          <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-white p-1">
            <button
              type="button"
              onClick={onPreviousPage}
              disabled={!hasPreviousPage || productsIsFetching}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-[transform,background-color,color] hover:bg-slate-100 hover:text-slate-950 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              Anterior
            </button>
            <span className="min-w-10 rounded-md bg-slate-950 px-3 py-2 text-center text-sm font-semibold text-white">{page}</span>
            <button
              type="button"
              onClick={onNextPage}
              disabled={!hasNextPage || productsIsFetching}
              className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-[transform,background-color,color] hover:bg-slate-100 hover:text-slate-950 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              Próxima
            </button>
          </div>
        </div>
      </article>

      <article className="rounded-lg border border-border bg-white">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-base font-semibold">Carrinho</h2>
          <p className="text-sm text-muted-foreground">Finalize a venda com baixa de estoque no depósito escolhido.</p>
        </div>
        <div className="space-y-3 p-4">
          {warehousesIsLoading ? <p className="rounded-md border border-border bg-slate-50 px-3 py-2 text-sm text-muted-foreground">Carregando depósitos...</p> : null}
          {warehousesError ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{warehousesError.message}</p> : null}
          {!warehousesIsLoading && !warehousesError && warehouses.length === 0 ? (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">Cadastre ou ative um depósito para esta loja antes de vender.</p>
          ) : null}
          <label className="grid gap-1 text-sm font-medium text-slate-950">
            Depósito
            <select value={selectedWarehouseId} onChange={(event) => setSelectedWarehouseId(event.target.value)} className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="">Selecione</option>
              {warehouses.map((warehouse) => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name}
                </option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-sm font-medium text-slate-950">
            Forma de pagamento
            <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as SalePaymentMethod)} className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-500">
              {salePaymentOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
            {cart.map((item) => (
              <div key={item.productId} className="rounded-md border border-border p-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-medium text-slate-950">{item.name}</p>
                  <button
                    type="button"
                    onClick={() => setCart((current) => current.filter((entry) => entry.productId !== item.productId))}
                    className="rounded-md p-1 text-muted-foreground transition-[transform,background-color,color] hover:bg-slate-100 hover:text-slate-950 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    aria-label={`Remover ${item.name} do carrinho`}
                  >
                    <X aria-hidden="true" size={14} />
                  </button>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(event) => {
                      const value = Math.max(1, Number(event.target.value || 1));
                      setCart((current) => current.map((entry) => (entry.productId === item.productId ? { ...entry, quantity: value } : entry)));
                    }}
                    className="w-20 rounded-md border border-border px-2 py-1 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <span className="text-sm font-semibold">{money(Number(item.unitPrice) * item.quantity)}</span>
                </div>
              </div>
            ))}
            {cart.length === 0 ? <p className="text-sm text-muted-foreground">Carrinho vazio.</p> : null}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="text-lg font-semibold text-slate-950">{money(total)}</span>
          </div>

          <button
            type="button"
            disabled={isCreating || cart.length === 0 || !selectedWarehouseIsValid}
            onClick={() => {
              if (!selectedWarehouseIsValid) {
                return;
              }
              onCreateSale({
                warehouseId: selectedWarehouseId,
                paymentMethod,
                items: cart.map((item) => ({ productId: item.productId, quantity: String(item.quantity), unitPrice: item.unitPrice }))
              });
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-[transform,background-color] hover:bg-emerald-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            {isCreating ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : <ShoppingCart aria-hidden="true" size={16} />}
            Finalizar venda
          </button>
        </div>
      </article>
    </section>
  );
}

const operationalModules: Record<OperationalTab, OperationalModuleConfig> = {
  alerts: {
    title: "Alertas",
    eyebrow: "Atenção do dia",
    description: "Sinais claros para agir antes de faltar produto, perder venda ou acumular pendência.",
    endpoint: "/api/v1/alerts",
    searchPlaceholder: "Buscar alerta...",
    emptyMessage: "Nenhum alerta crítico agora.",
    primaryAction: "Configurar regra",
    actionTitle: "Configurar alertas?",
    actionDescription: "Defina quando você quer ser avisado sobre estoque, vendas e outras situações importantes.",
    status: "connected"
  },
  "global-search": {
    title: "Busca rápida",
    eyebrow: "Encontre sem navegar",
    description: "Localiza produto, SKU, EAN, cliente, fornecedor e venda em uma busca única, sempre com limite por tipo de resultado.",
    endpoint: "/api/v1/search",
    searchPlaceholder: "Digite produto, SKU, EAN, cliente ou venda...",
    emptyMessage: "Digite algo na busca para encontrar registros.",
    primaryAction: "Abrir busca",
    actionTitle: "Abrir busca rápida?",
    actionDescription: "Digite o que procura para encontrar produtos, clientes, fornecedores e vendas.",
    status: "connected"
  },
  sales: {
    title: "Vendas",
    eyebrow: "Operação",
    description: "Vendas da loja ativa com total, cliente, origem e status. Cancelamentos preservam histórico e devolvem estoque.",
    endpoint: "/api/v1/sales",
    searchPlaceholder: "Buscar por cliente...",
    emptyMessage: "Nenhuma venda encontrada.",
    primaryAction: "Nova venda",
    actionTitle: "Criar venda?",
    actionDescription: "Abra o PDV para registrar uma venda e atualizar o estoque.",
    status: "connected"
  },
  "sales-history": {
    title: "Histórico de vendas",
    eyebrow: "Acompanhamento",
    description: "Acompanhe vendas da loja ativa por cliente, origem, status, itens e pagamentos registrados.",
    endpoint: "/api/v1/sales",
    searchPlaceholder: "Buscar por cliente...",
    emptyMessage: "Nenhuma venda encontrada no histórico.",
    primaryAction: "Nova venda",
    actionTitle: "Abrir PDV?",
    actionDescription: "Você será levado para a tela de venda para registrar uma nova operação.",
    status: "connected"
  },
  payments: {
    title: "Pagamentos",
    eyebrow: "Financeiro",
    description: "Visão dos pagamentos já registrados nas vendas, com status e total por operação.",
    endpoint: "/api/v1/sales",
    searchPlaceholder: "Buscar venda por cliente...",
    emptyMessage: "Nenhum pagamento encontrado nas vendas atuais.",
    status: "connected"
  },
  receivables: {
    title: "Contas a receber",
    eyebrow: "Financeiro",
    description: "Acompanhe vendas com saldo pendente para priorizar cobrança e reduzir atraso de recebimento.",
    endpoint: "/api/v1/finance/receivables",
    searchPlaceholder: "Buscar venda por cliente...",
    emptyMessage: "Nenhuma conta a receber encontrada.",
    primaryAction: "Ver vendas",
    actionTitle: "Ver vendas?",
    actionDescription: "As contas a receber são criadas ao registrar uma venda a prazo. Aqui você pode acompanhar, baixar ou cancelar as contas existentes.",
    status: "connected"
  },
  payables: {
    title: "Contas a pagar",
    eyebrow: "Financeiro",
    description: "Controle compromissos de compras para manter previsão de caixa e evitar atraso com fornecedores.",
    endpoint: "/api/v1/finance/payables",
    searchPlaceholder: "Buscar compra por fornecedor...",
    emptyMessage: "Nenhuma conta a pagar encontrada.",
    primaryAction: "Ver compras",
    actionTitle: "Ver compras?",
    actionDescription: "As contas a pagar são criadas ao registrar uma compra. Aqui você pode acompanhar, baixar ou cancelar as contas existentes.",
    status: "connected"
  },
  purchases: {
    title: "Compras",
    eyebrow: "Reposição",
    description: "Pedidos de compra da loja ativa. Compra criada não altera estoque até ser recebida.",
    endpoint: "/api/v1/purchases",
    searchPlaceholder: "Buscar por fornecedor...",
    emptyMessage: "Nenhuma compra encontrada.",
    primaryAction: "Nova compra",
    actionTitle: "Nova compra",
    actionDescription: "Informe fornecedor, depósito, produto, quantidade e custo para registrar o pedido.",
    status: "connected"
  },
  multistore: {
    title: "Lojas da empresa",
    eyebrow: "Comparação",
    description: "Comparação rápida das lojas ativas da empresa para navegação e acompanhamento operacional.",
    endpoint: "/api/v1/branches",
    searchPlaceholder: "Buscar loja...",
    emptyMessage: "Nenhuma loja encontrada.",
    primaryAction: "Comparar lojas",
    actionTitle: "Comparar lojas?",
    actionDescription: "Cadastre uma nova loja e o depósito que ela usará no dia a dia.",
    status: "connected"
  },
  transfers: {
    title: "Transferências",
    eyebrow: "Estoque",
    description: "Transferências entre depósitos e lojas, com status e recebimento controlado.",
    endpoint: "/api/v1/inventory/transfers",
    emptyMessage: "Nenhuma transferência encontrada.",
    primaryAction: "Nova transferência",
    actionTitle: "Criar transferência?",
    actionDescription: "Informe origem, destino e itens para transferir estoque entre lojas ou depósitos.",
    status: "connected"
  },
  counts: {
    title: "Inventário",
    eyebrow: "Contagem física",
    description: "Contagens físicas por depósito. Confirmar inventário gera ajuste, nunca sobrescreve estoque direto.",
    endpoint: "/api/v1/inventory/counts",
    emptyMessage: "Nenhum inventário encontrado.",
    primaryAction: "Criar inventário",
    actionTitle: "Criar inventário?",
    actionDescription: "Escolha o depósito e registre a contagem dos produtos.",
    status: "connected"
  },
  fiscal: {
    title: "Fiscal",
    eyebrow: "Pendências fiscais",
    description: "Produtos sem perfil fiscal, NCM, ICMS, PIS ou COFINS visíveis sem bloquear o cadastro simples.",
    endpoint: "/api/v1/fiscal/pending-products",
    searchPlaceholder: "Buscar produto pendente...",
    emptyMessage: "Nenhuma pendência fiscal encontrada.",
    primaryAction: "Ver regras fiscais",
    actionTitle: "Abrir regras fiscais?",
    actionDescription: "Defina as regras fiscais usadas nos produtos da sua empresa.",
    status: "connected"
  },
  imports: {
    title: "Migração",
    eyebrow: "Importação",
    description: "Importe dados de CSV ou XLSX, revise as informações e corrija os erros antes de concluir.",
    endpoint: "/api/v1/imports/jobs",
    searchPlaceholder: "Buscar arquivo ou origem...",
    emptyMessage: "Nenhuma importação feita ainda.",
    primaryAction: "Preparar importação",
    actionTitle: "Preparar importação?",
    actionDescription: "Selecione um arquivo para começar a importar seus dados.",
    status: "connected"
  },
  integrations: {
    title: "iFood",
    eyebrow: "Integrações",
    description: "Conecte o iFood da loja atual para vender online e manter produtos, estoque e pedidos no Pulso.",
    endpoint: "/api/v1/integrations/connections",
    searchPlaceholder: "Buscar loja conectada...",
    emptyMessage: "Esta loja ainda não tem iFood conectado.",
    primaryAction: "Conectar iFood",
    actionTitle: "Conectar iFood?",
    actionDescription: "Vamos abrir o iFood para você autorizar esta loja. Depois é só colar o código exibido.",
    status: "foundation"
  },
  channels: {
    title: "Catálogo iFood",
    eyebrow: "Integrações",
    description: "Envie produtos, preços, fotos e estoque da loja atual para o iFood.",
    endpoint: "/api/v1/integrations/connections",
    searchPlaceholder: "Buscar loja conectada...",
    emptyMessage: "Conecte o iFood desta loja antes de sincronizar produtos.",
    primaryAction: "Sincronizar catálogo",
    actionTitle: "Sincronizar catálogo iFood?",
    actionDescription: "Vamos enviar os produtos cadastrados, preços, fotos e estoque atual desta loja para o iFood.",
    status: "connected"
  },
  "ifood-catalog": {
    title: "Itens do iFood",
    eyebrow: "Catálogo externo",
    description: "Veja os itens que já existem no iFood e vincule ou crie produtos no ERP para processar pedidos.",
    endpoint: "/api/v1/integrations/connections",
    searchPlaceholder: "Buscar item, código ou categoria...",
    emptyMessage: "Nenhum item iFood encontrado nesta loja.",
    primaryAction: "Atualizar itens",
    actionTitle: "Atualizar itens do iFood?",
    actionDescription: "Vamos buscar novamente o catálogo atual do iFood e mostrar os itens sem vínculo.",
    status: "connected"
  },
  "ifood-pending": {
    title: "Pendências iFood",
    eyebrow: "Operação",
    description: "Itens aceitos no pedido iFood que ainda precisam de vínculo ou reserva de estoque no ERP.",
    endpoint: "/api/v1/integrations/connections",
    searchPlaceholder: "Buscar item pendente...",
    emptyMessage: "Nenhuma pendência iFood aberta.",
    primaryAction: "Atualizar pendências",
    actionTitle: "Atualizar pendências iFood?",
    actionDescription: "Vamos recarregar itens pendentes de vínculo e estoque.",
    status: "connected"
  },
  "ifood-orders": {
    title: "Pedidos iFood",
    eyebrow: "Venda online",
    description: "Acompanhe pedidos recebidos, notificações do iFood, reservas de estoque, pendências e conclusão operacional.",
    endpoint: "/api/v1/sales",
    searchPlaceholder: "Buscar por cliente do pedido...",
    emptyMessage: "Nenhum pedido iFood recebido nesta loja.",
    primaryAction: "Atualizar notificações",
    actionTitle: "Atualizar notificações do iFood?",
    actionDescription: "Vamos atualizar pedidos e pendências recebidos pelo iFood.",
    status: "connected"
  },
  reports: {
    title: "Relatórios",
    eyebrow: "Análise",
    description: "Gere relatórios para acompanhar os resultados da sua operação.",
    endpoint: "/api/v1/reports/jobs",
    emptyMessage: "Nenhum relatório gerado ainda.",
    primaryAction: "Gerar relatório",
    actionTitle: "Gerar relatório?",
    actionDescription: "Escolha os filtros e gere o relatório.",
    status: "connected"
  },
  users: {
    title: "Usuários e permissões",
    eyebrow: "Acesso",
    description: "Usuários da empresa atual com papéis e lojas permitidas. Alterações sensíveis exigem auditoria.",
    endpoint: "/api/v1/users",
    searchPlaceholder: "Buscar usuário ou e-mail...",
    emptyMessage: "Nenhum usuário encontrado.",
    primaryAction: "Novo usuário",
    actionTitle: "Criar usuário?",
    actionDescription: "Informe os dados do usuário, o perfil de acesso e as lojas permitidas.",
    status: "connected"
  },
  settings: {
    title: "Configurações",
    eyebrow: "Empresa e lojas",
    description: "Empresas, lojas e depósitos do contexto atual, sem confundir organização com empresa legal.",
    endpoint: "/api/v1/warehouses",
    searchPlaceholder: "Buscar depósito...",
    emptyMessage: "Nenhum depósito encontrado.",
    primaryAction: "Configurar empresa",
    actionTitle: "Configurar empresa?",
    actionDescription: "Cadastre os depósitos usados pela loja selecionada.",
    status: "foundation"
  }
};

const operationalTabs = new Set<DashboardTab>(Object.keys(operationalModules) as DashboardTab[]);

function isOperationalTab(tab: DashboardTab): tab is OperationalTab {
  return operationalTabs.has(tab);
}

function asRecord(value: unknown) {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : null;
}

function textValue(value: unknown, fallback = "Sem informação") {
  if (value === null || value === undefined || value === "") {
    return fallback;
  }
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
}

function isEntityIdValue(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9_-]{8,80}$/i.test(value);
}

function nestedName(item: GenericListItem, key: string, fallback = "Sem vínculo") {
  return textValue(asRecord(item[key])?.name, fallback);
}

function dateValue(value: unknown) {
  return typeof value === "string" ? new Date(value).toLocaleDateString("pt-BR") : "Sem data";
}

function isProductDetailsData(value: unknown): value is ProductItem {
  const record = asRecord(value);
  if (!record) {
    return false;
  }
  return (
    typeof record.id === "string" &&
    typeof record.sku === "string" &&
    typeof record.name === "string" &&
    typeof record.unit === "string" &&
    typeof record.salePrice === "string" &&
    typeof record.active === "boolean"
  );
}

const detailLabels: Record<string, string> = {
  active: "Status",
  amount: "Valor",
  barcode: "Código de barras",
  barcodes: "Códigos de barras",
  branch: "Loja",
  branchAccesses: "Lojas permitidas",
  branchPrices: "Preços por loja",
  category: "Categoria",
  channel: "Canal",
  companyAccesses: "Acessos da empresa",
  connectedAt: "Conectado em",
  costPrice: "Custo",
  countedQuantity: "Quantidade contada",
  createdAt: "Criado em",
  customer: "Cliente",
  discount: "Desconto",
  email: "E-mail",
  externalAccountId: "Conta externa",
  fileName: "Arquivo",
  invalidRows: "Linhas com atenção",
  items: "Itens",
  lastError: "Último erro",
  lastSyncedAt: "Última sincronização",
  legalName: "Razão social",
  method: "Forma de pagamento",
  name: "Nome",
  paidValue: "Valor pago",
  payments: "Pagamentos",
  phone: "Telefone",
  product: "Produto",
  quantity: "Quantidade",
  quantityDelta: "Variação",
  reasons: "Pendências",
  resultType: "Tipo",
  salePrice: "Preço de venda",
  source: "Origem",
  status: "Status",
  subtotal: "Subtotal",
  supplier: "Fornecedor",
  title: "Título",
  total: "Total",
  tradeName: "Nome fantasia",
  type: "Tipo",
  unit: "Unidade",
  unitCost: "Custo unitário",
  unitPrice: "Preço unitário",
  updatedAt: "Atualizado em",
  validRows: "Linhas válidas",
  warehouse: "Depósito"
};

const hiddenDetailKeys = new Set([
  "accessToken",
  "authorizationCodeVerifier",
  "clientSecret",
  "companyId",
  "createdBy",
  "imageDataUrl",
  "imageMimeType",
  "imageSizeBytes",
  "imageUpdatedAt",
  "password",
  "passwordHash",
  "refreshToken",
  "tokenEncrypted",
  "updatedBy"
]);

const moneyDetailKeys = new Set(["amount", "costPrice", "discount", "paidValue", "salePrice", "subtotal", "total", "unitCost", "unitPrice"]);
const quantityDetailKeys = new Set(["countedQuantity", "invalidRows", "quantity", "quantityDelta", "validRows"]);
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });
const enumLabels: Record<string, string> = {
  API: "API",
  BANK_TRANSFER: "Transferência bancária",
  CANCELLED: "Cancelado",
  CASH: "Dinheiro",
  COMPLETED: "Concluído",
  CONNECTED: "Conectado",
  CREDIT_CARD: "Cartão de crédito",
  DEBIT_CARD: "Cartão de débito",
  DISCONNECTED: "Desconectado",
  DRAFT: "Rascunho",
  ECOMMERCE: "E-commerce",
  ERROR: "Erro",
  FINANCIAL_DUE: "Vencimento financeiro",
  IFOOD: "iFood",
  IFOOD_ORDER: "Pedido iFood",
  IMPORT: "Importação",
  MANUAL: "Manual",
  MARKETPLACE: "Marketplace",
  OPEN: "Aberto",
  ORDERED: "Pedido realizado",
  OTHER: "Outro",
  PAID: "Quitado",
  PAUSED: "Pausado",
  PENDING: "Pendente",
  PENDING_LINK: "Vincular produto",
  PIX: "PIX",
  POS: "PDV",
  RECEIVED: "Recebido",
  RESERVED: "Reservado",
  PLACED: "Recebido",
  CONFIRMED: "Confirmado",
  DELIVERY_DROP_CODE_REQUESTED: "Código de entrega solicitado",
  DELIVERY_CODE_REQUESTED: "Código de entrega solicitado",
  PICKUP_CODE_REQUESTED: "Código de coleta solicitado",
  ASSIGN_DRIVER: "Entregador definido",
  DELIVERY_GROUP_ASSIGNED: "Entrega agrupada",
  PREPARATION_STARTED: "Preparando",
  READY_TO_PICKUP: "Pronto",
  DISPATCHED: "Despachado",
  DELIVERED: "Entregue",
  SYNCED: "Sincronizado",
  VOUCHER: "Vale/refeição"
};

const ifoodOrderStatusOptions: Array<{ value: IfoodOrderStatusFilter; label: string }> = [
  { value: "ALL", label: "Todos" },
  { value: "PENDING", label: "Pendente" },
  { value: "RESERVED", label: "Reservado" },
  { value: "PREPARATION_STARTED", label: "Preparando" },
  { value: "READY_TO_PICKUP", label: "Pronto" },
  { value: "DISPATCHED", label: "Despachado" },
  { value: "COMPLETED", label: "Concluído" },
  { value: "CANCELLED", label: "Cancelado" }
];

function normalizeIfoodOrderStatus(item: GenericListItem) {
  const status = textValue(item.ifoodOrderStatus, textValue(item.status, "RESERVED"));
  if (status.includes("CANCEL")) {
    return "CANCELLED";
  }
  if (status === "DELIVERY_DROP_CODE_REQUESTED" || status === "DELIVERY_CODE_REQUESTED" || status === "PICKUP_CODE_REQUESTED" || status === "ASSIGN_DRIVER" || status === "DELIVERY_GROUP_ASSIGNED") {
    return textValue(item.status, "RESERVED");
  }
  if (status === "CONFIRMED" || status === "PLACED") {
    return textValue(item.status, "RESERVED");
  }
  if (status === "CONCLUDED" || status === "DELIVERED") {
    return "COMPLETED";
  }
  return status;
}

function ifoodOrderNotificationId(item: GenericListItem) {
  return textValue(item.ifoodOrderId, textValue(item.id, textValue(item.createdAt, "")));
}

function ifoodOrderStatusLabel(item: GenericListItem) {
  const rawStatus = textValue(item.ifoodOrderStatus, "");
  const normalized = normalizeIfoodOrderStatus(item);
  return enumLabels[rawStatus] ?? enumLabels[normalized] ?? (rawStatus || normalized);
}

function ifoodOrderProductSummary(item: GenericListItem) {
  const ifoodItems = Array.isArray(item.ifoodOrderItems) ? item.ifoodOrderItems.map(asRecord).filter((value): value is Record<string, unknown> => Boolean(value)) : [];
  const ifoodNames = ifoodItems.map((orderItem) => textValue(orderItem.name, "")).filter(Boolean);
  if (ifoodNames.length > 0) {
    const visible = ifoodNames.slice(0, 2).join(", ");
    return ifoodNames.length > 2 ? `${visible}...` : visible;
  }

  return "Itens do iFood ainda carregando";
}

function statusPillClass(status: string) {
  switch (status) {
    case "FAILED":
    case "CANCELLED":
      return "bg-red-50 text-red-700";
    case "PROCESSING":
    case "PENDING":
    case "PENDING_LINK":
      return "bg-amber-50 text-amber-700";
    case "RECEIVED":
    case "PLACED":
    case "CONFIRMED":
      return "bg-cyan-50 text-cyan-700";
    case "PREPARATION_STARTED":
      return "bg-indigo-50 text-indigo-700";
    case "READY_TO_PICKUP":
      return "bg-violet-50 text-violet-700";
    case "DISPATCHED":
      return "bg-blue-50 text-blue-700";
    case "RESERVED":
    case "COMPLETED":
    case "DELIVERED":
    case "SYNCED":
      return "bg-emerald-50 text-emerald-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function detailLabel(key: string) {
  if (detailLabels[key]) {
    return detailLabels[key];
  }
  return key
    .replace(/Id$/, "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function isHiddenDetailKey(key: string) {
  return hiddenDetailKeys.has(key) || key.endsWith("Id") || key.toLowerCase().includes("secret") || key.toLowerCase().includes("token");
}

function formatDetailValue(key: string, value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "Não informado";
  }
  if (typeof value === "boolean") {
    return value ? "Sim" : "Não";
  }
  if (typeof value === "number") {
    return quantityDetailKeys.has(key) ? numberFormatter.format(value) : String(value);
  }
  if (typeof value !== "string") {
    return null;
  }

  const enumLabel = enumLabels[value];
  if (enumLabel) {
    return enumLabel;
  }
  if ((key.endsWith("At") || key.toLowerCase().includes("date")) && !Number.isNaN(Date.parse(value))) {
    return dateFormatter.format(new Date(value));
  }
  if (moneyDetailKeys.has(key)) {
    return money(value);
  }
  if (quantityDetailKeys.has(key)) {
    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numberFormatter.format(numericValue) : value;
  }
  return value;
}

function compactRecordValue(value: unknown) {
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  return textValue(record.name ?? record.title ?? record.email ?? record.sku ?? record.method ?? record.status, "");
}

function detailFieldEntries(record: Record<string, unknown>) {
  return Object.entries(record)
    .filter(([key, value]) => !isHiddenDetailKey(key) && !Array.isArray(value))
    .map(([key, value]) => {
      const compact = compactRecordValue(value);
      const formatted = compact || formatDetailValue(key, value);
      return formatted ? { key, label: detailLabel(key), value: formatted } : null;
    })
    .filter((entry): entry is { key: string; label: string; value: string } => Boolean(entry));
}

function detailArraySections(record: Record<string, unknown>) {
  return Object.entries(record).filter(([key, value]) => !isHiddenDetailKey(key) && Array.isArray(value)) as Array<[string, unknown[]]>;
}

function IfoodEventDetailsContent({ event }: { event: unknown }) {
  const record = asRecord(event) ?? {};
  const payload = asRecord(record.payload) ?? {};
  const orderItems = Array.isArray(payload.orderItems)
    ? payload.orderItems.map(asRecord).filter((item): item is Record<string, unknown> => Boolean(item))
    : [];
  const processingError = textValue(payload.processingError, "Sem erro registrado.");

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-red-100 bg-red-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">Log do processamento</p>
        <p className="mt-2 break-words text-sm font-medium leading-6 text-red-900">{processingError}</p>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["Evento", textValue(record.eventType, "-")],
          ["Status", textValue(record.status, "-")],
          ["Tentativas", textValue(record.attempts, "0")],
          ["ID do evento", textValue(record.externalEventId, "-")],
          ["Pedido iFood", textValue(payload.orderDisplayId, textValue(payload.orderId, "-"))],
          ["Criado em", dateValue(record.createdAt)]
        ].map(([label, value]) => (
          <article key={label} className="min-w-0 rounded-lg border border-border bg-slate-50 p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 break-words text-sm font-medium text-slate-950">{value}</p>
          </article>
        ))}
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-950">Itens recebidos do iFood</h3>
        {orderItems.length > 0 ? (
          <div className="grid gap-2">
            {orderItems.map((item, index) => (
              <article key={`${textValue(item.id, "item")}-${index}`} className="rounded-lg border border-border bg-white p-3">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-slate-950">{textValue(item.name, `Item ${index + 1}`)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Use estes códigos para vincular ao produto do ERP.</p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {numberFormatter.format(Number(textValue(item.quantity, "0")) || 0)}x
                  </span>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["External code", textValue(item.externalCode, "-")],
                    ["Item ID", textValue(item.id, "-")],
                    ["EAN", textValue(item.ean, "-")],
                    ["Preço", money(textValue(item.unitPrice ?? item.price, "0"))]
                  ].map(([label, value]) => (
                    <div key={label} className="min-w-0 rounded-md bg-slate-50 px-3 py-2">
                      <p className="text-xs text-muted-foreground">{label}</p>
                      <p className="mt-1 break-words font-mono text-sm text-slate-950">{value}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="rounded-md border border-border bg-slate-50 px-3 py-2 text-sm text-muted-foreground">Nenhum item gravado no log deste evento.</p>
        )}
      </section>

      <ReadableDetailsContent data={record} />
    </div>
  );
}

function IfoodOrderDetailsContent({ order }: { order: unknown }) {
  const record = asRecord(order) ?? {};
  const storedPayments = Array.isArray(record.payments) ? record.payments.map(asRecord).filter((item): item is Record<string, unknown> => Boolean(item)) : [];
  const ifoodPayments = Array.isArray(record.ifoodPaymentMethods) ? record.ifoodPaymentMethods.map(asRecord).filter((item): item is Record<string, unknown> => Boolean(item)) : [];
  const ifoodOrderItems = Array.isArray(record.ifoodOrderItems) ? record.ifoodOrderItems.map(asRecord).filter((item): item is Record<string, unknown> => Boolean(item)) : [];
  const payments = (storedPayments.length > 0 ? storedPayments : ifoodPayments).filter((payment) => Number(textValue(payment.amount, "0")) > 0);
  const customer = asRecord(record.customer);
  const warehouse = asRecord(record.warehouse);
  const orderNumber = textValue(record.ifoodDisplayId, "Aguardando número do iFood");
  const status = ifoodOrderStatusLabel(record as GenericListItem);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ["Pedido iFood", orderNumber],
          ["Cliente", textValue(customer?.name, "Cliente não informado")],
          ["Status", status],
          ["Última notificação", enumLabels[textValue(record.ifoodLastNotification, "")] ?? textValue(record.ifoodLastNotification, "Sem notificação extra")],
          ["Data", dateValue(record.createdAt)],
          ["Depósito", textValue(warehouse?.name, "Não informado")],
          ["Total", money(textValue(record.total, "0"))]
        ].map(([label, value]) => (
          <article key={label} className="min-w-0 rounded-lg border border-border bg-slate-50 p-3">
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="mt-1 break-words text-sm font-medium text-slate-950">{value}</p>
          </article>
        ))}
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-950">Produtos</h3>
        <div className="overflow-hidden rounded-lg border border-border">
          <div className="grid grid-cols-[1fr_80px_110px_110px] gap-3 border-b border-border bg-slate-50 px-3 py-2 text-xs font-medium text-muted-foreground">
            <span>Produto</span>
            <span>Qtd.</span>
            <span>Unitário</span>
            <span>Total</span>
          </div>
          {ifoodOrderItems.length > 0 ? (
            ifoodOrderItems.map((item, index) => {
              const quantity = Number(textValue(item.quantity, "0")) || 0;
              const unitPrice = Number(textValue(item.unitPrice ?? item.price, "0")) || 0;
              const total = quantity * unitPrice;
              return (
                <div key={textValue(item.id, `ifood-item-${index}`)} className="grid grid-cols-[1fr_80px_110px_110px] gap-3 border-b border-border px-3 py-3 text-sm last:border-b-0">
                  <div className="min-w-0">
                    <p className="break-words font-medium text-slate-950">{textValue(item.name, "Produto iFood")}</p>
                    <p className="mt-1 break-words text-xs text-muted-foreground">Código {textValue(item.externalCode, textValue(item.ean, textValue(item.id, "-")))}</p>
                  </div>
                  <p className="tabular-nums text-slate-700">{quantity || textValue(item.quantity, "-")}</p>
                  <p className="tabular-nums text-slate-700">{money(unitPrice)}</p>
                  <p className="tabular-nums font-medium text-slate-950">{money(total)}</p>
                </div>
              );
            })
          ) : (
            <p className="px-3 py-3 text-sm text-muted-foreground">Itens oficiais do iFood ainda não disponíveis para este pedido.</p>
          )}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-lg border border-border bg-slate-50 p-3">
          <p className="text-xs text-muted-foreground">Subtotal</p>
          <p className="mt-1 text-sm font-medium text-slate-950">{money(textValue(record.subtotal, "0"))}</p>
        </article>
        <article className="rounded-lg border border-border bg-slate-50 p-3">
          <p className="text-xs text-muted-foreground">Desconto</p>
          <p className="mt-1 text-sm font-medium text-slate-950">{money(textValue(record.discount, "0"))}</p>
        </article>
        <article className="rounded-lg border border-border bg-slate-50 p-3">
          <p className="text-xs text-muted-foreground">Pagamento</p>
          <p className="mt-1 text-sm font-medium text-slate-950">
            {payments.length > 0 ? payments.map((payment) => `${formatDetailValue("method", payment.method)} ${money(textValue(payment.amount, "0"))}`).join(", ") : "Não informado pelo iFood"}
          </p>
        </article>
      </section>
    </div>
  );
}

function ReadableDetailsContent({ data }: { data: unknown }) {
  const record = asRecord(data);
  if (!record) {
    return <p className="text-sm text-muted-foreground">{formatDetailValue("value", data)}</p>;
  }

  const fields = detailFieldEntries(record);
  const arrays = detailArraySections(record);

  return (
    <div className="space-y-5">
      {fields.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((field) => (
            <article key={field.key} className="min-w-0 rounded-lg border border-border bg-slate-50 p-3">
              <p className="text-xs text-muted-foreground">{field.label}</p>
              <p className="mt-1 break-words text-sm font-medium text-slate-950">{field.value}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="rounded-md border border-border bg-slate-50 px-3 py-2 text-sm text-muted-foreground">Nenhum detalhe adicional para exibir.</p>
      )}

      {arrays.map(([key, items]) => (
        <ReadableDetailsArray key={key} title={detailLabel(key)} items={items} />
      ))}
    </div>
  );
}

function ReadableDetailsArray({ title, items }: { title: string; items: unknown[] }) {
  if (items.length === 0) {
    return (
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        <p className="rounded-md border border-border bg-slate-50 px-3 py-2 text-sm text-muted-foreground">Nenhum item registrado.</p>
      </section>
    );
  }

  const primitiveItems = items.filter((item) => !asRecord(item));
  if (primitiveItems.length === items.length) {
    return (
      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
        <div className="flex flex-wrap gap-2">
          {primitiveItems.map((item, index) => (
            <span key={`${title}-${index}`} className="rounded-full border border-border bg-white px-3 py-1 text-sm text-slate-700">
              {formatDetailValue(title, item)}
            </span>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-950">{title}</h3>
      <div className="grid gap-2">
        {items.map((item, index) => {
          const record = asRecord(item);
          if (!record) {
            return null;
          }
          const fields = detailFieldEntries(record);
          const titleValue = compactRecordValue(record.product) || compactRecordValue(record.customer) || compactRecordValue(record.supplier) || compactRecordValue(record.warehouse) || textValue(record.name ?? record.title ?? record.method ?? record.status, `${title} ${index + 1}`);
          return (
            <article key={`${title}-${index}`} className="rounded-lg border border-border bg-white p-3">
              <p className="text-sm font-semibold text-slate-950">{titleValue}</p>
              {fields.length > 0 ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {fields.map((field) => (
                    <div key={field.key} className="min-w-0 rounded-md bg-slate-50 px-3 py-2">
                      <p className="text-xs text-muted-foreground">{field.label}</p>
                      <p className="mt-1 break-words text-sm font-medium text-slate-950">{field.value}</p>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function BusyOverlay({ message }: { message: string }) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center bg-slate-950/30 px-4 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-lg border border-white/70 bg-white/90 px-4 py-3 text-sm font-medium text-slate-800 shadow-lg shadow-slate-950/10">
        <Loader2 aria-hidden="true" size={18} className="animate-spin text-emerald-700" />
        <span>{message}</span>
      </div>
    </div>
  );
}

function saleFriendlyNumber(item: GenericListItem) {
  const ifoodNumber = textValue(item.ifoodDisplayId ?? item.displayId ?? item.orderDisplayId, "");
  if (ifoodNumber) {
    return ifoodNumber;
  }
  const saleNumber = Number(item.saleNumber);
  return Number.isSafeInteger(saleNumber) && saleNumber > 0 ? String(saleNumber) : "Sem número";
}

function saleHasOfficialIfoodNumber(item: GenericListItem) {
  return Boolean(textValue(item.ifoodDisplayId ?? item.displayId ?? item.orderDisplayId, ""));
}

function saleHistoryDisplayStatus(item: GenericListItem) {
  const source = textValue(item.source, "MANUAL");
  const terminalStatus = textValue(item.ifoodTerminalStatus, "");
  if (source === "IFOOD" && (terminalStatus === "COMPLETED" || terminalStatus === "CANCELLED")) {
    return terminalStatus;
  }
  const lastIfoodEventType = textValue(item.ifoodLastEventType, "");
  if (source === "IFOOD" && (lastIfoodEventType === "CONCLUDED" || lastIfoodEventType === "DELIVERED" || lastIfoodEventType.endsWith("_CONCLUDED") || lastIfoodEventType.endsWith("_DELIVERED"))) {
    return "COMPLETED";
  }
  if (source === "IFOOD" && (lastIfoodEventType === "CANCELLED" || lastIfoodEventType.endsWith("_CANCELLED"))) {
    return "CANCELLED";
  }
  const status = textValue(item.status, "");
  if (source === "IFOOD" && status === "PENDING") {
    return "RECEIVED";
  }
  return status;
}

function itemSummary(tab: OperationalTab, item: GenericListItem) {
  const fiscalReasons = Array.isArray(item.reasons) ? item.reasons.length : 0;
  const itemCount = Array.isArray(item.items) ? item.items.length : 0;
  const paymentCount = Array.isArray(item.payments) ? item.payments.length : 0;
  const totalValue = Number(textValue(item.total, "0")) || 0;
  const paidValue = Array.isArray(item.payments)
    ? item.payments.reduce((sum, payment) => sum + (Number(asRecord(payment)?.amount ?? 0) || 0), 0)
    : 0;
  const receivedValue = Math.min(Math.max(paidValue, 0), totalValue);
  const pendingValue = Math.max(totalValue - receivedValue, 0);

  switch (tab) {
    case "sales":
    case "sales-history": {
      const source = textValue(item.source, "MANUAL");
      const friendlyNumber = saleFriendlyNumber(item);
      const displayStatus = tab === "sales-history" ? saleHistoryDisplayStatus(item) : textValue(item.status, "");
      const titlePrefix = source === "IFOOD"
        ? saleHasOfficialIfoodNumber(item)
          ? `Pedido iFood #${friendlyNumber}`
          : `Pedido iFood · Venda #${friendlyNumber}`
        : `Venda #${friendlyNumber}`;
      return {
        title: `${titlePrefix} · ${money(textValue(item.total, "0"))}`,
        subtitle: nestedName(item, "customer", "Cliente não informado"),
        meta: `${enumLabels[source] ?? source} · ${dateValue(item.createdAt)}`,
        status: displayStatus
      };
    }
    case "ifood-orders": {
      if (textValue(item.kind) === "IFOOD_EVENT") {
        const payload = asRecord(item.payload) ?? {};
        const orderDisplayId = textValue(payload.orderDisplayId, "");
        const orderItems = Array.isArray(payload.orderItems) ? payload.orderItems.map(asRecord).filter(Boolean) : [];
        const firstOrderItem = orderItems[0];
        const firstItemLabel = firstOrderItem
          ? `${textValue(firstOrderItem.name, "Item iFood")} · codigo ${textValue(firstOrderItem.externalCode, textValue(firstOrderItem.ean, textValue(firstOrderItem.id, "-")))}`
          : null;
        return {
          title: orderDisplayId ? `Pedido iFood #${orderDisplayId} · ${textValue(item.eventType, "Atualização")}` : `Evento iFood ${textValue(item.eventType, "pedido")}`,
          subtitle: firstItemLabel ? `${firstItemLabel} · ${textValue(payload.processingError, "Falha ao processar.")}` : textValue(payload.processingError, "Aguardando processamento do evento."),
          meta: `${textValue(item.externalEventId, "sem id")} · ${dateValue(item.createdAt)}`,
          status: textValue(item.status, "RECEIVED")
        };
      }
      const displayId = textValue(item.ifoodDisplayId, "");
      return {
        title: displayId ? `Pedido iFood #${displayId}` : "Pedido iFood · aguardando número",
        subtitle: ifoodOrderProductSummary(item),
        meta: `${itemCount} item${itemCount === 1 ? "" : "s"} · ${money(textValue(item.total, "0"))} · ${dateValue(item.createdAt)}`,
        status: ifoodOrderStatusLabel(item)
      };
    }
    case "ifood-catalog":
      return {
        title: textValue(item.name, "Item iFood"),
        subtitle: textValue(item.linked, "false") === "true" || item.linked === true
          ? `Vinculado a ${nestedName(item, "mappedProduct", "produto ERP")}`
          : `Sem vínculo no ERP · código ${textValue(item.externalCode, textValue(item.ean, textValue(item.ifoodItemId, "-")))}`,
        meta: `${textValue(item.categoryName, "Sem categoria")} · ${money(textValue(item.price, "0"))}`,
        status: item.linked ? "Vinculado" : "Pendente"
      };
    case "ifood-pending": {
      const pendingOrderNumber = textValue(item.ifoodDisplayId, "");
      return {
        title: textValue(item.name, "Item iFood pendente"),
        subtitle: `${pendingOrderNumber ? `Pedido iFood #${pendingOrderNumber}` : "Pedido iFood aguardando número"} · código ${textValue(item.externalCode, textValue(item.ifoodItemId, "-"))}`,
        meta: `${textValue(item.quantity, "0")}x · ${money(textValue(item.unitPrice, "0"))}`,
        status: textValue(item.status, "PENDING_LINK")
      };
    }
    case "payments": {
      const paymentSaleNumber = saleFriendlyNumber(item);
      const paymentSource = textValue(item.source, "MANUAL");
      const paymentReference = paymentSource === "IFOOD" && saleHasOfficialIfoodNumber(item) ? `Pedido iFood #${paymentSaleNumber}` : `Venda #${paymentSaleNumber}`;
      return {
        title: `${paymentReference} · ${paymentCount} pagamento${paymentCount === 1 ? "" : "s"} · ${money(textValue(item.total, "0"))}`,
        subtitle: nestedName(item, "customer", "Cliente não informado"),
        meta: `${dateValue(item.createdAt)} · ${textValue(item.status)}`,
        status: paymentCount > 0 ? "Registrado" : "Sem pagamento"
      };
    }
    case "receivables":
      if (textValue(item.sourceType, "") || textValue(item.direction, "")) {
        const amount = Number(textValue(item.amount, "0")) || 0;
        const paid = Number(textValue(item.paidAmount, "0")) || 0;
        const financialStatus = textValue(item.status, "OPEN");
        return {
          title: `${money(Math.max(amount - paid, 0))} a receber`,
          subtitle: textValue(item.partyName, "Cliente não informado"),
          meta: `Vence em ${dateValue(item.dueDate)} · Parcela ${textValue(item.installmentNumber, "1")}/${textValue(item.installmentTotal, "1")}`,
          status: financialStatus === "PAID" ? "Quitado" : financialStatus === "CANCELLED" ? "Cancelado" : "Em aberto"
        };
      }
      return {
        title: `${money(pendingValue)} pendente`,
        subtitle: nestedName(item, "customer", "Cliente não informado"),
        meta: `Total ${money(totalValue)} · Recebido ${money(receivedValue)}`,
        status: pendingValue > 0 ? "Em aberto" : "Quitado"
      };
    case "payables":
      if (textValue(item.sourceType, "") || textValue(item.direction, "")) {
        const amount = Number(textValue(item.amount, "0")) || 0;
        const paid = Number(textValue(item.paidAmount, "0")) || 0;
        const financialStatus = textValue(item.status, "OPEN");
        return {
          title: `${money(Math.max(amount - paid, 0))} a pagar`,
          subtitle: textValue(item.partyName, "Fornecedor não informado"),
          meta: `Vence em ${dateValue(item.dueDate)} · Parcela ${textValue(item.installmentNumber, "1")}/${textValue(item.installmentTotal, "1")}`,
          status: financialStatus === "PAID" ? "Quitado" : financialStatus === "CANCELLED" ? "Cancelado" : "Em aberto"
        };
      }
      return {
        title: `${money(textValue(item.total, "0"))} a pagar`,
        subtitle: nestedName(item, "supplier", "Fornecedor não informado"),
        meta: `${nestedName(item, "warehouse", "Depósito não informado")} · ${dateValue(item.createdAt)}`,
        status: textValue(item.status, "Pendente")
      };
    case "purchases":
      return {
        title: `${money(textValue(item.total, "0"))} em compra`,
        subtitle: nestedName(item, "supplier", "Fornecedor não informado"),
        meta: `${nestedName(item, "warehouse", "Depósito não informado")} · ${dateValue(item.createdAt)}`,
        status: textValue(item.status)
      };
    case "transfers":
      return {
        title: `${nestedName(item, "sourceBranch", "Origem")} → ${nestedName(item, "destinationBranch", "Destino")}`,
        subtitle: `${itemCount} item${itemCount === 1 ? "" : "s"} · ${textValue(item.reason, "Sem motivo informado")}`,
        meta: `${nestedName(item, "sourceWarehouse")} para ${nestedName(item, "destinationWarehouse")} · ${dateValue(item.createdAt)}`,
        status: textValue(item.status)
      };
    case "counts":
      return {
        title: `Inventário em ${nestedName(item, "warehouse", "depósito")}`,
        subtitle: `${itemCount} produto${itemCount === 1 ? "" : "s"} contado${itemCount === 1 ? "" : "s"}`,
        meta: dateValue(item.createdAt),
        status: textValue(item.status)
      };
    case "fiscal":
      return {
        title: textValue(item.name, "Produto sem nome"),
        subtitle: `${textValue(item.sku, "Sem SKU")} · ${fiscalReasons} pendência${fiscalReasons === 1 ? "" : "s"}`,
        meta: Array.isArray(item.reasons) ? item.reasons.join(", ") : "Sem detalhes",
        status: fiscalReasons > 0 ? "Pendente" : "OK"
      };
    case "alerts":
      return {
        title: textValue(item.title, "Alerta sem título"),
        subtitle: textValue(item.message, "Sem detalhes"),
        meta: `${textValue(item.type, "ALERTA")} · ${dateValue(item.createdAt)}`,
        status: textValue(item.status ?? item.severity, "Aberto")
      };
    case "global-search":
      return {
        title: textValue(item.name, "Resultado"),
        subtitle: textValue(item.subtitle, "Sem detalhe adicional"),
        meta: `${textValue(item.resultType, "Registro")} · ${dateValue(item.createdAt)}`,
        status: textValue(item.resultType, "Encontrado")
      };
    case "imports":
      return {
        title: textValue(item.fileName, `Importação ${textValue(item.source, "")}`),
        subtitle: `${textValue(item.validRows, "0")} válidos · ${textValue(item.invalidRows, "0")} com atenção`,
        meta: `${textValue(item.source, "CSV")} · ${dateValue(item.createdAt)}`,
        status: textValue(item.status, "Pendente")
      };
    case "integrations": {
      const integrationStatus = textValue(item.status, "DISCONNECTED");
      const connectedAt = item.connectedAt ? dateValue(item.connectedAt) : null;
      return {
        title: integrationStatus === "CONNECTED" ? "iFood conectado nesta loja" : "iFood aguardando autorização",
        subtitle: integrationStatus === "CONNECTED" ? "Produtos e estoque podem ser enviados para venda online" : "Autorize no iFood e cole o código exibido",
        meta: connectedAt ? `Conectada em ${connectedAt}` : `Criada em ${dateValue(item.createdAt)}`,
        status: integrationStatus === "CONNECTED" ? "Conectado" : integrationStatus === "ERROR" ? "Erro" : integrationStatus === "PAUSED" ? "Pausado" : "Pendente"
      };
    }
    case "reports":
      return {
        title: `Relatório de ${textValue(item.type, "operação").toLowerCase()}`,
        subtitle: "Processamento preparado para worker quando o volume exigir.",
        meta: dateValue(item.createdAt),
        status: textValue(item.status, "Pendente")
      };
    case "users":
      return {
        title: textValue(item.name, "Usuário sem nome"),
        subtitle: textValue(item.email, "Sem e-mail"),
        meta: `${Array.isArray(item.branchAccesses) ? item.branchAccesses.length : 0} loja${Array.isArray(item.branchAccesses) && item.branchAccesses.length === 1 ? "" : "s"}`,
        status: item.active === false ? "Inativo" : "Ativo"
      };
    case "settings":
      return {
        title: textValue(item.name, "Depósito sem nome"),
        subtitle: "Depósito da loja atual",
        meta: dateValue(item.createdAt),
        status: item.active === false ? "Inativo" : "Ativo"
      };
    case "multistore":
      return {
        title: textValue(item.name, "Loja sem nome"),
        subtitle: "Filial da empresa atual",
        meta: dateValue(item.createdAt),
        status: item.active === false ? "Inativa" : "Ativa"
      };
    default:
      return {
        title: textValue(item.name ?? item.id, "Registro"),
        subtitle: textValue(item.description, "Base disponível para próxima etapa"),
        meta: dateValue(item.createdAt),
        status: textValue(item.status ?? item.active, "Base")
      };
  }
}

function OperationalModuleSection({
  tab,
  config,
  query,
  searchDraft,
  onSearchDraftChange,
  onApplySearch,
  onClearSearch,
  limit,
  onLimitChange,
  page,
  onPrevious,
  onNext,
  onPrimaryAction,
  onViewDetails,
  onIfoodOrderAction,
  onIfoodOrderCancel,
  onSaleCancel,
  onPurchaseReceive,
  onPurchaseCancel,
  onFinancialSettle,
  onFinancialCancel,
  ifoodOrdersView = "orders",
  onIfoodOrdersViewChange,
  ifoodOrderStatusFilter = "ALL",
  onIfoodOrderStatusFilterChange,
  operationalStatusFilter = "ALL",
  onOperationalStatusFilterChange,
  ifoodPendingQuery,
  isActionPending = false
}: {
  tab: OperationalTab;
  config: OperationalModuleConfig;
  query: {
    data: GenericListResponse | undefined;
    isLoading: boolean;
    isFetching: boolean;
    error: Error | null;
  };
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onApplySearch: () => void;
  onClearSearch: () => void;
  limit: number;
  onLimitChange: (limit: number) => void;
  page: number;
  onPrevious: () => void;
  onNext: () => void;
  onPrimaryAction: (item?: GenericListItem) => void;
  onViewDetails: (item: GenericListItem) => void;
  onIfoodOrderAction?: (saleId: string, action: "START_PREPARATION" | "READY_TO_PICKUP" | "DISPATCH") => void;
  onIfoodOrderCancel?: (item: GenericListItem) => void;
  onSaleCancel?: (item: GenericListItem) => void;
  onPurchaseReceive?: (item: GenericListItem) => void;
  onPurchaseCancel?: (item: GenericListItem) => void;
  onFinancialSettle?: (item: GenericListItem) => void;
  onFinancialCancel?: (item: GenericListItem) => void;
  ifoodOrdersView?: IfoodOrdersView;
  onIfoodOrdersViewChange?: (view: IfoodOrdersView) => void;
  ifoodOrderStatusFilter?: IfoodOrderStatusFilter;
  onIfoodOrderStatusFilterChange?: (status: IfoodOrderStatusFilter) => void;
  operationalStatusFilter?: string;
  onOperationalStatusFilterChange?: (status: string) => void;
  ifoodPendingQuery?: {
    data: GenericListResponse | undefined;
    isLoading: boolean;
    isFetching: boolean;
    error: Error | null;
  };
  isActionPending?: boolean;
}) {
  const connected = config.status === "connected";
  const statusClass = connected
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : config.status === "foundation"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-slate-200 bg-slate-50 text-slate-600";
  const baseItems = query.data?.data ?? [];
  const pendingItems = ifoodPendingQuery?.data?.data ?? [];
  const orderItems = baseItems.filter((item) => textValue(asRecord(item)?.kind, "") !== "IFOOD_EVENT");
  const logItems = baseItems.filter((item) => textValue(asRecord(item)?.kind, "") === "IFOOD_EVENT");
  const filteredOrderItems = orderItems.filter((item) => ifoodOrderStatusFilter === "ALL" || normalizeIfoodOrderStatus(item) === ifoodOrderStatusFilter);
  const saleFinancialState = (item: GenericListItem) => {
    const status = textValue(item.status, "");
    if (status === "CANCELLED") {
      return "CANCELLED";
    }
    if (textValue(item.direction, "")) {
      return status === "PAID" ? "PAID" : "OPEN";
    }
    const totalValue = Number(textValue(item.total, "0")) || 0;
    const paidValue = Array.isArray(item.payments) ? item.payments.reduce((sum, payment) => sum + (Number(asRecord(payment)?.amount ?? 0) || 0), 0) : 0;
    return Math.max(totalValue - paidValue, 0) > 0 ? "OPEN" : "PAID";
  };
  const operationalFilterOptions =
    tab === "sales-history"
      ? [
          { value: "ALL", label: "Todas" },
          { value: "COMPLETED", label: "Concluídas" },
          { value: "RESERVED", label: "Reservadas" },
          { value: "CANCELLED", label: "Canceladas" },
          { value: "IFOOD", label: "iFood" },
          { value: "POS", label: "PDV" }
        ]
      : tab === "receivables"
        ? [
            { value: "ALL", label: "Todas" },
            { value: "OPEN", label: "Em aberto" },
            { value: "PAID", label: "Quitadas" },
            { value: "CANCELLED", label: "Canceladas" }
          ]
      : tab === "payables"
        ? [
            { value: "ALL", label: "Todas" },
            { value: "OPEN", label: "Em aberto" },
            { value: "PAID", label: "Quitadas" },
            { value: "OVERDUE", label: "Vencidas" },
            { value: "CANCELLED", label: "Canceladas" }
          ]
      : tab === "purchases"
        ? [
            { value: "ALL", label: "Todas" },
            { value: "DRAFT", label: "Rascunho" },
            { value: "ORDERED", label: "Pedido" },
            { value: "RECEIVED", label: "Recebida" },
            { value: "CANCELLED", label: "Cancelada" }
          ]
      : [];
  const filteredOperationalItems =
    operationalStatusFilter === "ALL"
      ? baseItems
      : baseItems.filter((item) => {
          if (tab === "receivables") {
            return saleFinancialState(item) === operationalStatusFilter;
          }
          if (tab === "payables") {
            if (operationalStatusFilter === "OVERDUE") {
              const dueDate = typeof item.dueDate === "string" ? new Date(item.dueDate) : null;
              return textValue(item.status, "") === "OPEN" && Boolean(dueDate && dueDate < new Date());
            }
            return textValue(item.status, "") === operationalStatusFilter;
          }
          if (tab === "sales-history" && (operationalStatusFilter === "IFOOD" || operationalStatusFilter === "POS")) {
            return textValue(item.source, "") === operationalStatusFilter;
          }
          if (tab === "sales-history") {
            return saleHistoryDisplayStatus(item) === operationalStatusFilter;
          }
          return textValue(item.status, "") === operationalStatusFilter;
        });
  const operationalFilterCounts = operationalFilterOptions.reduce<Record<string, number>>((acc, option) => {
    acc[option.value] =
      option.value === "ALL"
        ? baseItems.length
        : baseItems.filter((item) => {
            if (tab === "receivables") {
              return saleFinancialState(item) === option.value;
            }
            if (tab === "payables") {
              if (option.value === "OVERDUE") {
                const dueDate = typeof item.dueDate === "string" ? new Date(item.dueDate) : null;
                return textValue(item.status, "") === "OPEN" && Boolean(dueDate && dueDate < new Date());
              }
              return textValue(item.status, "") === option.value;
            }
            if (tab === "sales-history" && (option.value === "IFOOD" || option.value === "POS")) {
              return textValue(item.source, "") === option.value;
            }
            if (tab === "sales-history") {
              return saleHistoryDisplayStatus(item) === option.value;
            }
            return textValue(item.status, "") === option.value;
          }).length;
    return acc;
  }, {});
  const filteredTotalValue = filteredOperationalItems.reduce((sum, item) => sum + (Number(textValue(item.total ?? item.amount, "0")) || 0), 0);
  const filteredPendingValue = filteredOperationalItems.reduce((sum, item) => {
    if (tab === "receivables") {
      const totalValue = Number(textValue(item.total ?? item.amount, "0")) || 0;
      const paidValue = Array.isArray(item.payments) ? item.payments.reduce((paymentSum, payment) => paymentSum + (Number(asRecord(payment)?.amount ?? 0) || 0), 0) : 0;
      const entryPaidValue = Number(textValue(item.paidAmount, "0")) || 0;
      return sum + Math.max(totalValue - Math.max(paidValue, entryPaidValue), 0);
    }
    if (tab === "payables") {
      const amount = Number(textValue(item.amount, "0")) || 0;
      const paid = Number(textValue(item.paidAmount, "0")) || 0;
      return textValue(item.status, "") === "PAID" || textValue(item.status, "") === "CANCELLED" ? sum : sum + Math.max(amount - paid, 0);
    }
    if (tab === "purchases") {
      return textValue(item.status, "") === "RECEIVED" || textValue(item.status, "") === "CANCELLED" ? sum : sum + (Number(textValue(item.total, "0")) || 0);
    }
    return sum;
  }, 0);
  const operationalMetricCards =
    operationalFilterOptions.length > 0
      ? [
          { label: "Pedidos", value: numberFormatter.format(filteredOperationalItems.length) },
          { label: tab === "receivables" ? "Total em vendas" : tab === "payables" || tab === "purchases" ? "Total em compras" : "Total vendido", value: money(filteredTotalValue) },
          {
            label: tab === "receivables" ? "A receber" : tab === "payables" || tab === "purchases" ? "Em aberto" : "Canceladas",
            value: tab === "sales-history" ? numberFormatter.format(operationalFilterCounts.CANCELLED ?? 0) : money(filteredPendingValue)
          }
        ]
      : [];
  const items = tab === "ifood-orders" ? (ifoodOrdersView === "pending" ? pendingItems : ifoodOrdersView === "logs" ? logItems : filteredOrderItems) : filteredOperationalItems;
  const activeQuery = tab === "ifood-orders" && ifoodOrdersView === "pending" && ifoodPendingQuery ? ifoodPendingQuery : query;
  const summary = activeQuery.data?.summary;
  const ifoodOrderStatusCounts = ifoodOrderStatusOptions.reduce<Record<IfoodOrderStatusFilter, number>>((acc, option) => {
    acc[option.value] = option.value === "ALL" ? orderItems.length : orderItems.filter((item) => normalizeIfoodOrderStatus(item) === option.value).length;
    return acc;
  }, {} as Record<IfoodOrderStatusFilter, number>);
  const isIfoodTab = tab === "integrations" || tab === "channels";
  const hasConnectedIfood = isIfoodTab && items.some((item) => textValue(asRecord(item)?.status, "DISCONNECTED") === "CONNECTED");
  const hasIfoodConnection = isIfoodTab && items.length > 0;
  const moduleConnected = isIfoodTab ? hasConnectedIfood : connected;
  const moduleStatusClass = moduleConnected
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : isIfoodTab && hasIfoodConnection
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : statusClass;
  const moduleStatusLabel = moduleConnected ? "Conectado" : isIfoodTab && hasIfoodConnection ? "Pendente" : config.status === "foundation" ? "Base pronta" : "Planejado";
  const primaryItem = isIfoodTab ? items[0] : undefined;
  const primaryActionLabel =
    tab === "integrations" && hasIfoodConnection ? (moduleConnected ? "Verificar iFood" : "Conectar iFood") : config.primaryAction;

  return (
    <section className="rounded-lg border border-border bg-white">
      <div className="border-b border-border px-4 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">{config.eyebrow}</p>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${moduleStatusClass}`}>
                {moduleStatusLabel}
              </span>
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-normal text-slate-950">{config.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{config.description}</p>
          </div>

          {primaryActionLabel ? (
            <button
              type="button"
              onClick={() => onPrimaryAction(primaryItem)}
              disabled={isActionPending}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white transition-[transform,background-color] duration-150 ease-[var(--ease-out)] hover:bg-slate-800 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              {isActionPending ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : <ArrowRight aria-hidden="true" size={16} />}
              {isActionPending ? "Atualizando..." : primaryActionLabel}
            </button>
          ) : null}
        </div>

        {config.endpoint ? (
          <form
            className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              onApplySearch();
            }}
          >
            <label className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-emerald-500">
              <Search aria-hidden="true" size={16} className="text-muted-foreground" />
              <span className="sr-only">Buscar em {config.title}</span>
              <input
                value={searchDraft}
                onChange={(event) => onSearchDraftChange(event.target.value)}
                placeholder={config.searchPlaceholder ?? "Buscar..."}
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </label>
            <button
              type="submit"
              className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white transition-[transform,background-color] duration-150 ease-[var(--ease-out)] hover:bg-slate-800 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              Buscar
            </button>
            <button
              type="button"
              onClick={onClearSearch}
              className="rounded-md border border-border px-3 py-2 text-sm font-medium text-slate-950 transition-[transform,border-color,background-color] duration-150 ease-[var(--ease-out)] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              Limpar
            </button>
          </form>
        ) : null}

        {summary ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {Object.entries(summary).slice(0, 3).map(([key, value]) => (
              <article key={key} className="rounded-lg border border-border bg-slate-50 p-3">
                <p className="text-xs text-muted-foreground">{key}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-950">{textValue(value, "0")}</p>
              </article>
            ))}
          </div>
        ) : null}
        {operationalMetricCards.length > 0 ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            {operationalMetricCards.map((metric) => (
              <article key={metric.label} className="rounded-lg border border-border bg-slate-50 p-3">
                <p className="text-xs text-muted-foreground">{metric.label}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-950">{metric.value}</p>
              </article>
            ))}
          </div>
        ) : null}
      </div>

      {config.endpoint ? (
        <>
          {tab === "ifood-orders" ? (
            <div className="border-b border-border px-4 py-3">
              <div className="flex flex-wrap gap-2">
                {[
                  { value: "orders" as const, label: "Pedidos", count: orderItems.length },
                  { value: "pending" as const, label: "Pendências", count: pendingItems.length },
                  { value: "logs" as const, label: "Logs", count: logItems.length }
                ].map((view) => {
                  const active = ifoodOrdersView === view.value;
                  return (
                    <button
                      key={view.value}
                      type="button"
                      onClick={() => onIfoodOrdersViewChange?.(view.value)}
                      className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-[transform,border-color,background-color,color] duration-150 ease-[var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                        active ? "border-slate-950 bg-slate-950 text-white" : "border-border bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50"
                      }`}
                    >
                      {view.label}
                      <span className={`rounded-full px-1.5 py-0.5 text-[11px] ${active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600"}`}>{view.count}</span>
                    </button>
                  );
                })}
              </div>
              {ifoodOrdersView === "orders" ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {ifoodOrderStatusOptions.map((option) => {
                    const active = ifoodOrderStatusFilter === option.value;
                    const colorClass = option.value === "ALL" ? "bg-slate-100 text-slate-700" : statusPillClass(option.value);
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => onIfoodOrderStatusFilterChange?.(option.value)}
                        className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-[transform,border-color,background-color] duration-150 ease-[var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                          active ? "border-slate-950 bg-white text-slate-950 shadow-sm" : "border-transparent bg-white text-slate-600 hover:border-border hover:bg-slate-50"
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${colorClass.split(" ")[0]}`} />
                        {option.label}
                        <span className="tabular-nums text-slate-500">{ifoodOrderStatusCounts[option.value] ?? 0}</span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}
          {operationalFilterOptions.length > 0 ? (
            <div className="border-b border-border px-4 py-3">
              <div className="flex flex-wrap gap-2">
                {operationalFilterOptions.map((option) => {
                  const active = operationalStatusFilter === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onOperationalStatusFilterChange?.(option.value)}
                      className={`inline-flex h-8 items-center gap-2 rounded-full border px-3 text-xs font-medium transition-[transform,border-color,background-color,color] duration-150 ease-[var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                        active ? "border-slate-950 bg-slate-950 text-white" : "border-border bg-white text-slate-600 hover:border-emerald-200 hover:bg-emerald-50 hover:text-slate-950"
                      }`}
                    >
                      {option.label}
                      <span className={`tabular-nums ${active ? "text-white/80" : "text-slate-500"}`}>{operationalFilterCounts[option.value] ?? 0}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <div className="divide-y divide-border">
            {activeQuery.isLoading ? <p className="px-4 py-5 text-sm text-muted-foreground">Carregando {config.title.toLowerCase()}...</p> : null}
            {activeQuery.error ? <p className="px-4 py-5 text-sm text-red-600">{activeQuery.error.message}</p> : null}
            {tab === "ifood-orders" && (query.isFetching || ifoodPendingQuery?.isFetching) && !activeQuery.isLoading ? (
              <div className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-muted-foreground">
                <Loader2 aria-hidden="true" size={14} className="animate-spin text-emerald-700" />
                Atualizando notificações e logs do iFood...
              </div>
            ) : null}
            {items.map((item) => {
              const displayedAsPending = tab === "ifood-orders" && ifoodOrdersView === "pending";
              const summaryItem = itemSummary(displayedAsPending ? "ifood-pending" : tab, item);
              const isIfoodEventItem = textValue(asRecord(item)?.kind, "") === "IFOOD_EVENT";
              const itemStatus =
                tab === "ifood-orders" && !isIfoodEventItem && !displayedAsPending
                  ? normalizeIfoodOrderStatus(item)
                  : tab === "sales-history"
                    ? saleHistoryDisplayStatus(item)
                    : textValue(asRecord(item)?.status, "DISCONNECTED");
              const itemActionLabel =
                tab === "integrations"
                  ? itemStatus === "CONNECTED"
                    ? "Verificar"
                    : "Conectar"
                  : tab === "ifood-catalog" && !asRecord(item)?.linked
                    ? "Vincular"
                    : tab === "ifood-pending" || displayedAsPending
                      ? "Resolver"
                      : tab === "ifood-orders"
                        ? isIfoodEventItem
                          ? "Atualizar log"
                          : "Atualizar notificações"
                        : "Abrir";
              const showItemAction =
                tab === "payments"
                  ? false
                  : tab === "ifood-orders"
                  ? displayedAsPending || isIfoodEventItem
                  : tab !== "ifood-catalog" || !asRecord(item)?.linked;
              const itemStatusClass =
                tab === "integrations" && itemStatus === "CONNECTED"
                  ? "bg-emerald-50 text-emerald-700"
                  : tab === "integrations"
                    ? "bg-amber-50 text-amber-700"
                    : itemStatus === "COMPLETED" || itemStatus === "RECEIVED" || summaryItem.status === "Quitado"
                      ? "bg-emerald-50 text-emerald-700"
                    : itemStatus === "CANCELLED" || summaryItem.status === "Cancelado"
                      ? "bg-red-50 text-red-700"
                    : itemStatus === "ORDERED" || itemStatus === "DRAFT" || summaryItem.status === "Em aberto"
                      ? "bg-amber-50 text-amber-700"
                    : tab === "ifood-catalog" && asRecord(item)?.linked
                      ? "bg-emerald-50 text-emerald-700"
                      : tab === "ifood-catalog"
                        ? "bg-amber-50 text-amber-700"
                    : tab === "ifood-orders"
                      ? statusPillClass(itemStatus)
                    : "bg-slate-100 text-slate-600";
              return (
                <article key={item.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[1fr_180px_280px] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <h3 className="truncate text-sm font-medium">{summaryItem.title}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${itemStatusClass}`}>{summaryItem.status}</span>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{summaryItem.subtitle}</p>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{summaryItem.meta}</p>
                  <div className="flex items-center gap-2 lg:justify-end">
                    {(tab === "receivables" || tab === "payables") && itemStatus === "OPEN" && onFinancialSettle ? (
                      <button
                        type="button"
                        disabled={isActionPending}
                        onClick={() => onFinancialSettle(item)}
                        className="rounded-md border border-emerald-200 bg-white px-2.5 py-2 text-xs font-medium text-emerald-700 transition-[transform,background-color] hover:bg-emerald-50 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
                        Baixar
                      </button>
                    ) : null}
                    {(tab === "receivables" || tab === "payables") && itemStatus === "OPEN" && onFinancialCancel ? (
                      <button
                        type="button"
                        disabled={isActionPending}
                        onClick={() => onFinancialCancel(item)}
                        className="rounded-md border border-red-200 bg-white px-2.5 py-2 text-xs font-medium text-red-700 transition-[transform,background-color] hover:bg-red-50 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      >
                        Cancelar conta
                      </button>
                    ) : null}
                    {tab === "sales-history" && itemStatus !== "CANCELLED" && onSaleCancel ? (
                      <button
                        type="button"
                        disabled={isActionPending}
                        onClick={() => onSaleCancel(item)}
                        className="rounded-md border border-red-200 bg-white px-2.5 py-2 text-xs font-medium text-red-700 transition-[transform,background-color] hover:bg-red-50 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      >
                        Cancelar
                      </button>
                    ) : null}
                    {tab === "purchases" && itemStatus !== "RECEIVED" && itemStatus !== "CANCELLED" && onPurchaseReceive ? (
                      <button
                        type="button"
                        disabled={isActionPending}
                        onClick={() => onPurchaseReceive(item)}
                        className="rounded-md border border-emerald-200 bg-white px-2.5 py-2 text-xs font-medium text-emerald-700 transition-[transform,background-color] hover:bg-emerald-50 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
                        Receber
                      </button>
                    ) : null}
                    {tab === "purchases" && itemStatus !== "RECEIVED" && itemStatus !== "CANCELLED" && onPurchaseCancel ? (
                      <button
                        type="button"
                        disabled={isActionPending}
                        onClick={() => onPurchaseCancel(item)}
                        className="rounded-md border border-red-200 bg-white px-2.5 py-2 text-xs font-medium text-red-700 transition-[transform,background-color] hover:bg-red-50 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                      >
                        Cancelar
                      </button>
                    ) : null}
                    {tab === "ifood-orders" && ifoodOrdersView === "orders" && !isIfoodEventItem && onIfoodOrderAction ? (
                      <>
                        <button type="button" disabled={isActionPending} onClick={() => onIfoodOrderAction(textValue(item.id, ""), "START_PREPARATION")} className="rounded-md border border-border bg-white px-2.5 py-2 text-xs font-medium text-slate-950 transition-[transform,background-color] hover:bg-slate-50 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                          Preparar
                        </button>
                        <button type="button" disabled={isActionPending} onClick={() => onIfoodOrderAction(textValue(item.id, ""), "READY_TO_PICKUP")} className="rounded-md border border-border bg-white px-2.5 py-2 text-xs font-medium text-slate-950 transition-[transform,background-color] hover:bg-slate-50 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                          Pronto
                        </button>
                        <button type="button" disabled={isActionPending} onClick={() => onIfoodOrderAction(textValue(item.id, ""), "DISPATCH")} className="rounded-md border border-border bg-white px-2.5 py-2 text-xs font-medium text-slate-950 transition-[transform,background-color] hover:bg-slate-50 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                          Despachar
                        </button>
                        {itemStatus !== "CANCELLED" && itemStatus !== "COMPLETED" && onIfoodOrderCancel ? (
                          <button type="button" disabled={isActionPending} onClick={() => onIfoodOrderCancel(item)} className="rounded-md border border-red-200 bg-white px-2.5 py-2 text-xs font-medium text-red-700 transition-[transform,background-color] hover:bg-red-50 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500">
                            Cancelar iFood
                          </button>
                        ) : null}
                      </>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onViewDetails(item)}
                      title="Ver detalhes"
                      aria-label="Ver detalhes"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-white text-slate-950 transition-[transform,border-color,background-color] duration-150 ease-[var(--ease-out)] hover:border-emerald-200 hover:bg-emerald-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      <Eye aria-hidden="true" size={16} />
                    </button>
                    {showItemAction ? (
                      <button
                        type="button"
                        onClick={() => onPrimaryAction(item)}
                        disabled={isActionPending}
                        className="inline-flex items-center justify-center rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-slate-950 transition-[transform,border-color,background-color] duration-150 ease-[var(--ease-out)] hover:border-emerald-200 hover:bg-emerald-50 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
                        {itemActionLabel}
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
            {!activeQuery.isLoading && items.length === 0 ? <p className="px-4 py-5 text-sm text-muted-foreground">{config.emptyMessage}</p> : null}
          </div>
          <PaginationBar
            page={page}
            limit={limit}
            onLimitChange={onLimitChange}
            canPrevious={page > 1}
            canNext={Boolean(activeQuery.data?.nextCursor)}
            isFetching={activeQuery.isFetching}
            onPrevious={onPrevious}
            onNext={onNext}
          />
        </>
      ) : (
        <div className="grid gap-3 p-4 md:grid-cols-3">
          {[
            ["1", "Modelar dados e permissões"],
            ["2", "Preparar as telas de consulta"],
            ["3", "Concluir as automações necessárias"]
          ].map(([step, label]) => (
            <article key={step} className="rounded-lg border border-dashed border-border bg-slate-50 p-4">
              <p className="text-sm font-semibold text-emerald-700">Etapa {step}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{label}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function SettingsToggleRow({
  title,
  description,
  checked,
  onChange,
  critical = false
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  critical?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-border px-4 py-4 first:border-t-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-medium text-slate-950">{title}</h3>
          {critical ? <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">Pede confirmação</span> : null}
        </div>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      <ModernSwitch checked={checked} onCheckedChange={onChange} label={title} />
    </div>
  );
}

function SettingsCard({
  icon: Icon,
  title,
  description,
  children
}: {
  icon: typeof Settings;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-lg border border-border bg-white">
      <div className="flex items-start gap-3 border-b border-border bg-slate-50 px-4 py-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-50 text-emerald-700">
          <Icon aria-hidden="true" size={18} />
        </div>
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-normal text-slate-950">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div>{children}</div>
    </section>
  );
}

function SettingsSection({
  companyName,
  branchName,
  settings,
  pricingConfig,
  branches,
  branchesLoading,
  newBranchName,
  newBranchWarehouseName,
  isCreatingBranch,
  onNewBranchNameChange,
  onNewBranchWarehouseNameChange,
  onCreateBranch,
  onToggle,
  onCriticalToggle,
  onPricingChange,
  onSavePricing,
  isSavingPricing,
  canManageFiscalPricing,
  ifoodConnection,
  onConfigureIfoodStock
}: {
  companyName: string;
  branchName: string;
  settings: SettingsState;
  pricingConfig: PricingConfig;
  branches: BranchListResponse["data"];
  branchesLoading: boolean;
  newBranchName: string;
  newBranchWarehouseName: string;
  isCreatingBranch: boolean;
  onNewBranchNameChange: (value: string) => void;
  onNewBranchWarehouseNameChange: (value: string) => void;
  onCreateBranch: () => void;
  onToggle: (key: keyof SettingsState, checked: boolean) => void;
  onCriticalToggle: (key: keyof SettingsState, checked: boolean, title: string, description: string) => void;
  onPricingChange: (key: keyof PricingConfig, value: number) => void;
  onSavePricing: () => void;
  isSavingPricing: boolean;
  canManageFiscalPricing: boolean;
  ifoodConnection: GenericListItem | null;
  onConfigureIfoodStock: (connection: GenericListItem) => void;
}) {
  const ifoodConnected = textValue(ifoodConnection?.status, "DISCONNECTED") === "CONNECTED";
  const stockMode = textValue(ifoodConnection?.ecommerceStockMode, "FULL");
  const stockRuleLabel =
    stockMode === "PERCENT"
      ? `${textValue(ifoodConnection?.ecommerceStockPercent, "0")}% do estoque`
      : stockMode === "FIXED"
        ? `Até ${textValue(ifoodConnection?.ecommerceStockFixedQuantity, "0")} unidades`
        : "Todo o estoque disponível";

  return (
    <div className="grid gap-4">
      <section className="electric-border electric-border-soft overflow-hidden rounded-lg border border-emerald-100 bg-white">
        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_280px] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Configuração ativa</p>
            <h2 className="mt-2 text-xl font-semibold tracking-normal text-slate-950">Empresa, loja e preferências do Pulso</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Ajuste as regras da empresa e da loja que você está usando agora.</p>
          </div>
          <div className="rounded-lg border border-border bg-slate-50 p-3">
            <p className="text-xs text-muted-foreground">Empresa atual</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-950">{companyName}</p>
            <p className="mt-3 text-xs text-muted-foreground">Loja atual</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-950">{branchName}</p>
          </div>
        </div>
      </section>

      <SettingsCard icon={Store} title="Empresas e lojas" description="Crie lojas dentro da empresa atual sem misturar estoque, vendas ou permissões.">
        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_1fr]">
          <form
            className="rounded-lg border border-border bg-slate-50 p-4"
            onSubmit={(event) => {
              event.preventDefault();
              onCreateBranch();
            }}
          >
            <h3 className="text-sm font-semibold text-slate-950">Nova loja</h3>
            <div className="mt-3 grid gap-3">
              <label className="grid gap-1 text-sm font-medium text-slate-950">
                Nome da loja
                <input
                  value={newBranchName}
                  onChange={(event) => onNewBranchNameChange(event.target.value)}
                  placeholder="Ex: Loja Centro"
                  className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none transition-shadow duration-150 ease-[var(--ease-out)] focus:ring-2 focus:ring-emerald-500"
                />
              </label>
              <label className="grid gap-1 text-sm font-medium text-slate-950">
                Depósito inicial
                <input
                  value={newBranchWarehouseName}
                  onChange={(event) => onNewBranchWarehouseNameChange(event.target.value)}
                  placeholder="Estoque Principal"
                  className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none transition-shadow duration-150 ease-[var(--ease-out)] focus:ring-2 focus:ring-emerald-500"
                />
              </label>
              <button
                type="submit"
                disabled={isCreatingBranch}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-[transform,background-color] duration-150 ease-[var(--ease-out)] hover:bg-emerald-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                {isCreatingBranch ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : <Store aria-hidden="true" size={16} />}
                Criar loja
              </button>
            </div>
          </form>

          <div className="rounded-lg border border-border bg-white">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-950">Lojas da empresa</h3>
              <p className="mt-1 text-xs text-muted-foreground">A lista é filtrada pela empresa ativa.</p>
            </div>
            <div className="max-h-72 overflow-y-auto custom-scrollbar divide-y divide-border">
              {branchesLoading ? <p className="px-4 py-4 text-sm text-muted-foreground">Carregando lojas...</p> : null}
              {branches.map((branch) => (
                <article key={branch.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-950">{branch.name}</p>
                    <p className="text-xs text-muted-foreground">Criada em {dateValue(branch.createdAt)}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${branch.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {branch.active ? "Ativa" : "Inativa"}
                  </span>
                </article>
              ))}
              {!branchesLoading && branches.length === 0 ? <p className="px-4 py-4 text-sm text-muted-foreground">Nenhuma loja encontrada.</p> : null}
            </div>
          </div>
        </div>
      </SettingsCard>

      <div className="grid gap-4 xl:grid-cols-2">
        <SettingsCard icon={ReceiptText} title="Precificação operacional" description="Defina premissas padrão para estimativa de margem no modal de produto.">
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium text-slate-950">
              Impostos estimados (%)
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={pricingConfig.taxPercent}
                onChange={(event) => onPricingChange("taxPercent", Number(event.target.value))}
                disabled={!canManageFiscalPricing}
                className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none transition-shadow duration-150 ease-[var(--ease-out)] focus:ring-2 focus:ring-emerald-500"
              />
            </label>
            <label className="grid gap-1 text-sm font-medium text-slate-950">
              Taxas estimadas (%)
              <input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={pricingConfig.feePercent}
                onChange={(event) => onPricingChange("feePercent", Number(event.target.value))}
                disabled={!canManageFiscalPricing}
                className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none transition-shadow duration-150 ease-[var(--ease-out)] focus:ring-2 focus:ring-emerald-500"
              />
            </label>
          </div>
          <div className="border-t border-border px-4 py-3">
            <button
              type="button"
              onClick={onSavePricing}
              disabled={!canManageFiscalPricing || isSavingPricing}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-[transform,background-color] duration-150 ease-[var(--ease-out)] hover:bg-emerald-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {isSavingPricing ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : <Check aria-hidden="true" size={16} />}
              Salvar taxas
            </button>
            {!canManageFiscalPricing ? <p className="mt-2 text-xs text-muted-foreground">Seu usuário não tem permissão fiscal para alterar essas taxas.</p> : null}
          </div>
          <div className="border-t border-border bg-slate-50 px-4 py-3 text-sm text-muted-foreground">
            Essas taxas são usadas no cálculo visual de margem dos produtos e valem para toda a empresa.
          </div>
        </SettingsCard>

        <SettingsCard icon={Settings} title="Tela e experiência" description="Preferências que deixam o uso diário mais rápido e menos poluído.">
          <SettingsToggleRow title="Modo escuro" description="Prepara a interface para fundo escuro quando a paleta final estiver ativada." checked={settings.darkMode} onChange={(checked) => onToggle("darkMode", checked)} />
          <SettingsToggleRow title="Mostrar economia em reais" description="Mantém visível o impacto financeiro estimado nas telas comerciais." checked={settings.showSavings} onChange={(checked) => onToggle("showSavings", checked)} />
        </SettingsCard>

        <SettingsCard icon={ShieldCheck} title="Segurança" description="Padrões para evitar mudanças acidentais e reduzir exposição de dados.">
          <SettingsToggleRow
            title="Confirmar ações críticas"
            description="Pede confirmação antes de sair, cancelar, desativar ou alterar comportamento sensível."
            checked={settings.confirmCriticalActions}
            critical
            onChange={(checked) => onCriticalToggle("confirmCriticalActions", checked, "Alterar confirmações críticas?", "Desativar confirmações aumenta o risco de ações acidentais em estoque, vendas e cadastros.")}
          />
          <SettingsToggleRow title="Avisar sessão em outro dispositivo" description="Mostra alerta quando o backend detectar troca ou revogação de sessão." checked={settings.sessionWarnings} onChange={(checked) => onToggle("sessionWarnings", checked)} />
          <SettingsToggleRow title="Ocultar dados sensíveis em listas" description="Reduz exposição de documentos, e-mails e valores quando a tela estiver compartilhada." checked={settings.hideSensitiveData} onChange={(checked) => onToggle("hideSensitiveData", checked)} />
        </SettingsCard>

      <SettingsCard icon={Boxes} title="Estoque e operação" description="Regras operacionais que protegem saldo, loja ativa e alertas do dia.">
          <SettingsToggleRow
            title="Bloquear estoque negativo"
            description="Impede vendas que deixariam o estoque abaixo de zero."
            checked={settings.blockNegativeStock}
            critical
            onChange={(checked) => onCriticalToggle("blockNegativeStock", checked, "Alterar regra de estoque negativo?", "Essa regra afeta vendas, importações e ajustes. Em produção ela deve ser salva por empresa, loja, depósito ou produto.")}
          />
          <SettingsToggleRow title="Alertar produto acabando" description="Mostra alertas claros quando saldo chegar perto do ponto de reposição." checked={settings.lowStockAlerts} onChange={(checked) => onToggle("lowStockAlerts", checked)} />
          <SettingsToggleRow title="Usar loja atual como filtro padrão" description="Listas de estoque, vendas e compras começam pela loja selecionada." checked={settings.currentBranchOnly} onChange={(checked) => onToggle("currentBranchOnly", checked)} />
      </SettingsCard>

      <SettingsCard icon={Plug} title="Venda online da loja atual" description="Defina como o estoque desta loja aparece para quem compra no iFood.">
        <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-slate-950">Estoque enviado ao iFood</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {ifoodConnection
                ? `Hoje: ${stockRuleLabel}. Essa regra vale só para ${branchName}.`
                : "Conecte o iFood desta loja para escolher quanto estoque fica disponível online."}
            </p>
          </div>
          <button
            type="button"
            disabled={!ifoodConnection}
            onClick={() => {
              if (ifoodConnection) {
                onConfigureIfoodStock(ifoodConnection);
              }
            }}
            className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-slate-950 transition-[transform,border-color,background-color] duration-150 ease-[var(--ease-out)] hover:border-emerald-200 hover:bg-emerald-50 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <Plug aria-hidden="true" size={16} />
            {ifoodConnection ? "Alterar regra" : "iFood não conectado"}
          </button>
        </div>
        <div className="border-t border-border px-4 py-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${ifoodConnected ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>
              {ifoodConnected ? "iFood conectado" : ifoodConnection ? "Conexão pendente" : "Sem iFood nesta loja"}
            </span>
            {ifoodConnection?.lastSyncAt ? <span className="text-xs text-muted-foreground">Última sincronização: {dateValue(ifoodConnection.lastSyncAt)}</span> : null}
          </div>
        </div>
      </SettingsCard>

      <SettingsCard icon={Plug} title="Fiscal e preferências" description="Opções que ajudam no dia a dia sem alterar produtos já vendidos.">
        <SettingsToggleRow title="Mostrar pendências fiscais" description="Produtos sem NCM, ICMS, PIS ou COFINS continuam visíveis sem travar o cadastro simples." checked={settings.showFiscalPending} onChange={(checked) => onToggle("showFiscalPending", checked)} />
        <SettingsToggleRow title="Mostrar atalhos de venda online" description="Mantém as áreas do iFood disponíveis no menu para conectar loja e sincronizar produtos." checked={settings.prepareChannelSync} onChange={(checked) => onToggle("prepareChannelSync", checked)} />
        </SettingsCard>
      </div>
    </div>
  );
}

function UserAccessDialog({
  user,
  roles,
  branches,
  isSaving,
  onClose,
  onSave
}: {
  user: UserItem | null;
  roles: RoleListResponse["data"];
  branches: BranchListResponse["data"];
  isSaving: boolean;
  onClose: () => void;
  onSave: (input: { roleId: string; branchIds: string[] }) => void;
}) {
  const [roleId, setRoleId] = useState("");
  const [branchIds, setBranchIds] = useState<string[]>([]);

  useEffect(() => {
    if (!user) {
      return;
    }

    setRoleId(user.companyAccesses[0]?.role.id ?? roles[0]?.id ?? "");
    setBranchIds(user.branchAccesses.filter((access) => access.active).map((access) => access.branch.id));
  }, [roles, user]);

  if (!user) {
    return null;
  }

  function toggleBranch(branchId: string, checked: boolean) {
    setBranchIds((current) => (checked ? [...new Set([...current, branchId])] : current.filter((id) => id !== branchId)));
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/60 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="user-access-title">
      <div className="auth-card-enter w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Permissões</p>
            <h2 id="user-access-title" className="mt-1 text-lg font-semibold text-slate-950">{user.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-slate-100 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500" aria-label="Fechar permissões">
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className="grid gap-5 p-5">
          <label className="grid gap-2 text-sm font-medium text-slate-950">
            Perfil de acesso
            <select value={roleId} onChange={(event) => setRoleId(event.target.value)} className="rounded-md border border-border bg-white px-3 py-2 font-normal outline-none focus:ring-2 focus:ring-emerald-500">
              <option value="" disabled>Selecione um perfil</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name} · {role.permissions.length} permissões
                </option>
              ))}
            </select>
          </label>

          <section className="rounded-lg border border-border">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-950">Lojas permitidas</h3>
              <p className="mt-1 text-xs text-muted-foreground">O usuário só verá vendas, estoque e relatórios das lojas marcadas.</p>
            </div>
            <div className="grid gap-1 p-2">
              {branches.map((branch) => (
                <label key={branch.id} className="flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-slate-50">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-950">{branch.name}</span>
                    <span className="text-xs text-muted-foreground">{branch.active ? "Ativa" : "Inativa"}</span>
                  </span>
                  <ModernSwitch checked={branchIds.includes(branch.id)} onCheckedChange={(checked) => toggleBranch(branch.id, checked)} label={`Permitir ${branch.name}`} disabled={!branch.active} />
                </label>
              ))}
            </div>
          </section>

          <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-md border border-border px-3 py-2 text-sm font-medium text-slate-950 transition-[transform,background-color] hover:bg-slate-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSaving || !roleId || branchIds.length === 0}
              onClick={() => onSave({ roleId, branchIds })}
              className="inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-[transform,background-color] hover:bg-emerald-700 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              {isSaving ? <Loader2 aria-hidden="true" size={16} className="animate-spin" /> : <ShieldCheck aria-hidden="true" size={16} />}
              Salvar permissões
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function UsersPermissionSection({
  query,
  roles,
  branches,
  searchDraft,
  onSearchDraftChange,
  onApplySearch,
  onClearSearch,
  limit,
  onLimitChange,
  page,
  onPrevious,
  onNext,
  onEditUser,
  onCreateUser
}: {
  query: { data: UserListResponse | undefined; isLoading: boolean; isFetching: boolean; error: Error | null };
  roles: RoleListResponse["data"];
  branches: BranchListResponse["data"];
  searchDraft: string;
  onSearchDraftChange: (value: string) => void;
  onApplySearch: () => void;
  onClearSearch: () => void;
  limit: number;
  onLimitChange: (limit: number) => void;
  page: number;
  onPrevious: () => void;
  onNext: () => void;
  onEditUser: (user: UserItem) => void;
  onCreateUser: () => void;
}) {
  const items = query.data?.data ?? [];

  return (
    <section className="rounded-lg border border-border bg-white">
      <div className="border-b border-border px-4 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Acesso</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">Usuários e permissões</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Escolha o perfil e as lojas que cada pessoa pode acessar.</p>
          </div>
          <div className="rounded-lg border border-border bg-slate-50 p-3 text-sm">
            <p className="font-semibold text-slate-950">{roles.length} perfis disponíveis</p>
            <p className="mt-1 text-muted-foreground">{branches.length} lojas da empresa atual</p>
            <button
              type="button"
              onClick={onCreateUser}
              className="mt-3 inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-[transform,background-color] hover:bg-emerald-700 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <Users aria-hidden="true" size={16} />
              Novo usuário
            </button>
          </div>
        </div>

        <form className="mt-4 flex min-w-0 flex-col gap-2 sm:flex-row" onSubmit={(event) => { event.preventDefault(); onApplySearch(); }}>
          <label className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-emerald-500">
            <Search aria-hidden="true" size={16} className="text-muted-foreground" />
            <span className="sr-only">Buscar usuário</span>
            <input value={searchDraft} onChange={(event) => onSearchDraftChange(event.target.value)} placeholder="Buscar usuário ou e-mail..." className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground" />
          </label>
          <button type="submit" className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white transition-[transform,background-color] hover:bg-slate-800 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500">Buscar</button>
          <button type="button" onClick={onClearSearch} className="rounded-md border border-border px-3 py-2 text-sm font-medium text-slate-950 transition-[transform,background-color] hover:bg-slate-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">Limpar</button>
        </form>
      </div>

      <div className="divide-y divide-border">
        {query.isLoading ? <p className="px-4 py-5 text-sm text-muted-foreground">Carregando usuários...</p> : null}
        {query.error ? <p className="px-4 py-5 text-sm text-red-500">{query.error.message}</p> : null}
        {items.map((user) => {
          const role = user.companyAccesses[0]?.role.name ?? "Sem perfil";
          const activeBranches = user.branchAccesses.filter((access) => access.active);
          return (
            <article key={user.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[1fr_170px_190px_150px] lg:items-center">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="truncate text-sm font-medium text-slate-950">{user.name}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${user.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{user.active ? "Ativo" : "Inativo"}</span>
                </div>
                <p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p>
              </div>
              <p className="text-sm font-medium text-slate-950">{role}</p>
              <p className="truncate text-sm text-muted-foreground">{activeBranches.length} loja{activeBranches.length === 1 ? "" : "s"}: {activeBranches.map((access) => access.branch.name).join(", ") || "nenhuma"}</p>
              <button type="button" onClick={() => onEditUser(user)} className="inline-flex items-center justify-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-slate-950 transition-[transform,border-color,background-color] hover:border-emerald-200 hover:bg-emerald-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                <ShieldCheck aria-hidden="true" size={16} />
                Permissões
              </button>
            </article>
          );
        })}
        {!query.isLoading && items.length === 0 ? <p className="px-4 py-5 text-sm text-muted-foreground">Nenhum usuário encontrado.</p> : null}
      </div>

      <PaginationBar page={page} limit={limit} onLimitChange={onLimitChange} canPrevious={page > 1} canNext={Boolean(query.data?.nextCursor)} isFetching={query.isFetching} onPrevious={onPrevious} onNext={onNext} />
    </section>
  );
}

const sidebarGroups: Array<{ title: string; items: SidebarItem[] }> = [
  {
    title: "Hoje",
    items: [
      { label: "Painel", icon: BarChart3, tab: "overview", status: "available" }
    ]
  },
  {
    title: "Operação",
    items: [
      { label: "Vendas", icon: ShoppingCart, tab: "sales", status: "available" },
      { label: "Histórico de vendas", icon: ReceiptText, tab: "sales-history", status: "available" },
      { label: "Pagamentos", icon: CreditCard, tab: "payments", status: "available" },
      { label: "Contas a receber", icon: ReceiptText, tab: "receivables", status: "available" },
      { label: "Contas a pagar", icon: FileText, tab: "payables", status: "available" },
      { label: "Compras", icon: ShoppingBag, tab: "purchases", status: "available" },
      { label: "Lojas da empresa", icon: Store, tab: "multistore", status: "available" }
    ]
  },
  {
    title: "Estoque",
    items: [
      { label: "Produtos", icon: PackageCheck, tab: "products", status: "available" },
      { label: "Saldo por depósito", icon: Boxes, tab: "inventory", status: "available" },
      { label: "Transferências", icon: ArrowRightLeft, tab: "transfers", status: "available" },
      { label: "Inventário", icon: ClipboardCheck, tab: "counts", status: "available" }
    ]
  },
  {
    title: "Cadastros",
    items: [
      { label: "Clientes", icon: Users, tab: "customers", status: "available" },
      { label: "Fornecedores", icon: Building2, tab: "suppliers", status: "available" },
      { label: "Categorias", icon: Layers3, tab: "categories", status: "available" }
    ]
  },
  {
    title: "Fiscal e dados",
    items: [
      { label: "Fiscal", icon: Landmark, tab: "fiscal", status: "available" },
      { label: "Migração", icon: Upload, tab: "imports", status: "available" },
      { label: "Relatórios", icon: ReceiptText, tab: "reports", status: "available" }
    ]
  },
  {
    title: "Integrações",
    items: [
      { label: "Config iFood", icon: Plug, tab: "integrations", status: "available" },
      { label: "Itens do iFood", icon: ClipboardCheck, tab: "ifood-catalog", status: "available", requiresIfood: true },
      { label: "Pedidos iFood", icon: ShoppingBag, tab: "ifood-orders", status: "available", requiresIfood: true }
    ]
  },
  {
    title: "Administração",
    items: [
      { label: "Usuários e permissões", icon: ShieldCheck, tab: "users", status: "available" },
      { label: "Configurações", icon: Settings, tab: "settings", status: "available" }
    ]
  }
];

const AppSidebar = forwardRef<HTMLElement, {
  activeTab: DashboardTab;
  onNavigateTo: (href: string) => void;
  onUnavailableItem: (item: SidebarItem) => void;
  companyName: string;
  branchName: string;
  userName: string;
  branches: BranchListResponse["data"];
  activeBranchId: string | undefined;
  isSwitchingBranch: boolean;
  onBranchChange: (branchId: string) => void;
  ifoodConnected: boolean;
  ifoodOrderNotificationCount: number;
  ifoodOrderNotificationText: string | null;
  onIfoodOrderNotificationsRead: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onLogout: () => void | Promise<void>;
}>(function AppSidebar({
  activeTab,
  onNavigateTo,
  onUnavailableItem,
  companyName,
  branchName,
  userName,
  branches,
  activeBranchId,
  isSwitchingBranch,
  onBranchChange,
  ifoodConnected,
  ifoodOrderNotificationCount,
  ifoodOrderNotificationText,
  onIfoodOrderNotificationsRead,
  collapsed,
  onToggleCollapsed,
  onLogout
}, ref) {
  const [contextOpen, setContextOpen] = useState(false);
  const notificationHref = ifoodOrderNotificationCount > 0 ? tabRoutes["ifood-orders"] : tabRoutes.alerts;
  const notificationActive = activeTab === "alerts" || (ifoodOrderNotificationCount > 0 && activeTab === "ifood-orders");
  const openNotifications = () => {
    if (ifoodOrderNotificationCount > 0) {
      onIfoodOrderNotificationsRead();
    }
    onNavigateTo(notificationHref);
  };

  return (
    <aside
      ref={ref}
      className={`app-sidebar-shell relative z-40 m-3 hidden h-[calc(100vh-1.5rem)] shrink-0 overflow-visible rounded-[22px] border border-emerald-100 shadow-[18px_18px_60px_rgba(15,23,42,0.12)] transition-[width] duration-300 ease-[var(--ease-out)] lg:sticky lg:top-3 lg:flex lg:flex-col ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? "Expandir menu lateral" : "Encolher menu lateral"}
        className="absolute -right-4 top-5 z-50 hidden h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-700 shadow-md shadow-slate-950/12 transition-[transform,background-color,color,border-color] duration-150 ease-[var(--ease-out)] hover:border-emerald-300 hover:bg-emerald-50 active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 lg:inline-flex"
      >
        {collapsed ? <ChevronRight aria-hidden="true" size={16} /> : <ChevronLeft aria-hidden="true" size={16} />}
      </button>

      <div className={`border-b border-border p-4 ${collapsed ? "px-3" : ""}`}>
        <div className={`flex items-center ${collapsed ? "justify-center gap-2" : "justify-between gap-2"}`}>
          {collapsed ? <BrandMark compact /> : <BrandMark />}
        </div>
        <button
          type="button"
          aria-label={`Contexto atual: ${companyName}, ${branchName}`}
          onClick={() => setContextOpen((value) => !value)}
          className={`mt-4 flex w-full items-center rounded-lg border border-emerald-100 bg-slate-50 text-left text-slate-950 transition-[transform,border-color,background-color] duration-150 ease-[var(--ease-out)] hover:border-emerald-200 hover:bg-emerald-50/60 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
            collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-3 py-2"
          }`}
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-600 text-white">
            <Store aria-hidden="true" size={17} />
          </div>
          {!collapsed ? (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-950">{companyName}</p>
                <p className="truncate text-xs text-muted-foreground">{branchName}</p>
              </div>
              <ChevronDown aria-hidden="true" size={16} className="text-muted-foreground" />
            </>
          ) : null}
        </button>
        {contextOpen && !collapsed ? (
          <div className="mt-2 overflow-hidden rounded-lg border border-border bg-white shadow-xl">
            <div className="border-b border-border px-3 py-2">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700">Trocar loja</p>
            </div>
            <div className="max-h-56 overflow-y-auto app-sidebar-scroll p-1">
              {branches.map((branch) => (
                <button
                  key={branch.id}
                  type="button"
                  disabled={isSwitchingBranch || branch.id === activeBranchId}
                  onClick={() => {
                    setContextOpen(false);
                    onBranchChange(branch.id);
                  }}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                    branch.id === activeBranchId ? "bg-emerald-50 font-medium text-emerald-700" : "text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                  } disabled:cursor-not-allowed disabled:opacity-70`}
                >
                  <span className="truncate">{branch.name}</span>
                  {branch.id === activeBranchId ? <Check aria-hidden="true" size={14} /> : null}
                </button>
              ))}
              {branches.length === 0 ? <p className="px-3 py-2 text-sm text-muted-foreground">Nenhuma loja disponível.</p> : null}
            </div>
          </div>
        ) : null}
      </div>

      <nav aria-label="Módulos do ERP" className="app-sidebar-nav app-sidebar-scroll min-h-0 flex-1 overflow-y-auto py-4">
        <div className={`app-sidebar-menu-groups relative grid min-h-full ${collapsed ? "gap-3" : "gap-5"}`}>
          {sidebarGroups.map((group) => (
            <section key={group.title}>
              {!collapsed ? <h2 className="px-5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{group.title}</h2> : null}
              <div className="mt-2 grid gap-1.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = item.tab === activeTab;
                  const href = item.href ?? (item.tab ? tabRoutes[item.tab] : undefined);
                  const blockedByIfood = Boolean(item.requiresIfood && !ifoodConnected);
                  const available = item.status === "available" && !blockedByIfood;
                  const foundation = item.status === "foundation";
                  const statusLabel = blockedByIfood ? "Configure o iFood primeiro" : available ? "Disponível" : foundation ? "Base pronta, tela em breve" : "Em breve";
                  const badgeClass = foundation
                    ? "bg-amber-50 text-amber-700"
                    : item.status === "soon"
                      ? "bg-slate-100 text-slate-500"
                      : "bg-emerald-50 text-emerald-700";
                  const itemClassName = `app-sidebar-menu-item relative z-10 flex items-center text-left text-sm transition-[transform,background-color,color,box-shadow] duration-300 ease-[var(--ease-out)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300 ${
                        collapsed ? (active ? "app-sidebar-menu-active ml-3 w-[calc(100%-0.75rem)] justify-center rounded-l-[18px] pr-3" : "mx-3 w-[calc(100%-1.5rem)] justify-center rounded-[16px] px-2") : active ? "app-sidebar-menu-active w-full gap-3 rounded-l-[18px] pl-5 pr-5" : "mx-3 w-[calc(100%-1.5rem)] gap-3 rounded-[16px] px-4"
                      } ${
                        active
                          ? "font-semibold shadow-[0_12px_28px_rgba(15,23,42,0.12)]"
                          : available
                            ? "text-slate-700 hover:bg-emerald-50 hover:text-emerald-700"
                            : foundation || blockedByIfood
                              ? "cursor-help text-amber-800 hover:bg-amber-50"
                              : "cursor-help text-slate-400 hover:bg-slate-50"
                      }`;
                  const itemContent = (
                    <>
                      <Icon aria-hidden="true" size={17} />
                      {!collapsed ? <span className="min-w-0 flex-1 truncate">{item.label}</span> : null}
                      {item.badge && !collapsed ? (
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${active ? "bg-white/20 text-white" : badgeClass}`}>
                          {item.badge}
                        </span>
                      ) : null}
                      {item.badge && collapsed ? (
                        <span className={`absolute right-1 top-1 h-2 w-2 rounded-full ring-2 ring-white ${foundation ? "bg-amber-500" : "bg-slate-300"}`} />
                      ) : null}
                    </>
                  );

                  if (href && available) {
                    return (
                      <button
                        key={item.label}
                        type="button"
                        title={collapsed ? `${item.label} - ${statusLabel}` : statusLabel}
                        aria-label={collapsed ? `${item.label} - ${statusLabel}` : undefined}
                        onClick={() => onNavigateTo(href)}
                        className={itemClassName}
                      >
                        {itemContent}
                      </button>
                    );
                  }

                  return (
                    <button
                      key={item.label}
                      type="button"
                      title={collapsed ? `${item.label} - ${statusLabel}` : statusLabel}
                      aria-label={collapsed ? `${item.label} - ${statusLabel}` : undefined}
                      onClick={() => onUnavailableItem(item)}
                      className={itemClassName}
                    >
                      {itemContent}
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </nav>

      <div className="border-t border-border p-3">
        <div className={`rounded-[16px] bg-slate-50 p-3 ${collapsed ? "grid justify-items-center gap-2" : "flex items-center gap-3"}`}>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
            {userName.slice(0, 1).toUpperCase()}
          </div>
          {collapsed ? (
            <>
              <button
                type="button"
                onClick={openNotifications}
                aria-label={ifoodOrderNotificationCount > 0 ? "Abrir pedidos iFood recebidos" : "Abrir alertas"}
                title={ifoodOrderNotificationCount > 0 ? "Pedido iFood recebido" : "Alertas"}
                className={`relative rounded-md p-2 transition-[transform,background-color,color] duration-150 ease-[var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                  notificationActive ? "bg-emerald-600 text-white" : "text-muted-foreground hover:bg-white hover:text-slate-950"
                }`}
              >
                <Bell aria-hidden="true" size={16} />
                {ifoodOrderNotificationCount > 0 ? (
                  <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-emerald-600 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-slate-50">
                    {ifoodOrderNotificationCount > 9 ? "9+" : ifoodOrderNotificationCount}
                  </span>
                ) : null}
                {ifoodOrderNotificationText ? (
                  <span className="pointer-events-none absolute left-[calc(100%+8px)] top-1/2 z-50 w-max -translate-y-1/2 rounded-md border border-emerald-100 bg-white px-2.5 py-1.5 text-[11px] font-medium leading-none text-emerald-700 opacity-100 shadow-lg shadow-slate-950/10">
                    {ifoodOrderNotificationText}
                  </span>
                ) : null}
              </button>
              <button
                type="button"
                onClick={onLogout}
                aria-label="Sair"
                title="Sair"
                className="rounded-md p-2 text-muted-foreground transition-[transform,background-color,color] duration-150 ease-[var(--ease-out)] hover:bg-white hover:text-slate-950 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <LogOut aria-hidden="true" size={16} />
              </button>
            </>
          ) : (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-950">{userName}</p>
                <p className="truncate text-xs text-muted-foreground">Conta da empresa</p>
              </div>
              <div className="flex items-center gap-1">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={openNotifications}
                    aria-label={ifoodOrderNotificationCount > 0 ? "Abrir pedidos iFood recebidos" : "Abrir alertas"}
                    title={ifoodOrderNotificationCount > 0 ? "Pedido iFood recebido" : "Alertas"}
                    className={`relative rounded-md p-2 transition-[transform,background-color,color] duration-150 ease-[var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                      notificationActive ? "bg-emerald-600 text-white" : "text-muted-foreground hover:bg-white hover:text-slate-950"
                    }`}
                  >
                    <Bell aria-hidden="true" size={16} />
                    {ifoodOrderNotificationCount > 0 ? (
                      <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-emerald-600 px-1 text-[10px] font-semibold leading-none text-white ring-2 ring-slate-50">
                        {ifoodOrderNotificationCount > 9 ? "9+" : ifoodOrderNotificationCount}
                      </span>
                    ) : null}
                  </button>
                  {ifoodOrderNotificationText ? (
                    <button
                      type="button"
                      onClick={openNotifications}
                      className="max-w-[136px] text-left text-[11px] font-medium leading-tight text-emerald-700 transition-colors hover:text-emerald-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      {ifoodOrderNotificationText}
                    </button>
                  ) : null}
                </div>
                {ifoodOrderNotificationCount > 0 ? (
                  <button
                    type="button"
                    onClick={onIfoodOrderNotificationsRead}
                    className="rounded-md px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-white hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    Lido
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={onLogout}
                  aria-label="Sair"
                  title="Sair"
                  className="rounded-md p-2 text-muted-foreground transition-[transform,background-color,color] duration-150 ease-[var(--ease-out)] hover:bg-white hover:text-slate-950 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <LogOut aria-hidden="true" size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </aside>
  );
});

function Dashboard({ accessToken, onSessionChange, onLogout }: { accessToken: string; onSessionChange: (session: LoginResponse) => void; onLogout: () => void | Promise<void> }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const sidebarRef = useRef<HTMLElement>(null);
  const contentFocusRef = useRef<HTMLElement>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>(() => tabFromPathname(pathname));
  const [contentTransitioning, setContentTransitioning] = useState(false);
  const tab = activeTab;
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [alert, setAlert] = useState<AppAlert | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [detailsDialog, setDetailsDialog] = useState<DetailsDialogState | null>(null);
  const [ifoodOauthDialog, setIfoodOauthDialog] = useState<IfoodOauthDialogState | null>(null);
  const [ifoodStockSettingsDialog, setIfoodStockSettingsDialog] = useState<IfoodStockSettingsDialogState | null>(null);
  const [ifoodCancellationDialog, setIfoodCancellationDialog] = useState<IfoodCancellationDialogState | null>(null);
  const [ifoodCatalogLinkDialog, setIfoodCatalogLinkDialog] = useState<IfoodCatalogLinkDialogState | null>(null);
  const [purchaseDialog, setPurchaseDialog] = useState<PurchaseCreateDialogState | null>(null);
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>(defaultPricingConfig);
  const [settingsState, setSettingsState] = useState<SettingsState>({
    darkMode: false,
    compactMenu: true,
    showSavings: true,
    confirmCriticalActions: true,
    sessionWarnings: true,
    hideSensitiveData: false,
    blockNegativeStock: true,
    lowStockAlerts: true,
    currentBranchOnly: true,
    showFiscalPending: true,
    prepareChannelSync: true
  });
  const [newBranchName, setNewBranchName] = useState("");
  const [newBranchWarehouseName, setNewBranchWarehouseName] = useState("Estoque Principal");
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [productLimit, setProductLimit] = useState(10);
  const [productCursorStack, setProductCursorStack] = useState<Array<string | null>>([null]);
  const [productSearchDraft, setProductSearchDraft] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [pdvResetKey, setPdvResetKey] = useState(0);
  const [customerLimit, setCustomerLimit] = useState(10);
  const [customerCursorStack, setCustomerCursorStack] = useState<Array<string | null>>([null]);
  const [customerSearchDraft, setCustomerSearchDraft] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [supplierLimit, setSupplierLimit] = useState(10);
  const [supplierCursorStack, setSupplierCursorStack] = useState<Array<string | null>>([null]);
  const [supplierSearchDraft, setSupplierSearchDraft] = useState("");
  const [supplierSearch, setSupplierSearch] = useState("");
  const [inventoryLimit, setInventoryLimit] = useState(10);
  const [inventoryCursorStack, setInventoryCursorStack] = useState<Array<string | null>>([null]);
  const [inventorySearchDraft, setInventorySearchDraft] = useState("");
  const [inventorySearch, setInventorySearch] = useState("");
  const [categoryLimit, setCategoryLimit] = useState(10);
  const [categoryCursorStack, setCategoryCursorStack] = useState<Array<string | null>>([null]);
  const [categorySearchDraft, setCategorySearchDraft] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [operationalLimit, setOperationalLimit] = useState(10);
  const [operationalCursorStack, setOperationalCursorStack] = useState<Array<string | null>>([null]);
  const [operationalSearchDraft, setOperationalSearchDraft] = useState("");
  const [operationalSearch, setOperationalSearch] = useState("");
  const [operationalStatusFilter, setOperationalStatusFilter] = useState("ALL");
  const [ifoodOrdersView, setIfoodOrdersView] = useState<IfoodOrdersView>(tab === "ifood-pending" ? "pending" : "orders");
  const [ifoodOrderStatusFilter, setIfoodOrderStatusFilter] = useState<IfoodOrderStatusFilter>("ALL");
  const [readIfoodOrderNotificationIds, setReadIfoodOrderNotificationIds] = useState<string[]>([]);
  const productCursor = productCursorStack.at(-1) ?? null;
  const customerCursor = customerCursorStack.at(-1) ?? null;
  const supplierCursor = supplierCursorStack.at(-1) ?? null;
  const inventoryCursor = inventoryCursorStack.at(-1) ?? null;
  const categoryCursor = categoryCursorStack.at(-1) ?? null;
  const operationalCursor = operationalCursorStack.at(-1) ?? null;
  const operationalConfig = isOperationalTab(tab) && tab !== "settings" && tab !== "users" ? operationalModules[tab] : null;
  const meQuery = useQuery<MeResponse>({
    queryKey: ["me", accessToken],
    queryFn: () => getMe(accessToken)
  });
  const productsQuery = useQuery<ProductListResponse>({
    queryKey: ["products", accessToken, productLimit, productCursor, productSearch],
    queryFn: () => getProducts(accessToken, { limit: productLimit, cursor: productCursor, search: productSearch }),
    enabled: tab === "products" || tab === "sales"
  });
  const activeProducts = useMemo(() => (productsQuery.data?.data ?? []).filter((product) => product.active), [productsQuery.data?.data]);
  const balancesQuery = useQuery<StockBalanceListResponse>({
    queryKey: ["stock-balances", accessToken, inventoryLimit, inventoryCursor, inventorySearch],
    queryFn: () => getStockBalances(accessToken, { limit: inventoryLimit, cursor: inventoryCursor, search: inventorySearch }),
    enabled: tab === "inventory"
  });
  const customersQuery = useQuery<PersonListResponse>({
    queryKey: ["customers", accessToken, customerLimit, customerCursor, customerSearch],
    queryFn: () => getCustomers(accessToken, { limit: customerLimit, cursor: customerCursor, search: customerSearch }),
    enabled: tab === "customers"
  });
  const suppliersQuery = useQuery<PersonListResponse>({
    queryKey: ["suppliers", accessToken, supplierLimit, supplierCursor, supplierSearch],
    queryFn: () => getSuppliers(accessToken, { limit: supplierLimit, cursor: supplierCursor, search: supplierSearch }),
    enabled: tab === "suppliers"
  });
  const purchaseSuppliersQuery = useQuery<PersonListResponse>({
    queryKey: ["purchase-suppliers", accessToken],
    queryFn: () => getSuppliers(accessToken, { limit: 100 }),
    enabled: Boolean(purchaseDialog)
  });
  const purchaseProductsQuery = useQuery<ProductListResponse>({
    queryKey: ["purchase-products", accessToken],
    queryFn: () => getProducts(accessToken, { limit: 100 }),
    enabled: Boolean(purchaseDialog)
  });
  const categoriesQuery = useQuery<CategoryListResponse>({
    queryKey: ["categories", accessToken, categoryLimit, categoryCursor, categorySearch],
    queryFn: () => getCategories(accessToken, { limit: categoryLimit, cursor: categoryCursor, search: categorySearch }),
    enabled: tab === "categories"
  });
  const productCategoriesQuery = useQuery<CategoryListResponse>({
    queryKey: ["product-categories", accessToken],
    queryFn: () => getCategories(accessToken, { limit: 100 }),
    enabled: tab === "products" || productDialogOpen || Boolean(ifoodCatalogLinkDialog)
  });
  const ifoodLinkProductsQuery = useQuery<ProductListResponse>({
    queryKey: ["ifood-link-products", accessToken],
    queryFn: () => getProducts(accessToken, { limit: 100 }),
    enabled: Boolean(ifoodCatalogLinkDialog)
  });
  const activeIfoodLinkProducts = useMemo(() => (ifoodLinkProductsQuery.data?.data ?? []).filter((product) => product.active), [ifoodLinkProductsQuery.data?.data]);
  const preferencesQuery = useQuery({
    queryKey: ["settings-preferences", accessToken],
    queryFn: () => getUserPreferences(accessToken)
  });
  const branchesQuery = useQuery<BranchListResponse>({
    queryKey: ["branches", accessToken],
    queryFn: () => getBranches(accessToken, { limit: 100 })
  });
  const warehousesQuery = useQuery<GenericListResponse, Error>({
    queryKey: ["warehouses", accessToken],
    queryFn: () => getPaginatedResource(accessToken, "/api/v1/warehouses", { limit: 100 }),
    enabled: tab === "products" || tab === "sales" || tab === "settings" || Boolean(purchaseDialog)
  });
  const rolesQuery = useQuery<RoleListResponse>({
    queryKey: ["roles", accessToken],
    queryFn: () => getRoles(accessToken, { limit: 100 }),
    enabled: tab === "users"
  });
  const usersQuery = useQuery<UserListResponse, Error>({
    queryKey: ["users", accessToken, operationalLimit, operationalCursor, operationalSearch],
    queryFn: () => getUsers(accessToken, { limit: operationalLimit, cursor: operationalCursor, search: operationalSearch }),
    enabled: tab === "users"
  });
  const sidebarIfoodConnectionQuery = useQuery<GenericListResponse, Error>({
    queryKey: ["sidebar-ifood-connection", accessToken],
    queryFn: () => getPaginatedResource(accessToken, "/api/v1/integrations/connections", { limit: 10 }),
    staleTime: 30000,
    refetchInterval: 60000
  });
  const sidebarIfoodConnected = (sidebarIfoodConnectionQuery.data?.data ?? []).some((item) => textValue(asRecord(item)?.channel, "") === "IFOOD" && textValue(asRecord(item)?.status, "") === "CONNECTED");
  const sidebarIfoodOrdersQuery = useQuery<GenericListResponse, Error>({
    queryKey: ["sidebar-ifood-orders", accessToken],
    queryFn: () => getIfoodOrders(accessToken, { limit: 10 }),
    enabled: sidebarIfoodConnected,
    refetchInterval: 15000,
    refetchIntervalInBackground: false
  });
  const sidebarIfoodOrderNotifications = (sidebarIfoodOrdersQuery.data?.data ?? []).filter((item) => {
    const status = normalizeIfoodOrderStatus(item);
    return textValue(item.source, "") === "IFOOD" && status !== "COMPLETED" && status !== "CANCELLED";
  });
  const ifoodOrderNotificationStorageKey = `pulso:ifood-order-notifications-read:${meQuery.data?.tenant.branchId ?? "branch"}`;
  const readIfoodOrderNotificationSet = new Set(readIfoodOrderNotificationIds);
  const unreadIfoodOrderNotifications = sidebarIfoodOrderNotifications.filter((item) => {
    const notificationId = ifoodOrderNotificationId(item);
    return notificationId ? !readIfoodOrderNotificationSet.has(notificationId) : false;
  });
  const sidebarIfoodOrderNotificationCount = unreadIfoodOrderNotifications.length;
  const sidebarIfoodOrderNotificationText = sidebarIfoodOrderNotificationCount > 0 ? "Pedido iFood recebido" : null;
  const dashboardOnlineOrders = (sidebarIfoodOrdersQuery.data?.data ?? []).filter((item) => textValue(item.kind, "") !== "IFOOD_EVENT" && textValue(item.source, "") === "IFOOD");
  const dashboardOnlineSalesTotal = dashboardOnlineOrders.reduce((sum, item) => sum + (Number(textValue(item.total, "0")) || 0), 0);
  const dashboardLatestOnlineOrder = dashboardOnlineOrders[0];
  const dashboardLatestOnlineOrderNumber = textValue(dashboardLatestOnlineOrder?.ifoodDisplayId, "");
  const dashboardLatestOnlineOrderSummary = dashboardLatestOnlineOrder
    ? `${dashboardLatestOnlineOrderNumber ? `#${dashboardLatestOnlineOrderNumber}` : "Pedido iFood"} · ${ifoodOrderProductSummary(dashboardLatestOnlineOrder)}`
    : null;

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(ifoodOrderNotificationStorageKey);
      const parsed = stored ? JSON.parse(stored) : [];
      setReadIfoodOrderNotificationIds(Array.isArray(parsed) ? parsed.filter((value): value is string => typeof value === "string") : []);
    } catch {
      setReadIfoodOrderNotificationIds([]);
    }
  }, [ifoodOrderNotificationStorageKey]);

  const markIfoodOrderNotificationsRead = useCallback(() => {
    const currentIds = sidebarIfoodOrderNotifications.map(ifoodOrderNotificationId).filter((value): value is string => Boolean(value));
    if (currentIds.length === 0) {
      return;
    }

    setReadIfoodOrderNotificationIds((current) => {
      const next = [...new Set([...current, ...currentIds])].slice(-100);
      try {
        window.localStorage.setItem(ifoodOrderNotificationStorageKey, JSON.stringify(next));
      } catch {
        // Ignore storage failures; the notification still closes for this render.
      }
      return next;
    });
  }, [ifoodOrderNotificationStorageKey, sidebarIfoodOrderNotifications]);

  useEffect(() => {
    setOperationalStatusFilter("ALL");
  }, [tab]);

  const operationalQuery = useQuery<GenericListResponse, Error>({
    queryKey: ["operational-module", accessToken, tab, operationalLimit, operationalCursor, operationalSearch],
    queryFn: () =>
      tab === "ifood-orders"
        ? getIfoodOrders(accessToken, {
            limit: operationalLimit,
            cursor: operationalCursor,
            search: operationalSearch
          })
        : tab === "ifood-catalog"
          ? getIfoodCatalogItems(accessToken, {
              limit: operationalLimit,
              cursor: operationalCursor,
              search: operationalSearch,
              status: "unlinked"
            })
        : tab === "ifood-pending"
          ? getIfoodPendingItems(accessToken, {
              limit: operationalLimit,
              cursor: operationalCursor,
              search: operationalSearch
            })
        : getPaginatedResource(accessToken, operationalConfig!.endpoint!, {
            limit: operationalLimit,
            cursor: operationalCursor,
            search: operationalSearch
          }),
    enabled: Boolean(operationalConfig?.endpoint),
    refetchInterval: tab === "ifood-orders" || tab === "ifood-pending" ? 15000 : false,
    refetchIntervalInBackground: false
  });
  const ifoodPendingInsideOrdersQuery = useQuery<GenericListResponse, Error>({
    queryKey: ["ifood-orders-pending-items", accessToken, operationalLimit, operationalCursor, operationalSearch],
    queryFn: () =>
      getIfoodPendingItems(accessToken, {
        limit: operationalLimit,
        cursor: operationalCursor,
        search: operationalSearch
      }),
    enabled: tab === "ifood-orders",
    refetchInterval: tab === "ifood-orders" ? 15000 : false,
    refetchIntervalInBackground: false
  });
  const settingsIfoodConnectionQuery = useQuery<GenericListResponse, Error>({
    queryKey: ["settings-ifood-connection", accessToken],
    queryFn: () => getPaginatedResource(accessToken, "/api/v1/integrations/connections", { limit: 1 }),
    enabled: tab === "settings"
  });
  const dashboardQuery = useQuery<DashboardResponse>({
    queryKey: ["dashboard", accessToken],
    queryFn: () => getDashboard(accessToken),
    enabled: tab === "overview"
  });
  const canReadPricingSettings = (meQuery.data?.tenant.permissions ?? []).includes("fiscal.read") || (meQuery.data?.tenant.permissions ?? []).includes("fiscal.manage");
  const canManagePricingSettings = (meQuery.data?.tenant.permissions ?? []).includes("fiscal.manage");
  const canManageFiscalProfile = canManagePricingSettings;
  const pricingSettingsQuery = useQuery<PricingSettingsResponse, Error>({
    queryKey: ["fiscal-pricing-settings", accessToken],
    queryFn: () => getPricingSettings(accessToken),
    enabled: canReadPricingSettings
  });
  const preferencesMutation = useMutation({
    mutationFn: (input: Partial<SettingsState>) => updateUserPreferences(accessToken, input),
    onSuccess: async (preferences) => {
      setSettingsState((current) => ({ ...current, ...preferences }));
      await queryClient.invalidateQueries({ queryKey: ["settings-preferences", accessToken] });
      setAlert({
        tone: "success",
        title: "Configuração salva.",
        description: "Preferência salva automaticamente para este usuário, empresa e loja."
      });
    },
    onError: (error) => {
      setAlert({
        tone: "warning",
        title: "Não foi possível salvar.",
        description: error instanceof Error ? error.message : "A configuração foi mantida apenas na tela atual."
      });
    }
  });
  const branchCreateMutation = useMutation({
    mutationFn: (input: { name: string; defaultWarehouseName?: string }) => createBranch(accessToken, input),
    onSuccess: async (branch) => {
      setNewBranchName("");
      setNewBranchWarehouseName("Estoque Principal");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["branches", accessToken] }),
        queryClient.invalidateQueries({ queryKey: ["me", accessToken] })
      ]);
      setAlert({
        tone: "success",
        title: "Loja criada.",
        description: `${branch.name} já possui depósito padrão e acesso para seu usuário.`
      });
    },
    onError: (error) => {
      setAlert({
        tone: "warning",
        title: "Não foi possível criar a loja.",
        description: error instanceof Error ? error.message : "Confira o nome e tente novamente."
      });
    }
  });
  const switchBranchMutation = useMutation({
    mutationFn: (branchId: string) => {
      const tenant = meQuery.data?.tenant;
      if (!tenant) {
        throw new Error("Contexto atual ainda não carregou.");
      }

      return switchContext(accessToken, {
        organizationId: tenant.organizationId,
        companyId: tenant.companyId,
        branchId
      });
    },
    onSuccess: async (session) => {
      onSessionChange(session);
      await queryClient.invalidateQueries();
      setAlert({
        tone: "success",
        title: "Loja alterada.",
        description: "Os dados exibidos agora correspondem à loja selecionada."
      });
    },
    onError: (error) => {
      setAlert({
        tone: "warning",
        title: "Não foi possível trocar de loja.",
        description: error instanceof Error ? error.message : "Confira seu acesso à loja selecionada."
      });
    }
  });
  const userAccessMutation = useMutation({
    mutationFn: ({ userId, roleId, branchIds }: { userId: string; roleId: string; branchIds: string[] }) => updateUserAccess(accessToken, userId, { roleId, branchIds }),
    onSuccess: async () => {
      setSelectedUser(null);
      await queryClient.invalidateQueries({ queryKey: ["users", accessToken] });
      setAlert({
        tone: "success",
        title: "Permissões salvas.",
        description: "O perfil e as lojas permitidas foram atualizados."
      });
    },
    onError: (error) => {
      setAlert({
        tone: "warning",
        title: "Não foi possível salvar permissões.",
        description: error instanceof Error ? error.message : "Confira perfil, lojas e permissões do seu usuário."
      });
    }
  });
  const productStatusMutation = useMutation({
    mutationFn: ({ productId, active }: { productId: string; active: boolean }) => updateProductActive(accessToken, productId, active),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["products", accessToken] });
      setAlert({
        tone: "success",
        title: variables.active ? "Produto ativado." : "Produto desativado.",
        description: variables.active ? "O produto voltou a aparecer nas operacoes." : "O produto deixa de aparecer nas operacoes ativas, mas o historico permanece preservado."
      });
    },
    onError: (error) => {
      setAlert({
        tone: "warning",
        title: "Nao foi possivel alterar o produto.",
        description: error instanceof Error ? error.message : "Tente novamente em instantes."
      });
    }
  });
  const productUpdateMutation = useMutation({
    mutationFn: ({ productId, input }: { productId: string; input: ProductEditInput }) => updateProduct(accessToken, productId, input),
    onSuccess: async () => {
      setEditingProduct(null);
      setDetailsDialog(null);
      await queryClient.invalidateQueries({ queryKey: ["products", accessToken] });
      setAlert({
        tone: "success",
        title: "Produto atualizado.",
        description: "Dados comerciais e preço são enviados ao iFood automaticamente. Se alterou a foto, sincronize o produto novamente."
      });
    },
    onError: (error) => {
      setAlert({
        tone: "warning",
        title: "Não foi possível atualizar o produto.",
        description: error instanceof Error ? error.message : "Revise os campos e tente novamente."
      });
    }
  });
  const categoryCreateMutation = useMutation({
    mutationFn: ({ name }: { name: string }) => createCategory(accessToken, { name }),
    onSuccess: async () => {
      setNewCategoryName("");
      setCategoryCursorStack([null]);
      await queryClient.invalidateQueries({ queryKey: ["categories", accessToken] });
      await queryClient.invalidateQueries({ queryKey: ["product-categories", accessToken] });
      setAlert({
        tone: "success",
        title: "Categoria criada.",
        description: "Ela ja pode ser usada para organizar produtos da empresa atual."
      });
    },
    onError: (error) => {
      setAlert({
        tone: "warning",
        title: "Nao foi possivel criar a categoria.",
        description: error instanceof Error ? error.message : "Confira o nome e tente novamente."
      });
    }
  });
  const categoryStatusMutation = useMutation({
    mutationFn: ({ categoryId, active }: { categoryId: string; active: boolean }) => updateCategoryActive(accessToken, categoryId, active),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["categories", accessToken] });
      setAlert({
        tone: "success",
        title: variables.active ? "Categoria ativada." : "Categoria desativada.",
        description: variables.active ? "A categoria voltou a ficar disponivel para produtos." : "Produtos existentes permanecem preservados, mas a categoria deixa de ser usada em novos fluxos."
      });
    },
    onError: (error) => {
      setAlert({
        tone: "warning",
        title: "Nao foi possivel alterar a categoria.",
        description: error instanceof Error ? error.message : "Tente novamente em instantes."
      });
    }
  });
  const pricingSettingsMutation = useMutation({
    mutationFn: (input: PricingConfig) => updatePricingSettings(accessToken, input),
    onSuccess: async (settings) => {
      setPricingConfig({
        taxPercent: Number(settings.taxPercent),
        feePercent: Number(settings.feePercent)
      });
      await queryClient.invalidateQueries({ queryKey: ["fiscal-pricing-settings", accessToken] });
      setAlert({
        tone: "success",
        title: "Taxas fiscais atualizadas.",
        description: "As taxas de precificação foram salvas para a empresa atual."
      });
    },
    onError: (error) => {
      setAlert({
        tone: "warning",
        title: "Não foi possível salvar as taxas.",
        description: error instanceof Error ? error.message : "Verifique suas permissões fiscais e tente novamente."
      });
    }
  });
  const createProductMutation = useMutation({
    mutationFn: (input: {
      sku: string;
      name: string;
      unit: string;
      salePrice: string;
      costPrice?: string;
      categoryId?: string;
      imageDataUrl?: string;
      imageFileName?: string;
      barcodes: string[];
      initialStock?: { warehouseId: string; quantity: string };
      fiscalProfile?: ProductFiscalProfileInput;
    }) => {
      const { fiscalProfile, ...productInput } = input;
      return createProduct(accessToken, productInput).then(async (createdProduct) => {
        let fiscalError: string | null = null;
        if (canManageFiscalProfile && fiscalProfile) {
          const productId = textValue(asRecord(createdProduct)?.id, "");
          if (productId) {
            try {
              await upsertProductFiscalProfile(accessToken, productId, fiscalProfile);
            } catch (error) {
              fiscalError = error instanceof Error ? error.message : "Falha ao salvar perfil fiscal.";
            }
          }
        }
        return { createdProduct, fiscalError };
      });
    },
    onSuccess: async ({ fiscalError }) => {
      setProductDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: ["products", accessToken] });
      setAlert({
        tone: fiscalError ? "warning" : "success",
        title: fiscalError ? "Produto criado com pendência fiscal." : "Produto criado.",
        description: fiscalError ? `O cadastro do produto foi salvo, mas o perfil fiscal não foi aplicado: ${fiscalError}` : "O produto já está disponível para venda e controle de estoque."
      });
    },
    onError: (error) => {
      setAlert({
        tone: "warning",
        title: "Não foi possível criar o produto.",
        description: error instanceof Error ? error.message : "Revise os campos obrigatórios e tente novamente."
      });
    }
  });
  const dismissAlert = useCallback(() => setAlert(null), []);
  const pdvSaleMutation = useMutation({
    mutationFn: (input: { warehouseId: string; paymentMethod: SalePaymentMethod; items: Array<{ productId: string; quantity: string; unitPrice: string }> }) => {
      const total = input.items.reduce((sum, item) => sum + Number(item.quantity) * Number(item.unitPrice), 0);
      return createSale(accessToken, {
        warehouseId: input.warehouseId,
        source: "POS",
        discount: "0",
        idempotencyKey: `web:pdv:${Date.now()}`,
        items: input.items.map((item) => ({ ...item, discount: "0" })),
        payments: [{ method: input.paymentMethod, amount: total.toFixed(2) }]
      });
    },
    onSuccess: async () => {
      setPdvResetKey((current) => current + 1);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["operational-module", accessToken] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", accessToken] }),
        queryClient.invalidateQueries({ queryKey: ["products", accessToken] }),
        queryClient.invalidateQueries({ queryKey: ["stock-balances", accessToken] })
      ]);
      setAlert({
        tone: "success",
        title: "Venda concluída no PDV.",
        description: "A venda foi registrada e o estoque foi atualizado."
      });
    },
    onError: (error) => {
      setAlert({
        tone: "warning",
        title: "Não foi possível finalizar a venda.",
        description: error instanceof Error ? error.message : "Revise carrinho, depósito e tente novamente."
      });
    }
  });
  const createPurchaseMutation = useMutation({
    mutationFn: (input: { supplierId: string; warehouseId: string; productId: string; quantity: string; unitCost: string }) =>
      createPurchase(accessToken, {
        supplierId: input.supplierId,
        warehouseId: input.warehouseId,
        status: "ORDERED",
        discount: "0",
        idempotencyKey: `web:purchase:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
        items: [{ productId: input.productId, quantity: input.quantity, unitCost: input.unitCost, discount: "0" }]
      }),
    onSuccess: async () => {
      setPurchaseDialog(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["operational-module", accessToken] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", accessToken] })
      ]);
      setAlert({ tone: "success", title: "Compra registrada.", description: "A conta a pagar foi criada e o estoque será atualizado quando a compra for recebida." });
    },
    onError: (error) => {
      setAlert({
        tone: "warning",
        title: "Não foi possível registrar a compra.",
        description: error instanceof Error ? error.message : "Confira fornecedor, produto, depósito e valores informados."
      });
    }
  });
  const ifoodOauthCompleteMutation = useMutation({
    mutationFn: ({ state, authorizationCode }: { state: IfoodOauthDialogState; authorizationCode: string }) =>
      completeIfoodOauth(accessToken, state.connectionId, {
        authorizationCode,
        authorizationCodeVerifier: state.authorizationCodeVerifier,
        mode: state.mode
      }),
    onSuccess: async () => {
      setIfoodOauthDialog(null);
      await queryClient.invalidateQueries({ queryKey: ["operational-module", accessToken] });
      setAlert({
        tone: "success",
        title: "iFood conectado.",
        description: "Esta loja já pode enviar produtos e estoque para o iFood."
      });
    },
    onError: (error) => {
      setAlert({
        tone: "warning",
        title: "Não foi possível conectar o iFood.",
        description: error instanceof Error ? error.message : "Confira se o código ainda está válido e tente novamente."
      });
    }
  });
  const ifoodStockSettingsMutation = useMutation({
    mutationFn: ({ connectionId, input }: { connectionId: string; input: { ecommerceStockMode: "FULL" | "PERCENT" | "FIXED"; ecommerceStockPercent?: string | null; ecommerceStockFixedQuantity?: string | null } }) =>
      updateIntegrationConnection(accessToken, connectionId, input),
    onSuccess: async () => {
      setIfoodStockSettingsDialog(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["operational-module", accessToken] }),
        queryClient.invalidateQueries({ queryKey: ["settings-ifood-connection", accessToken] })
      ]);
      setAlert({
        tone: "success",
        title: "Regra de venda online salva.",
        description: "A próxima sincronização enviará ao iFood apenas o estoque definido para esta loja."
      });
    },
    onError: (error) => {
      setAlert({
        tone: "warning",
        title: "Não foi possível salvar estoque ecommerce.",
        description: error instanceof Error ? error.message : "Revise a configuração e tente novamente."
      });
    }
  });
  const productIfoodSyncMutation = useMutation({
    mutationFn: async ({ product }: { product: ProductItem }) => {
      const readiness = productIfoodReadiness(product);
      if (!readiness.ready) {
        throw new Error(`Complete o cadastro antes de enviar: ${readiness.issues.join(", ")}.`);
      }

      const connections = await getPaginatedResource(accessToken, "/api/v1/integrations/connections", { limit: 10 });
      const ifoodConnections = connections.data.filter((item) => textValue(asRecord(item)?.channel, "") === "IFOOD" && textValue(asRecord(item)?.externalAccountId, ""));
      const connection =
        ifoodConnections.find((item) => textValue(asRecord(item)?.status, "") === "CONNECTED") ??
        ifoodConnections.find((item) => textValue(asRecord(item)?.status, "") === "ERROR");
      const connectionId = textValue(asRecord(connection)?.id, "");
      if (!connectionId) {
        throw new Error("Conecte o iFood desta loja antes de enviar produtos.");
      }

      const result = await syncIfoodCatalog(accessToken, connectionId, { dryRun: false, limit: 1, productId: product.id });
      return { productId: product.id, productName: product.name, result };
    },
    onSuccess: async ({ productName, result }) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["products", accessToken] }),
        queryClient.invalidateQueries({ queryKey: ["operational-module", accessToken] })
      ]);
      setAlert({
        tone: result.summary.errors > 0 ? "warning" : "success",
        title: result.summary.errors > 0 ? "Alguns dados precisam de ajuste." : "Produto enviado ao iFood.",
        description:
          result.summary.errors > 0
            ? `${result.summary.errors} produto(s) não foram enviados. Abra o erro do produto e corrija o cadastro.`
            : `${productName} foi atualizado no iFood com preço, foto e estoque.`
      });
    },
    onError: (error) => {
      setAlert({
        tone: "warning",
        title: "Não foi possível sincronizar com iFood.",
        description: error instanceof Error ? error.message : "Confira se o iFood está conectado e se o produto tem categoria, código de barras e preço."
      });
    }
  });
  const ifoodCatalogItemMutation = useMutation({
    mutationFn: async ({ item, source, mode, productId, categoryId, saveCatalogMapping }: { item: GenericListItem; source: "catalog" | "pending"; mode: "link" | "create"; productId?: string; categoryId?: string; saveCatalogMapping?: boolean }) => {
      const connections = await getPaginatedResource(accessToken, "/api/v1/integrations/connections", { limit: 10 });
      const connection = connections.data.find((candidate) => textValue(asRecord(candidate)?.channel, "") === "IFOOD" && textValue(asRecord(candidate)?.status, "") === "CONNECTED");
      const connectionId = textValue(asRecord(connection)?.id, "");
      if (!connectionId) {
        throw new Error("Conecte o iFood desta loja antes de vincular itens.");
      }
      const ifoodItemId = textValue(item.ifoodItemId, "");
      if (!ifoodItemId) {
        throw new Error("Item iFood sem identificador para vínculo.");
      }
      if (mode === "link") {
        if (!productId) {
          throw new Error("Selecione um produto do ERP para vincular.");
        }
        if (source === "pending") {
          return resolveIfoodPendingItem(accessToken, connectionId, textValue(item.id, ""), {
            productId,
            ...(saveCatalogMapping !== undefined ? { saveCatalogMapping } : {})
          });
        }
        return linkIfoodCatalogItem(accessToken, connectionId, ifoodItemId, { productId });
      }
      if (source === "pending") {
        throw new Error("Para pendências, selecione um produto existente do ERP.");
      }
      return createProductFromIfoodItem(accessToken, connectionId, ifoodItemId, {
        ...(categoryId ? { categoryId } : {}),
        sku: textValue(item.externalCode, ifoodItemId),
        name: textValue(item.name, "Item iFood"),
        description: textValue(item.description, undefined),
        unit: textValue(item.unit, "UN"),
        salePrice: Number(textValue(item.price, "0")) > 0 ? Number(textValue(item.price, "0")).toFixed(2) : "0.01",
        ...(textValue(item.ean, "") ? { barcode: textValue(item.ean, "") } : {})
      });
    },
    onSuccess: async (_result, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["operational-module", accessToken] }),
        queryClient.invalidateQueries({ queryKey: ["products", accessToken] }),
        queryClient.invalidateQueries({ queryKey: ["ifood-link-products", accessToken] })
      ]);
      const source = ifoodCatalogLinkDialog?.source;
      const mappingSaved = source === "pending" && variables.saveCatalogMapping !== false;
      setIfoodCatalogLinkDialog(null);
      setAlert({
        tone: "success",
        title: source === "pending" ? "Pendência resolvida." : "Item iFood vinculado.",
        description:
          source === "pending"
            ? mappingSaved
              ? "O produto foi vinculado, o mapeamento foi salvo e o estoque foi reservado ou baixado conforme o estado atual do pedido."
              : "O produto foi vinculado nesta venda e o estoque foi reservado ou baixado conforme o estado atual do pedido."
            : "Os próximos pedidos poderão usar esse vínculo para reservar estoque."
      });
    },
    onError: (error) => {
      setAlert({
        tone: "warning",
        title: "Não foi possível vincular item iFood.",
        description: error instanceof Error ? error.message : "Confira o produto selecionado e tente novamente."
      });
    }
  });
  const ifoodOrderStatusMutation = useMutation({
    mutationFn: ({ saleId, body }: { saleId: string; body: IfoodOrderActionBody }) =>
      runIfoodOrderAction(accessToken, saleId, body),
    onSuccess: async (_result, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["operational-module", accessToken] });
      setIfoodCancellationDialog(null);
      const cancellation = variables.body.action === "REQUEST_CANCELLATION";
      setAlert({
        tone: "success",
        title: cancellation ? "Cancelamento solicitado ao iFood." : "Etapa enviada ao iFood.",
        description: cancellation
          ? "O pedido será cancelado no ERP quando o iFood confirmar pelo próximo evento de polling."
          : "O status será atualizado assim que o iFood confirmar esta etapa."
      });
    },
    onError: (error) => {
      setAlert({
        tone: "warning",
        title: "Não foi possível atualizar o pedido iFood.",
        description: error instanceof Error ? error.message : "Tente novamente ou verifique o status no portal iFood."
      });
    }
  });
  const saleCancelMutation = useMutation({
    mutationFn: ({ saleId, reason }: { saleId: string; reason: string }) =>
      cancelSale(accessToken, saleId, {
        reason,
        idempotencyKey: `web:cancel-sale:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["operational-module", accessToken] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", accessToken] }),
        queryClient.invalidateQueries({ queryKey: ["stock-balances", accessToken] })
      ]);
      setAlert({
        tone: "success",
        title: "Venda cancelada.",
        description: "O histórico foi atualizado e o estoque foi devolvido quando aplicável."
      });
    },
    onError: (error) => {
      setAlert({
        tone: "warning",
        title: "Não foi possível cancelar a venda.",
        description: error instanceof Error ? error.message : "Confira o status da venda e tente novamente."
      });
    }
  });
  const purchaseReceiveMutation = useMutation({
    mutationFn: ({ purchaseId }: { purchaseId: string }) =>
      receivePurchase(accessToken, purchaseId, {
        idempotencyKey: `web:receive-purchase:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["operational-module", accessToken] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", accessToken] }),
        queryClient.invalidateQueries({ queryKey: ["stock-balances", accessToken] }),
        queryClient.invalidateQueries({ queryKey: ["products", accessToken] })
      ]);
      setAlert({
        tone: "success",
        title: "Compra recebida.",
        description: "A entrada de estoque foi registrada e a compra saiu das pendências."
      });
    },
    onError: (error) => {
      setAlert({
        tone: "warning",
        title: "Não foi possível receber a compra.",
        description: error instanceof Error ? error.message : "Confira o status da compra e tente novamente."
      });
    }
  });
  const purchaseCancelMutation = useMutation({
    mutationFn: ({ purchaseId, reason }: { purchaseId: string; reason: string }) => cancelPurchase(accessToken, purchaseId, { reason }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["operational-module", accessToken] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", accessToken] })
      ]);
      setAlert({
        tone: "success",
        title: "Compra cancelada.",
        description: "A compra foi retirada das pendências operacionais."
      });
    },
    onError: (error) => {
      setAlert({
        tone: "warning",
        title: "Não foi possível cancelar a compra.",
        description: error instanceof Error ? error.message : "Compras já recebidas não podem ser canceladas por este fluxo."
      });
    }
  });
  const financialSettleMutation = useMutation({
    mutationFn: ({ entryId, amount }: { entryId: string; amount: string }) =>
      settleFinancialEntry(accessToken, entryId, {
        paidAmount: amount,
        paymentMethod: "PIX"
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["operational-module", accessToken] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", accessToken] })
      ]);
      setAlert({
        tone: "success",
        title: "Conta baixada.",
        description: "O financeiro foi atualizado e a pendência saiu dos alertas quando aplicável."
      });
    },
    onError: (error) => {
      setAlert({
        tone: "warning",
        title: "Não foi possível baixar a conta.",
        description: error instanceof Error ? error.message : "Confira o valor e tente novamente."
      });
    }
  });
  const financialCancelMutation = useMutation({
    mutationFn: ({ entryId, reason }: { entryId: string; reason: string }) => cancelFinancialEntry(accessToken, entryId, { reason }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["operational-module", accessToken] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard", accessToken] })
      ]);
      setAlert({
        tone: "success",
        title: "Conta cancelada.",
        description: "A pendência financeira foi retirada do acompanhamento."
      });
    },
    onError: (error) => {
      setAlert({
        tone: "warning",
        title: "Não foi possível cancelar a conta.",
        description: error instanceof Error ? error.message : "Contas já baixadas não podem ser canceladas por este fluxo."
      });
    }
  });
  const operationalActionMutation = useMutation({
    mutationFn: async ({ tab, item }: { tab: OperationalTab; item?: GenericListItem }) => {
      const token = accessToken;
      const timestamp = Date.now();
      const suffix = `${timestamp}-${Math.random().toString(36).slice(2, 8)}`;
      const idempotency = (prefix: string) => `${prefix}:${suffix}`;

      switch (tab) {
        case "alerts": {
          return createAlertRule(token, {
            name: `Regra automática ${new Date(timestamp).toLocaleTimeString("pt-BR")}`,
            type: "LOW_STOCK",
            threshold: { minimumQuantity: 5 }
          });
        }
        case "sales": {
          const [products, warehouses, customers] = await Promise.all([
            getProducts(token, { limit: 1 }),
            getPaginatedResource(token, "/api/v1/warehouses", { limit: 1 }),
            getCustomers(token, { limit: 1 })
          ]);
          const product = products.data.find((entry) => entry.active);
          const warehouse = warehouses.data[0];
          if (!product || !warehouse) {
            throw new Error("Cadastre ao menos 1 produto e 1 depósito ativo para criar venda.");
          }
          const unitPrice = product.branchPrices[0]?.salePrice ?? product.salePrice;
          return createSale(token, {
            warehouseId: String(warehouse.id),
            ...(customers.data[0]?.id ? { customerId: customers.data[0].id } : {}),
            source: "POS",
            discount: "0",
            idempotencyKey: idempotency("web:sale"),
            items: [{ productId: product.id, quantity: "1", unitPrice, discount: "0" }],
            payments: [{ method: "PIX", amount: unitPrice }]
          });
        }
        case "purchases": {
          const [products, warehouses, suppliers] = await Promise.all([
            getProducts(token, { limit: 1 }),
            getPaginatedResource(token, "/api/v1/warehouses", { limit: 1 }),
            getSuppliers(token, { limit: 1 })
          ]);
          const product = products.data.find((entry) => entry.active);
          const warehouse = warehouses.data[0];
          if (!product || !warehouse) {
            throw new Error("Cadastre ao menos 1 produto e 1 depósito ativo para criar compra.");
          }
          const unitCost = product.costPrice ?? "1.00";
          return createPurchase(token, {
            warehouseId: String(warehouse.id),
            ...(suppliers.data[0]?.id ? { supplierId: suppliers.data[0].id } : {}),
            status: "ORDERED",
            discount: "0",
            idempotencyKey: idempotency("web:purchase"),
            items: [{ productId: product.id, quantity: "1", unitCost, discount: "0" }]
          });
        }
        case "transfers": {
          const [products, warehouses, me] = await Promise.all([getProducts(token, { limit: 1 }), getPaginatedResource(token, "/api/v1/warehouses", { limit: 1 }), getMe(token)]);
          const product = products.data.find((entry) => entry.active);
          const warehouse = warehouses.data[0];
          if (!product || !warehouse) {
            throw new Error("Cadastre ao menos 1 produto e 1 depósito ativo para criar transferência.");
          }
          return createStockTransfer(token, {
            sourceWarehouseId: String(warehouse.id),
            destinationBranchId: me.tenant.branchId,
            destinationWarehouseId: String(warehouse.id),
            reason: "Transferência criada pelo fluxo da tela",
            idempotencyKey: idempotency("web:transfer"),
            items: [{ productId: product.id, quantity: "1" }]
          });
        }
        case "counts": {
          const [products, warehouses] = await Promise.all([getProducts(token, { limit: 1 }), getPaginatedResource(token, "/api/v1/warehouses", { limit: 1 })]);
          const product = products.data.find((entry) => entry.active);
          const warehouse = warehouses.data[0];
          if (!product || !warehouse) {
            throw new Error("Cadastre ao menos 1 produto e 1 depósito ativo para criar inventário.");
          }
          return createInventoryCount(token, {
            warehouseId: String(warehouse.id),
            notes: "Contagem criada pelo fluxo da tela",
            idempotencyKey: idempotency("web:count"),
            items: [{ productId: product.id, countedQuantity: "1" }]
          });
        }
        case "fiscal": {
          return createTaxRule(token, {
            name: `Regra ICMS ${new Date(timestamp).toLocaleDateString("pt-BR")}`,
            taxType: "ICMS",
            conditions: [{ field: "uf", operator: "EQUALS", value: "SP" }]
          });
        }
        case "imports": {
          return createImportJob(token, {
            source: "CSV",
            fileName: `importacao-${timestamp}.csv`
          });
        }
        case "integrations": {
          const existingIfoodConnection = item ?? (await getPaginatedResource(token, "/api/v1/integrations/connections", { limit: 1 })).data[0];
          const connection = existingIfoodConnection
            ? existingIfoodConnection
            : await createIntegrationConnection(token, {
              channel: "IFOOD"
            });

          const connectionId = textValue(asRecord(connection)?.id, "");
          const channel = textValue(asRecord(connection)?.channel, "");
          const status = textValue(asRecord(connection)?.status, "DISCONNECTED");
          if (!connectionId || channel !== "IFOOD") {
            throw new Error("Selecione uma conexão iFood válida.");
          }

          if (status !== "CONNECTED") {
            const oauthStart = await startIfoodOauth(token, connectionId, { mode: "GROCERIES" });
            setIfoodOauthDialog({ ...oauthStart, connectionId });
            window.open(oauthStart.verificationUrlComplete, "_blank", "noopener,noreferrer");
            return { flow: "IFOOD_OAUTH_STARTED" };
          }

          return getIfoodIntegrationHealth(token, connectionId);
        }
        case "channels": {
          const connectionId = textValue(asRecord(item)?.id, "");
          const channel = textValue(asRecord(item)?.channel, "");
          const status = textValue(asRecord(item)?.status, "DISCONNECTED");
          if (!connectionId) {
            throw new Error("Conecte o iFood desta loja antes de sincronizar.");
          }
          if (channel !== "IFOOD") {
            throw new Error("Escolha uma loja iFood válida.");
          }
          if (status !== "CONNECTED") {
            throw new Error("Conecte o iFood desta loja antes de enviar produtos.");
          }
          return syncIfoodCatalog(token, connectionId, { dryRun: false, limit: 1000 });
        }
        case "ifood-orders": {
          const connections = await getPaginatedResource(token, "/api/v1/integrations/connections", { limit: 10 });
          const connection = connections.data.find((candidate) => textValue(asRecord(candidate)?.channel, "") === "IFOOD" && textValue(asRecord(candidate)?.status, "") === "CONNECTED");
          const connectionId = textValue(asRecord(connection)?.id, "");
          if (!connectionId) {
            throw new Error("Conecte o iFood desta loja antes de receber pedidos.");
          }
          const reprocessed = await reprocessIfoodEvents(token, connectionId, { limit: 50 });
          const polled = await pollIfoodEvents(token, connectionId);
          return { reprocessed, polled };
        }
        case "reports": {
          return createReportJob(token, {
            type: "SALES",
            filters: { preset: "today" }
          });
        }
        case "users": {
          const [roles, branches] = await Promise.all([getRoles(token, { limit: 100 }), getBranches(token, { limit: 100 })]);
          const activeBranches = branches.data.filter((branch) => branch.active);
          const role = roles.data[0];
          if (!role || activeBranches.length === 0) {
            throw new Error("É preciso ter ao menos 1 perfil e 1 loja ativa para criar usuário.");
          }
          return createUser(token, {
            name: `Usuário ${new Date(timestamp).toLocaleTimeString("pt-BR")}`,
            email: `usuario.${suffix}@local.test`,
            password: "UserFlow123!",
            roleId: role.id,
            branchIds: activeBranches.map((branch) => branch.id)
          });
        }
        case "multistore": {
          return createBranch(token, {
            name: `Loja ${new Date(timestamp).toLocaleTimeString("pt-BR")}`,
            defaultWarehouseName: "Estoque Principal"
          });
        }
        case "settings": {
          return createWarehouse(token, {
            name: `Depósito ${new Date(timestamp).toLocaleTimeString("pt-BR")}`
          });
        }
        default:
          throw new Error("Ação primária ainda não está disponível para esta tela.");
      }
    },
    onSuccess: async (data, variables) => {
      await queryClient.invalidateQueries();
      if (variables.tab === "integrations" && textValue(asRecord(data)?.flow, "") === "IFOOD_OAUTH_STARTED") {
        setAlert({
          tone: "info",
          title: "Portal iFood aberto.",
          description: "Depois de autorizar no iFood, volte aqui e cole o código exibido."
        });
        return;
      }
      if (variables.tab === "ifood-orders") {
        const reprocessed = asRecord(data)?.reprocessed;
        const polled = asRecord(data)?.polled;
        setAlert({
          tone: "success",
          title: "Notificações iFood atualizadas.",
          description: `Novos eventos: ${textValue(asRecord(polled)?.received, "0")}. Logs reavaliados: ${textValue(asRecord(reprocessed)?.processed, "0")}.`
        });
        return;
      }
      setAlert({
        tone: "success",
        title: "Concluído.",
        description: `A ação em ${operationalModules[variables.tab]?.title ?? "operação"} foi concluída.`
      });
    },
    onError: (error, variables) => {
      const isIfoodConnection = variables.tab === "integrations";
      setAlert({
        tone: "warning",
        title: isIfoodConnection ? "Não foi possível conectar o iFood." : "Não foi possível concluir.",
        description: error instanceof Error ? error.message : "Verifique permissões, dados obrigatórios e tente novamente."
      });
    }
  });

  const activeContext = useMemo(() => {
    const data = meQuery.data;
    const company = data?.user.companyAccesses.find((item) => item.company.id === data.tenant.companyId)?.company;
    const branch = data?.user.branchAccesses.find((item) => item.branch.id === data.tenant.branchId)?.branch;
    return { company, branch };
  }, [meQuery.data]);

  const companyName = activeContext.company?.tradeName ?? activeContext.company?.legalName ?? "Minha empresa";
  const branchName = activeContext.branch?.name ?? "Minha loja";
  const userName = meQuery.data?.user.name ?? "Usuário";
  const warehouseOptions = useMemo(
    () =>
      (warehousesQuery.data?.data ?? [])
        .map((item) => {
          const record = asRecord(item);
          return {
            id: textValue(record?.id, ""),
            name: textValue(record?.name, "Depósito"),
            active: record?.active !== false
          };
        })
        .filter((item) => item.active && isEntityIdValue(item.id))
        .map(({ id, name }) => ({ id, name })),
    [warehousesQuery.data?.data]
  );

  useEffect(() => {
    if (!preferencesQuery.data) {
      return;
    }

    setSettingsState((current) => ({ ...current, ...preferencesQuery.data }));
  }, [preferencesQuery.data]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settingsState.darkMode);
  }, [settingsState.darkMode]);

  useEffect(() => {
    if (tab !== "sales") {
      return;
    }

    const timeout = window.setTimeout(() => {
      const nextSearch = productSearchDraft.trim();
      setProductSearch((current) => {
        if (current === nextSearch) {
          return current;
        }
        setProductCursorStack([null]);
        return nextSearch;
      });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [productSearchDraft, tab]);

  useEffect(() => {
    if (!pricingSettingsQuery.data) {
      return;
    }

    setPricingConfig({
      taxPercent: Number(pricingSettingsQuery.data.taxPercent),
      feePercent: Number(pricingSettingsQuery.data.feePercent)
    });
  }, [pricingSettingsQuery.data]);

  const focusContentAfterNavigation = useCallback(() => {
    setOperationalCursorStack([null]);
    setOperationalSearchDraft("");
    setOperationalSearch("");
    window.requestAnimationFrame(() => {
      contentFocusRef.current?.focus();
    });
  }, []);

  const navigateWithinApp = useCallback((href: string) => {
    const nextTab = tabFromPathname(href);
    setContentTransitioning(true);
    setActiveTab(nextTab);
    if (window.location.pathname !== href) {
      window.history.pushState(null, "", href);
    }
    focusContentAfterNavigation();
    window.setTimeout(() => setContentTransitioning(false), 180);
  }, [focusContentAfterNavigation]);

  useEffect(() => {
    if (pathname === "/") {
      setActiveTab("overview");
      window.history.replaceState(null, "", tabRoutes.overview);
      return;
    }

    if (tabFromPathname(pathname) === "ifood-pending") {
      setIfoodOrdersView("pending");
      setActiveTab("ifood-orders");
      window.history.replaceState(null, "", tabRoutes["ifood-orders"]);
      return;
    }

    setActiveTab(tabFromPathname(pathname));
  }, [pathname]);

  useEffect(() => {
    function handlePopState() {
      setContentTransitioning(true);
      setActiveTab(tabFromPathname(window.location.pathname));
      focusContentAfterNavigation();
      window.setTimeout(() => setContentTransitioning(false), 180);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [focusContentAfterNavigation]);

  function showUnavailableItem(item: SidebarItem) {
    if (item.requiresIfood) {
      setAlert({
        tone: "warning",
        title: "Configure o iFood primeiro.",
        description: "Conecte a loja no módulo Config iFood para liberar itens, pedidos e demais rotinas do canal."
      });
      navigateWithinApp(tabRoutes.integrations);
      return;
    }
    if (item.status === "foundation") {
      setAlert({
        tone: "warning",
        title: `${item.label} ainda não tem tela.`,
        description: "Esta área ainda está sendo preparada. Use os módulos disponíveis por enquanto."
      });
      return;
    }

    setAlert({
      tone: "info",
      title: `${item.label} esta no roadmap.`,
      description: "Esse modulo esta planejado para uma proxima etapa e ainda nao possui tela ou fluxo operacional."
    });
  }

  function runOperationalPrimaryAction(tabToRun: OperationalTab, item?: GenericListItem) {
    if (tabToRun === "global-search") {
      if (!operationalSearchDraft.trim()) {
        setAlert({
          tone: "warning",
          title: "Digite algo para buscar.",
        description: "Busque por produto, cliente, fornecedor ou venda."
        });
        return;
      }
      setOperationalSearch(operationalSearchDraft.trim());
      resetOperationalPagination();
      return;
    }

    if (tabToRun === "alerts" && item) {
      const targetTab = textValue(item.targetTab, "");
      const targetHref = targetTab && targetTab in tabRoutes ? tabRoutes[targetTab as DashboardTab] : tabRoutes.alerts;
      navigateWithinApp(targetHref);
      return;
    }

    if (tabToRun === "payments" || tabToRun === "receivables") {
      navigateWithinApp(tabRoutes.sales);
      return;
    }

    if (tabToRun === "sales-history") {
      navigateWithinApp(tabRoutes.sales);
      return;
    }

    if (tabToRun === "payables") {
      navigateWithinApp(tabRoutes.purchases);
      return;
    }

    if (tabToRun === "purchases") {
      setPurchaseDialog({ open: true });
      return;
    }

    if (tabToRun === "integrations") {
      operationalActionMutation.mutate({ tab: tabToRun, ...(item ? { item } : {}) });
      return;
    }

    if (tabToRun === "ifood-catalog") {
      if (item) {
        setIfoodCatalogLinkDialog({ item, source: "catalog" });
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ["operational-module", accessToken] });
      setAlert({
        tone: "success",
        title: "Catálogo iFood atualizado.",
        description: "A lista de itens do iFood será recarregada."
      });
      return;
    }

    if (tabToRun === "ifood-pending") {
      if (item) {
        setIfoodCatalogLinkDialog({ item, source: "pending" });
        return;
      }
      void queryClient.invalidateQueries({ queryKey: ["operational-module", accessToken] });
      return;
    }

    if (tabToRun === "ifood-orders") {
      if (ifoodOrdersView === "pending" && item) {
        setIfoodCatalogLinkDialog({ item, source: "pending" });
        return;
      }
      operationalActionMutation.mutate({ tab: tabToRun, ...(item ? { item } : {}) });
      return;
    }

    if (tabToRun === "settings") {
      setConfirmAction({
        title: "Criar novo depósito?",
        description: "Será criado um depósito na loja selecionada.",
        confirmLabel: "Criar depósito",
        onConfirm: () => operationalActionMutation.mutate({ tab: tabToRun, ...(item ? { item } : {}) })
      });
      return;
    }

    const config = operationalModules[tabToRun];
    const title = config?.actionTitle ?? "Confirmar ação?";
    const description = config?.actionDescription ?? "Deseja continuar?";
    setConfirmAction({
      title,
      description,
      confirmLabel: config?.primaryAction ?? "Executar",
      onConfirm: () => operationalActionMutation.mutate({ tab: tabToRun, ...(item ? { item } : {}) })
    });
  }

  async function openOperationalDetails(item: GenericListItem) {
    if (tab === "ifood-orders" && textValue(item.source) === "IFOOD") {
      let details = item;
      const hasIfoodOrderItems = Array.isArray(item.ifoodOrderItems) && item.ifoodOrderItems.length > 0;
      if (!textValue(item.ifoodDisplayId, "") || !hasIfoodOrderItems) {
        try {
          const externalDetails = await getIfoodSaleExternalDetails(accessToken, item.id);
          details = {
            ...item,
            ifoodDisplayId: textValue(externalDetails.displayId, ""),
            ifoodOrderItems: Array.isArray(externalDetails.orderItems) ? externalDetails.orderItems : item.ifoodOrderItems,
            ifoodPaymentMethods: Array.isArray(externalDetails.paymentMethods) ? externalDetails.paymentMethods : item.ifoodPaymentMethods
          };
        } catch {
          details = item;
        }
      }
      const displayId = textValue(details.ifoodDisplayId, "");
      setDetailsDialog({
        title: displayId ? `Pedido iFood #${displayId}` : "Pedido iFood",
        data: details
      });
      return;
    }

    setDetailsDialog({ title: `${operationalConfig?.title ?? "Detalhes"}: ${textValue(item.name ?? item.id, "Registro")}`, data: item });
  }

  function toggleSetting(key: keyof SettingsState, checked: boolean) {
    setSettingsState((current) => ({ ...current, [key]: checked }));
    preferencesMutation.mutate({ [key]: checked });
  }

  function updatePricingConfig(key: keyof PricingConfig, value: number) {
    const next = Number.isFinite(value) ? Math.min(100, Math.max(0, value)) : 0;
    setPricingConfig((current) => ({ ...current, [key]: Number(next.toFixed(2)) }));
  }

  function savePricingConfig() {
    if (!canManagePricingSettings) {
      setAlert({
        tone: "warning",
        title: "Sem permissão para alterar taxas.",
        description: "Seu usuário precisa da permissão fiscal.manage para editar essa configuração."
      });
      return;
    }

    pricingSettingsMutation.mutate(pricingConfig);
  }

  async function openIfoodCancellationDialog(item: GenericListItem) {
    const saleId = textValue(item.id, "");
    if (!saleId) {
      return;
    }

    try {
      const result = await getIfoodCancellationReasons(accessToken, saleId);
      if (result.reasons.length === 0) {
        setAlert({
          tone: "warning",
          title: "Cancelamento indisponível no iFood.",
          description: "O iFood não retornou motivos válidos para cancelar este pedido neste momento."
        });
        return;
      }
      setIfoodCancellationDialog({
        saleId,
        title: itemSummary("ifood-orders", item).title,
        reasons: result.reasons
      });
    } catch (error) {
      setAlert({
        tone: "warning",
        title: "Não foi possível carregar motivos do iFood.",
        description: error instanceof Error ? error.message : "Tente novamente ou verifique o pedido no portal iFood."
      });
    }
  }

  function confirmSettingToggle(key: keyof SettingsState, checked: boolean, title: string, description: string) {
    if (!settingsState.confirmCriticalActions && key !== "confirmCriticalActions") {
      toggleSetting(key, checked);
      return;
    }

    setConfirmAction({
      title,
      description,
      confirmLabel: checked ? "Ativar" : "Desativar",
      tone: checked ? "default" : "danger",
      onConfirm: () => toggleSetting(key, checked)
    });
  }

  function createBranchFromSettings() {
    const name = newBranchName.trim();
    const defaultWarehouseName = newBranchWarehouseName.trim();

    if (name.length < 2) {
      setAlert({
        tone: "warning",
        title: "Nome da loja incompleto.",
        description: "Informe pelo menos 2 caracteres para criar uma nova loja."
      });
      return;
    }

    setConfirmAction({
      title: "Criar nova loja?",
      description: `${name} será criada dentro da empresa atual com o depósito ${defaultWarehouseName || "Estoque Principal"} e acesso para seu usuário.`,
      confirmLabel: "Criar loja",
      onConfirm: () => branchCreateMutation.mutate(defaultWarehouseName ? { name, defaultWarehouseName } : { name })
    });
  }

  function confirmProductStatus(product: ProductListResponse["data"][number], nextActive: boolean) {
    setConfirmAction({
      title: nextActive ? "Ativar produto?" : "Desativar produto?",
      description: nextActive
        ? `${product.name} voltara a ficar disponivel nas operacoes da empresa.`
        : `${product.name} sera ocultado das operacoes ativas. O historico, estoque e movimentos existentes nao serao apagados.`,
      confirmLabel: nextActive ? "Ativar produto" : "Desativar produto",
      tone: nextActive ? "default" : "danger",
      onConfirm: () => productStatusMutation.mutate({ productId: product.id, active: nextActive })
    });
  }

  function confirmProductUpdate(product: ProductItem, input: ProductEditInput) {
    setEditingProduct(null);
    setConfirmAction({
      title: "Salvar alterações do produto?",
      description: "A foto e os dados comerciais serão atualizados no ERP. Se o produto já estiver no iFood, sincronize novamente para enviar a nova imagem.",
      confirmLabel: "Salvar",
      onConfirm: async () => {
        await productUpdateMutation.mutateAsync({ productId: product.id, input });
      }
    });
  }

  function createNewCategory() {
    const parsed = categoryFormSchema.safeParse({ name: newCategoryName });
    if (!parsed.success) {
      setAlert({
        tone: "warning",
        title: "Categoria incompleta.",
        description: parsed.error.issues[0]?.message ?? "Informe um nome valido."
      });
      return;
    }

    categoryCreateMutation.mutate(parsed.data);
  }

  function confirmCategoryStatus(category: CategoryListResponse["data"][number], nextActive: boolean) {
    setConfirmAction({
      title: nextActive ? "Ativar categoria?" : "Desativar categoria?",
      description: nextActive
        ? `${category.name} voltara a ficar disponivel para organizar produtos.`
        : `${category.name} deixara de aparecer nos fluxos ativos. Produtos e historico nao serao apagados.`,
      confirmLabel: nextActive ? "Ativar categoria" : "Desativar categoria",
      tone: nextActive ? "default" : "danger",
      onConfirm: () => categoryStatusMutation.mutate({ categoryId: category.id, active: nextActive })
    });
  }

  function resetProductPagination(limit = productLimit) {
    setProductLimit(limit);
    setProductCursorStack([null]);
  }

  function resetCustomerPagination(limit = customerLimit) {
    setCustomerLimit(limit);
    setCustomerCursorStack([null]);
  }

  function resetSupplierPagination(limit = supplierLimit) {
    setSupplierLimit(limit);
    setSupplierCursorStack([null]);
  }

  function resetInventoryPagination(limit = inventoryLimit) {
    setInventoryLimit(limit);
    setInventoryCursorStack([null]);
  }

  function resetCategoryPagination(limit = categoryLimit) {
    setCategoryLimit(limit);
    setCategoryCursorStack([null]);
  }

  function resetOperationalPagination(limit = operationalLimit) {
    setOperationalLimit(limit);
    setOperationalCursorStack([null]);
  }

  function goToNextProductPage() {
    if (productsQuery.data?.nextCursor) {
      setProductCursorStack((current) => [...current, productsQuery.data!.nextCursor]);
    }
  }

  function goToPreviousProductPage() {
    setProductCursorStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
  }

  function goToNextCustomerPage() {
    if (customersQuery.data?.nextCursor) {
      setCustomerCursorStack((current) => [...current, customersQuery.data!.nextCursor]);
    }
  }

  function goToPreviousCustomerPage() {
    setCustomerCursorStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
  }

  function goToNextSupplierPage() {
    if (suppliersQuery.data?.nextCursor) {
      setSupplierCursorStack((current) => [...current, suppliersQuery.data!.nextCursor]);
    }
  }

  function goToPreviousSupplierPage() {
    setSupplierCursorStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
  }

  function goToNextInventoryPage() {
    if (balancesQuery.data?.nextCursor) {
      setInventoryCursorStack((current) => [...current, balancesQuery.data!.nextCursor]);
    }
  }

  function goToPreviousInventoryPage() {
    setInventoryCursorStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
  }

  function goToNextCategoryPage() {
    if (categoriesQuery.data?.nextCursor) {
      setCategoryCursorStack((current) => [...current, categoriesQuery.data!.nextCursor]);
    }
  }

  function goToPreviousCategoryPage() {
    setCategoryCursorStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
  }

  function goToNextOperationalPage() {
    if (operationalQuery.data?.nextCursor) {
      setOperationalCursorStack((current) => [...current, operationalQuery.data!.nextCursor]);
    }
  }

  function goToPreviousOperationalPage() {
    setOperationalCursorStack((current) => (current.length > 1 ? current.slice(0, -1) : current));
  }

  const isOperationalActionPending =
    operationalActionMutation.isPending ||
    ifoodCatalogItemMutation.isPending ||
    ifoodOrderStatusMutation.isPending ||
    saleCancelMutation.isPending ||
    purchaseReceiveMutation.isPending ||
    purchaseCancelMutation.isPending ||
    financialSettleMutation.isPending ||
    financialCancelMutation.isPending ||
    productIfoodSyncMutation.isPending;
  const busyMessage =
    operationalActionMutation.isPending && operationalActionMutation.variables?.tab === "ifood-orders"
      ? "Atualizando notificações e logs do iFood..."
      : ifoodCatalogItemMutation.isPending
        ? "Salvando vínculo e ajustando estoque..."
        : ifoodOrderStatusMutation.isPending
          ? "Enviando etapa do pedido ao iFood..."
        : saleCancelMutation.isPending
          ? "Cancelando venda e ajustando estoque..."
        : purchaseReceiveMutation.isPending
          ? "Recebendo compra e registrando estoque..."
        : purchaseCancelMutation.isPending
          ? "Cancelando compra..."
        : financialSettleMutation.isPending
          ? "Baixando conta financeira..."
        : financialCancelMutation.isPending
          ? "Cancelando conta financeira..."
          : productIfoodSyncMutation.isPending
            ? "Sincronizando produto com o iFood..."
            : "Salvando alteração...";

  return (
    <main id="main" className="flex h-screen overflow-hidden bg-background">
      <AppSidebar
        ref={sidebarRef}
        activeTab={tab}
        onNavigateTo={(href) => {
          setSidebarCollapsed(true);
          navigateWithinApp(href);
        }}
        onUnavailableItem={showUnavailableItem}
        companyName={companyName}
        branchName={branchName}
        userName={userName}
        branches={branchesQuery.data?.data ?? []}
        activeBranchId={meQuery.data?.tenant.branchId}
        isSwitchingBranch={switchBranchMutation.isPending}
        onBranchChange={(branchId) => switchBranchMutation.mutate(branchId)}
        ifoodConnected={sidebarIfoodConnected}
        ifoodOrderNotificationCount={sidebarIfoodOrderNotificationCount}
        ifoodOrderNotificationText={sidebarIfoodOrderNotificationText}
        onIfoodOrderNotificationsRead={markIfoodOrderNotificationsRead}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
        onLogout={() =>
          setConfirmAction({
            title: "Sair da conta?",
            description: "Você voltará para a página inicial e precisará entrar novamente para acessar o sistema.",
            confirmLabel: "Sair",
            tone: "danger",
            onConfirm: onLogout
          })
        }
      />

      <div
        className="relative h-screen min-w-0 flex-1 overflow-y-auto bg-background transition-[background-color,filter] duration-300 ease-[var(--ease-out)]"
      >
        <header className="sticky top-0 z-20 border-b border-border bg-white/90 backdrop-blur-md">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              type="button"
              aria-label="Abrir menu"
              className="rounded-md border border-border p-2 text-slate-700 transition-[transform,background-color] duration-150 ease-[var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 lg:hidden"
            >
              <Menu aria-hidden="true" size={18} />
            </button>
            <div className="min-w-0 lg:hidden">
              <p className="truncate text-sm font-semibold">{companyName}</p>
              <p className="truncate text-xs text-muted-foreground">{branchName}</p>
            </div>
            <label className="ml-auto flex min-w-0 max-w-xl flex-1 items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-emerald-500">
              <Search aria-hidden="true" size={16} className="text-muted-foreground" />
              <span className="sr-only">Buscar</span>
              <input
                name="search"
                type="search"
                autoComplete="off"
                placeholder="Buscar produto, cliente ou venda..."
                className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
              />
            </label>
            <button
              type="button"
              onClick={() =>
                setConfirmAction({
                  title: "Sair da conta?",
                  description: "Você voltará para a página inicial e precisará entrar novamente para acessar o sistema.",
                  confirmLabel: "Sair",
                  tone: "danger",
                  onConfirm: onLogout
                })
              }
              className="rounded-md border border-border px-3 py-2 text-sm font-medium transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 lg:hidden"
            >
              Sair
            </button>
          </div>
        </header>

      <section
        ref={contentFocusRef}
        tabIndex={-1}
        className={`mx-auto max-w-7xl px-4 py-6 outline-none transition-[opacity,transform,filter] duration-[180ms] ease-[var(--ease-out)] ${
          contentTransitioning ? "translate-y-1 opacity-80 blur-[1px]" : "translate-y-0 opacity-100 blur-0"
        }`}
      >
        {tab === "overview" ? (
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold tracking-normal text-pretty">
                {meQuery.isLoading ? "Carregando..." : `Bom dia, ${meQuery.data?.user.name ?? "Luis"}`}
              </h1>
              <p className="text-sm text-muted-foreground">O que precisa da sua atenção hoje.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => runOperationalPrimaryAction("sales")}
                className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <ShoppingCart aria-hidden="true" size={16} />
                Nova venda
              </button>
              <button
                type="button"
                onClick={() => navigateWithinApp(tabRoutes.products)}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <PackagePlus aria-hidden="true" size={16} />
                Novo produto
              </button>
            </div>
          </div>
        ) : null}

        {tab === "overview" ? (
          <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_360px]">
            <article className="rounded-lg border border-emerald-100 bg-white px-4 py-4 shadow-sm shadow-emerald-950/5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Loja atual</p>
              <div className="mt-3 flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
                  <Store aria-hidden="true" size={20} />
                </span>
                <div className="min-w-0">
                  <h2 className="truncate text-base font-semibold text-slate-950">{branchName}</h2>
                  <p className="truncate text-sm text-muted-foreground">{companyName}</p>
                </div>
              </div>
            </article>

            <article className="rounded-lg border border-border bg-white px-4 py-4 shadow-sm shadow-slate-950/5">
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Vendas online</p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${sidebarIfoodConnected ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
                  {sidebarIfoodConnected ? "iFood conectado" : "Não conectado"}
                </span>
              </div>
              <p className="mt-3 text-2xl font-semibold tabular-nums text-slate-950">{money(dashboardOnlineSalesTotal)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {sidebarIfoodOrdersQuery.isLoading
                  ? "Carregando vendas online..."
                  : dashboardOnlineOrders.length > 0
                    ? `${numberFormatter.format(dashboardOnlineOrders.length)} pedido${dashboardOnlineOrders.length === 1 ? "" : "s"} iFood recente${dashboardOnlineOrders.length === 1 ? "" : "s"}`
                    : sidebarIfoodConnected
                      ? "Nenhuma venda online recente"
                      : "Conecte o iFood para acompanhar aqui"}
              </p>
              {dashboardLatestOnlineOrderSummary ? (
                <button
                  type="button"
                  onClick={() => navigateWithinApp(tabRoutes["ifood-orders"])}
                  className="mt-3 block w-full truncate rounded-md border border-border bg-slate-50 px-3 py-2 text-left text-sm font-medium text-slate-700 transition-[transform,background-color] hover:bg-white active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  {dashboardLatestOnlineOrderSummary}
                </button>
              ) : null}
            </article>
          </div>
        ) : (
          <div className="mb-4 rounded-lg border border-border bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Tela atual</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {sidebarGroups.flatMap((group) => group.items).find((item) => item.tab === tab)?.label ?? "Painel"}
            </p>
          </div>
        )}

        {tab === "overview" ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                [money(dashboardQuery.data?.today.salesTotal ?? "0"), "Vendas Hoje"],
                [numberFormatter.format(dashboardQuery.data?.today.orders ?? 0), "Pedidos"],
                [numberFormatter.format(dashboardQuery.data?.today.lowStockProducts ?? 0), "Produtos Acabando"],
                [numberFormatter.format(dashboardQuery.data?.today.outOfStockProducts ?? 0), "Sem Estoque"]
              ].map(([value, label]) => (
                <article key={label} className="rounded-lg border border-border bg-white p-4">
                  <p className="text-2xl font-semibold tabular-nums">{value}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{label}</p>
                </article>
              ))}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_320px]">
              <section className="rounded-lg border border-border bg-white">
                <div className="border-b border-border px-4 py-3">
                  <h2 className="text-base font-semibold">Precisa da sua atenção</h2>
                </div>
                <div className="divide-y divide-border">
                  {dashboardQuery.isLoading ? <p className="px-4 py-5 text-sm text-muted-foreground">Carregando alertas...</p> : null}
                  {dashboardQuery.data?.attention.map((item, index) => (
                    <article key={`${item.type}:${item.targetId ?? item.title}:${index}`} className="flex min-w-0 items-start gap-3 px-4 py-4">
                      <AlertTriangle aria-hidden="true" size={18} className={item.type === "OUT_OF_STOCK" || item.type === "FINANCIAL_DUE" ? "mt-0.5 text-red-600" : item.type === "IFOOD_ORDER" ? "mt-0.5 text-emerald-600" : "mt-0.5 text-amber-500"} />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-medium">{item.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const targetHref = item.targetTab && item.targetTab in tabRoutes ? tabRoutes[item.targetTab as DashboardTab] : tabRoutes.alerts;
                          navigateWithinApp(targetHref);
                        }}
                        className="rounded-md border border-border px-3 py-2 text-sm font-medium transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
                        Ver
                      </button>
                    </article>
                  ))}
                  {dashboardQuery.data?.attention.length === 0 ? <p className="px-4 py-5 text-sm text-muted-foreground">Nenhum alerta importante agora.</p> : null}
                </div>
              </section>

              <aside className="rounded-lg border border-border bg-white p-4">
                <h2 className="text-base font-semibold">Ações rápidas</h2>
                <div className="mt-3 grid gap-2">
                  <button
                    type="button"
                    onClick={() => runOperationalPrimaryAction("counts")}
                    className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-sm transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <Box aria-hidden="true" size={16} />
                    Entrada de estoque
                  </button>
                  <button
                    type="button"
                    onClick={() => runOperationalPrimaryAction("transfers")}
                    className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-sm transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <ArrowRightLeft aria-hidden="true" size={16} />
                    Transferir estoque
                  </button>
                </div>
                <div className="mt-5 border-t border-border pt-4">
                  <p className="text-sm font-medium">Compras em aberto</p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{numberFormatter.format(dashboardQuery.data?.today.pendingPurchases ?? 0)}</p>
                </div>
              </aside>
            </div>
          </>
        ) : null}

        {tab === "products" ? (
          <section className="rounded-lg border border-border bg-white">
            <div className="flex flex-col gap-3 border-b border-border px-4 py-3">
              <div>
                <h2 className="text-base font-semibold">Produtos</h2>
                <p className="text-sm text-muted-foreground">Pagina {productCursorStack.length}. Mostrando ate {productLimit} por tela.</p>
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <form
                  className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row lg:max-w-2xl"
                  onSubmit={(event) => {
                    event.preventDefault();
                    setProductSearch(productSearchDraft.trim());
                    resetProductPagination();
                  }}
                >
                  <label className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-emerald-500">
                    <Search aria-hidden="true" size={16} className="text-muted-foreground" />
                    <input
                      value={productSearchDraft}
                      onChange={(event) => setProductSearchDraft(event.target.value)}
                      maxLength={120}
                      placeholder="Buscar por nome, SKU ou EAN..."
                      className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                    />
                  </label>
                  <div className="flex gap-2">
                    <button type="submit" className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white transition-[transform,background-color] hover:bg-slate-800 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
                      Buscar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProductSearchDraft("");
                        setProductSearch("");
                        resetProductPagination();
                      }}
                      className="rounded-md border border-border px-3 py-2 text-sm font-medium text-slate-950 transition-[transform,background-color] hover:bg-slate-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                    >
                      Limpar
                    </button>
                  </div>
                </form>
                <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setProductDialogOpen(true)}
                  className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-[transform,background-color] hover:bg-emerald-700 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  <PackagePlus aria-hidden="true" size={16} />
                  Novo produto
                </button>
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  Por tela
                  <select
                    value={productLimit}
                    onChange={(event) => resetProductPagination(Number(event.target.value))}
                    className="rounded-md border border-border bg-white px-2 py-1.5 text-sm font-medium text-slate-950 outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {[5, 10, 25, 50].map((limit) => (
                      <option key={limit} value={limit}>
                        {limit}
                      </option>
                    ))}
                  </select>
                </label>
                </div>
              </div>
            </div>
            <div className="divide-y divide-border">
              {productsQuery.isLoading ? <p className="px-4 py-5 text-sm text-muted-foreground">Carregando produtos...</p> : null}
              {productsQuery.error ? <p className="px-4 py-5 text-sm text-red-600">{productsQuery.error.message}</p> : null}
              {activeProducts.map((product) => {
                const ifoodReadiness = productIfoodReadiness(product);
                const ifoodState = product.ifoodCatalogItems[0] ?? null;
                const ifoodSynced = ifoodState?.status === "SYNCED";
                const isSyncingThisProduct = productIfoodSyncMutation.isPending && productIfoodSyncMutation.variables?.product.id === product.id;
                const ifoodStatusLabel = ifoodSynced ? "No iFood" : ifoodState?.status === "ERROR" ? "Erro iFood" : ifoodReadiness.ready ? "Pronto p/ iFood" : "Ajustar cadastro";
                const ifoodStatusClass = ifoodSynced
                  ? "bg-emerald-50 text-emerald-700"
                  : ifoodState?.status === "ERROR"
                    ? "bg-red-50 text-red-700"
                  : ifoodReadiness.ready
                    ? "bg-cyan-50 text-cyan-700"
                    : "bg-amber-50 text-amber-700";
                return (
                  <article key={product.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(220px,1fr)_120px_120px_180px_190px_120px] lg:items-center">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-slate-50">
                        {product.imageDataUrl ? (
                          <img src={product.imageDataUrl} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon aria-hidden="true" size={18} className="text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <h3 className="truncate text-sm font-medium">{product.name}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${product.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                          {product.active ? "Ativo" : "Inativo"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {product.sku} · {product.category?.name ?? "Sem categoria"}
                      </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{product.barcodes[0]?.barcode ?? "Sem EAN"}</p>
                    <p className="text-sm font-medium tabular-nums">{money(product.branchPrices[0]?.salePrice ?? product.salePrice)}</p>
                    <div className="min-w-0">
                      <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${ifoodStatusClass}`}>{ifoodStatusLabel}</span>
                      {ifoodState?.status === "ERROR" && ifoodState.lastError ? (
                        <p className="mt-1 truncate text-xs text-red-600">{ifoodState.lastError}</p>
                      ) : !ifoodReadiness.ready && !ifoodSynced ? (
                        <p className="mt-1 truncate text-xs text-muted-foreground">{ifoodReadiness.issues.join(", ")}</p>
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => productIfoodSyncMutation.mutate({ product })}
                        title={ifoodSynced ? "Sincronizado com iFood" : ifoodReadiness.ready ? "Sincronizar com iFood" : `Ajuste antes de sincronizar: ${ifoodReadiness.issues.join(", ")}`}
                        aria-label={ifoodSynced ? `${product.name} sincronizado com iFood` : `Sincronizar ${product.name} com iFood`}
                        disabled={!ifoodReadiness.ready || productIfoodSyncMutation.isPending}
                        className={`inline-flex h-9 w-9 items-center justify-center rounded-md border transition-[transform,border-color,background-color,color] duration-150 ease-[var(--ease-out)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                          ifoodSynced
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "border-border bg-white text-slate-400 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
                        }`}
                      >
                        {isSyncingThisProduct ? <Loader2 aria-hidden="true" size={15} className="animate-spin" /> : <RefreshCw aria-hidden="true" size={15} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingProduct(product)}
                        title="Editar produto"
                        aria-label={`Editar ${product.name}`}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-white text-slate-950 transition-[transform,border-color,background-color] duration-150 ease-[var(--ease-out)] hover:border-emerald-200 hover:bg-emerald-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
                        <Pencil aria-hidden="true" size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDetailsDialog({ title: `Produto: ${product.name}`, data: product, variant: "product" })}
                        title="Ver detalhes"
                        aria-label="Ver detalhes"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border bg-white text-slate-950 transition-[transform,border-color,background-color] duration-150 ease-[var(--ease-out)] hover:border-emerald-200 hover:bg-emerald-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                      >
                        <Eye aria-hidden="true" size={16} />
                      </button>
                    </div>
                    <div className="flex items-center justify-between gap-3 lg:justify-end">
                      <span className="text-xs text-muted-foreground lg:hidden">Disponivel</span>
                      <ModernSwitch
                        checked={product.active}
                        disabled={productStatusMutation.isPending}
                        label={product.active ? `Desativar ${product.name}` : `Ativar ${product.name}`}
                        onCheckedChange={(checked) => confirmProductStatus(product, checked)}
                      />
                    </div>
                  </article>
                );
              })}
              {!productsQuery.isLoading && activeProducts.length === 0 ? <p className="px-4 py-5 text-sm text-muted-foreground">Nenhum produto ativo encontrado.</p> : null}
            </div>
            <div className="flex flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                {productsQuery.isFetching ? "Atualizando..." : productsQuery.data?.nextCursor ? "Ha mais produtos para carregar." : "Fim da lista atual."}
              </p>
              <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-white p-1">
                <button
                  type="button"
                  onClick={goToPreviousProductPage}
                  disabled={productCursorStack.length <= 1 || productsQuery.isFetching}
                  className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-[transform,background-color,color] duration-150 ease-[var(--ease-out)] hover:bg-slate-100 hover:text-slate-950 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  Anterior
                </button>
                <span className="min-w-10 rounded-md bg-slate-950 px-3 py-2 text-center text-sm font-semibold text-white">
                  {productCursorStack.length}
                </span>
                <button
                  type="button"
                  onClick={goToNextProductPage}
                  disabled={!productsQuery.data?.nextCursor || productsQuery.isFetching}
                  className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 transition-[transform,background-color,color] duration-150 ease-[var(--ease-out)] hover:bg-slate-100 hover:text-slate-950 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  Próxima
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {tab === "customers" ? (
          <PeopleDirectorySection
            title="Clientes"
            description={`Pagina ${customerCursorStack.length}. Busca sempre paginada por empresa ativa.`}
            emptyMessage="Nenhum cliente encontrado."
            query={customersQuery}
            searchDraft={customerSearchDraft}
            onSearchDraftChange={setCustomerSearchDraft}
            onApplySearch={() => {
              setCustomerSearch(customerSearchDraft.trim());
              resetCustomerPagination();
            }}
            onClearSearch={() => {
              setCustomerSearchDraft("");
              setCustomerSearch("");
              resetCustomerPagination();
            }}
            limit={customerLimit}
            onLimitChange={resetCustomerPagination}
            page={customerCursorStack.length}
            onPrevious={goToPreviousCustomerPage}
            onNext={goToNextCustomerPage}
            onViewDetails={(person) => setDetailsDialog({ title: `Cliente: ${person.name}`, data: person })}
          />
        ) : null}

        {tab === "suppliers" ? (
          <PeopleDirectorySection
            title="Fornecedores"
            description={`Pagina ${supplierCursorStack.length}. Busca sempre paginada por empresa ativa.`}
            emptyMessage="Nenhum fornecedor encontrado."
            query={suppliersQuery}
            searchDraft={supplierSearchDraft}
            onSearchDraftChange={setSupplierSearchDraft}
            onApplySearch={() => {
              setSupplierSearch(supplierSearchDraft.trim());
              resetSupplierPagination();
            }}
            onClearSearch={() => {
              setSupplierSearchDraft("");
              setSupplierSearch("");
              resetSupplierPagination();
            }}
            limit={supplierLimit}
            onLimitChange={resetSupplierPagination}
            page={supplierCursorStack.length}
            onPrevious={goToPreviousSupplierPage}
            onNext={goToNextSupplierPage}
            onViewDetails={(person) => setDetailsDialog({ title: `Fornecedor: ${person.name}`, data: person })}
          />
        ) : null}

        {tab === "categories" ? (
          <CategorySection
            query={categoriesQuery}
            searchDraft={categorySearchDraft}
            onSearchDraftChange={setCategorySearchDraft}
            onApplySearch={() => {
              setCategorySearch(categorySearchDraft.trim());
              resetCategoryPagination();
            }}
            onClearSearch={() => {
              setCategorySearchDraft("");
              setCategorySearch("");
              resetCategoryPagination();
            }}
            limit={categoryLimit}
            onLimitChange={resetCategoryPagination}
            page={categoryCursorStack.length}
            onPrevious={goToPreviousCategoryPage}
            onNext={goToNextCategoryPage}
            newCategoryName={newCategoryName}
            onNewCategoryNameChange={setNewCategoryName}
            onCreate={createNewCategory}
            isCreating={categoryCreateMutation.isPending}
            onToggleActive={confirmCategoryStatus}
            isUpdating={categoryStatusMutation.isPending}
          />
        ) : null}

        {tab === "inventory" ? (
          <section className="rounded-lg border border-border bg-white">
            <div className="flex flex-col gap-3 border-b border-border px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-base font-semibold">Estoque da loja</h2>
                <p className="text-sm text-muted-foreground">Página {inventoryCursorStack.length}. Busca paginada por depósito e produto.</p>
              </div>
              <form
                className="flex min-w-0 flex-col gap-2 sm:flex-row"
                onSubmit={(event) => {
                  event.preventDefault();
                  setInventorySearch(inventorySearchDraft.trim());
                  resetInventoryPagination();
                }}
              >
                <label className="flex min-w-0 items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm focus-within:ring-2 focus-within:ring-emerald-500">
                  <Search aria-hidden="true" size={16} className="text-muted-foreground" />
                  <span className="sr-only">Buscar estoque</span>
                  <input
                    value={inventorySearchDraft}
                    onChange={(event) => setInventorySearchDraft(event.target.value)}
                    placeholder="Buscar produto ou SKU..."
                    className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                  />
                </label>
                <button
                  type="submit"
                  className="rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white transition-[transform,background-color] duration-150 ease-[var(--ease-out)] hover:bg-slate-800 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
                >
                  Buscar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInventorySearchDraft("");
                    setInventorySearch("");
                    resetInventoryPagination();
                  }}
                  className="rounded-md border border-border px-3 py-2 text-sm font-medium text-slate-950 transition-[transform,border-color,background-color] duration-150 ease-[var(--ease-out)] hover:border-slate-300 hover:bg-slate-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                >
                  Limpar
                </button>
              </form>
            </div>
            <div className="divide-y divide-border">
              {balancesQuery.isLoading ? <p className="px-4 py-5 text-sm text-muted-foreground">Carregando estoque...</p> : null}
              {balancesQuery.data?.data.map((balance) => (
                <article key={balance.id} className="grid gap-2 px-4 py-4 sm:grid-cols-[1fr_160px_120px] sm:items-center">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-medium">{balance.product.name}</h3>
                    <p className="text-sm text-muted-foreground">{balance.product.sku}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{balance.warehouse.name}</p>
                  <p className="text-sm font-medium tabular-nums">
                    {numberFormatter.format(Number(balance.quantity))} {balance.product.unit}
                  </p>
                </article>
              ))}
              {balancesQuery.data?.data.length === 0 ? <p className="px-4 py-5 text-sm text-muted-foreground">Nenhum saldo encontrado.</p> : null}
            </div>
            <PaginationBar
              page={inventoryCursorStack.length}
              limit={inventoryLimit}
              onLimitChange={resetInventoryPagination}
              canPrevious={inventoryCursorStack.length > 1}
              canNext={Boolean(balancesQuery.data?.nextCursor)}
              isFetching={balancesQuery.isFetching}
              onPrevious={goToPreviousInventoryPage}
              onNext={goToNextInventoryPage}
            />
          </section>
        ) : null}

        {tab === "settings" ? (
          <SettingsSection
            companyName={companyName}
            branchName={branchName}
            settings={settingsState}
            pricingConfig={pricingConfig}
            branches={branchesQuery.data?.data ?? []}
            branchesLoading={branchesQuery.isLoading}
            newBranchName={newBranchName}
            newBranchWarehouseName={newBranchWarehouseName}
            isCreatingBranch={branchCreateMutation.isPending}
            onNewBranchNameChange={setNewBranchName}
            onNewBranchWarehouseNameChange={setNewBranchWarehouseName}
            onCreateBranch={createBranchFromSettings}
            onToggle={toggleSetting}
            onCriticalToggle={confirmSettingToggle}
            onPricingChange={updatePricingConfig}
            onSavePricing={savePricingConfig}
            isSavingPricing={pricingSettingsMutation.isPending}
            canManageFiscalPricing={canManagePricingSettings}
            ifoodConnection={settingsIfoodConnectionQuery.data?.data[0] ?? null}
            onConfigureIfoodStock={(connection) => setIfoodStockSettingsDialog({ connection })}
          />
        ) : null}

        {tab === "users" ? (
          <UsersPermissionSection
            query={usersQuery}
            roles={rolesQuery.data?.data ?? []}
            branches={branchesQuery.data?.data ?? []}
            searchDraft={operationalSearchDraft}
            onSearchDraftChange={setOperationalSearchDraft}
            onApplySearch={() => {
              setOperationalSearch(operationalSearchDraft.trim());
              resetOperationalPagination();
            }}
            onClearSearch={() => {
              setOperationalSearchDraft("");
              setOperationalSearch("");
              resetOperationalPagination();
            }}
            limit={operationalLimit}
            onLimitChange={resetOperationalPagination}
            page={operationalCursorStack.length}
            onPrevious={goToPreviousOperationalPage}
            onNext={goToNextOperationalPage}
            onEditUser={setSelectedUser}
            onCreateUser={() => runOperationalPrimaryAction("users")}
          />
        ) : null}

        {tab === "sales" ? (
          <SalesPdvSection
            products={activeProducts}
            warehouses={warehouseOptions}
            productsIsLoading={productsQuery.isLoading}
            productsIsFetching={productsQuery.isFetching}
            productsError={productsQuery.error}
            warehousesIsLoading={warehousesQuery.isLoading}
            warehousesError={warehousesQuery.error}
            searchDraft={productSearchDraft}
            onSearchDraftChange={setProductSearchDraft}
            onApplySearch={() => {
              setProductSearch(productSearchDraft.trim());
              resetProductPagination();
            }}
            onClearSearch={() => {
              setProductSearchDraft("");
              setProductSearch("");
              resetProductPagination();
            }}
            page={productCursorStack.length}
            hasNextPage={Boolean(productsQuery.data?.nextCursor)}
            hasPreviousPage={productCursorStack.length > 1}
            onNextPage={goToNextProductPage}
            onPreviousPage={goToPreviousProductPage}
            resetKey={pdvResetKey}
            isCreating={pdvSaleMutation.isPending}
            onCreateSale={(input) => pdvSaleMutation.mutate(input)}
          />
        ) : null}

        {operationalConfig && isOperationalTab(tab) && tab !== "sales" ? (
          <OperationalModuleSection
            tab={tab}
            config={operationalConfig}
            query={operationalQuery}
            searchDraft={operationalSearchDraft}
            onSearchDraftChange={setOperationalSearchDraft}
            onApplySearch={() => {
              setOperationalSearch(operationalSearchDraft.trim());
              resetOperationalPagination();
            }}
            onClearSearch={() => {
              setOperationalSearchDraft("");
              setOperationalSearch("");
              resetOperationalPagination();
            }}
            limit={operationalLimit}
            onLimitChange={resetOperationalPagination}
            page={operationalCursorStack.length}
            onPrevious={goToPreviousOperationalPage}
            onNext={goToNextOperationalPage}
            onPrimaryAction={(item) => runOperationalPrimaryAction(tab, item)}
            onViewDetails={(item) => void openOperationalDetails(item)}
            onIfoodOrderAction={(saleId, action) => ifoodOrderStatusMutation.mutate({ saleId, body: { action } })}
            onIfoodOrderCancel={(item) => void openIfoodCancellationDialog(item)}
            onSaleCancel={(item) => {
              const saleId = textValue(item.id, "");
              setConfirmAction({
                title: "Cancelar venda?",
                description: "A venda será marcada como cancelada e o estoque será devolvido quando aplicável.",
                confirmLabel: "Cancelar venda",
                tone: "danger",
                onConfirm: () => saleCancelMutation.mutate({ saleId, reason: "Cancelado pelo usuário no ERP" })
              });
            }}
            onPurchaseReceive={(item) => {
              const purchaseId = textValue(item.id, "");
              setConfirmAction({
                title: "Receber compra?",
                description: "Os itens desta compra entrarão no estoque do depósito informado.",
                confirmLabel: "Receber compra",
                onConfirm: () => purchaseReceiveMutation.mutate({ purchaseId })
              });
            }}
            onPurchaseCancel={(item) => {
              const purchaseId = textValue(item.id, "");
              setConfirmAction({
                title: "Cancelar compra?",
                description: "A compra será marcada como cancelada. Compras já recebidas não podem ser canceladas por este fluxo.",
                confirmLabel: "Cancelar compra",
                tone: "danger",
                onConfirm: () => purchaseCancelMutation.mutate({ purchaseId, reason: "Cancelado pelo usuário no ERP" })
              });
            }}
            onFinancialSettle={(item) => {
              const entryId = textValue(item.id, "");
              const amount = textValue(item.amount, "0");
              setConfirmAction({
                title: "Baixar conta?",
                description: "A conta será marcada como quitada.",
                confirmLabel: "Baixar conta",
                onConfirm: () => financialSettleMutation.mutate({ entryId, amount })
              });
            }}
            onFinancialCancel={(item) => {
              const entryId = textValue(item.id, "");
              setConfirmAction({
                title: "Cancelar conta financeira?",
                description: "A conta será removida das pendências financeiras e dos alertas.",
                confirmLabel: "Cancelar conta",
                tone: "danger",
                onConfirm: () => financialCancelMutation.mutate({ entryId, reason: "Cancelado pelo usuário no ERP" })
              });
            }}
            ifoodOrdersView={ifoodOrdersView}
            onIfoodOrdersViewChange={(view) => {
              setIfoodOrdersView(view);
              resetOperationalPagination();
            }}
            ifoodOrderStatusFilter={ifoodOrderStatusFilter}
            onIfoodOrderStatusFilterChange={(status) => {
              setIfoodOrderStatusFilter(status);
              resetOperationalPagination();
            }}
            operationalStatusFilter={operationalStatusFilter}
            onOperationalStatusFilterChange={(status) => {
              setOperationalStatusFilter(status);
              resetOperationalPagination();
            }}
            ifoodPendingQuery={ifoodPendingInsideOrdersQuery}
            isActionPending={isOperationalActionPending}
          />
        ) : null}
      </section>
      </div>
      <ConfirmDialog action={confirmAction} onClose={() => setConfirmAction(null)} />
      <IfoodOauthDialog
        state={ifoodOauthDialog}
        isSaving={ifoodOauthCompleteMutation.isPending}
        onClose={() => setIfoodOauthDialog(null)}
        onComplete={(authorizationCode) => {
          if (!ifoodOauthDialog) {
            return;
          }
          ifoodOauthCompleteMutation.mutate({ state: ifoodOauthDialog, authorizationCode });
        }}
      />
      <IfoodStockSettingsDialog
        state={ifoodStockSettingsDialog}
        isSaving={ifoodStockSettingsMutation.isPending}
        onClose={() => setIfoodStockSettingsDialog(null)}
        onSave={(input) => {
          const connectionId = textValue(asRecord(ifoodStockSettingsDialog?.connection)?.id, "");
          if (!connectionId) {
            return;
          }
          ifoodStockSettingsMutation.mutate({ connectionId, input });
        }}
      />
      <IfoodCancellationDialog
        state={ifoodCancellationDialog}
        isSaving={ifoodOrderStatusMutation.isPending}
        onClose={() => setIfoodCancellationDialog(null)}
        onConfirm={(reasonCode) => {
          if (!ifoodCancellationDialog) {
            return;
          }
          ifoodOrderStatusMutation.mutate({
            saleId: ifoodCancellationDialog.saleId,
            body: { action: "REQUEST_CANCELLATION", reasonCode }
          });
        }}
      />
      <IfoodCatalogLinkDialog
        state={ifoodCatalogLinkDialog}
        products={activeIfoodLinkProducts}
        categories={productCategoriesQuery.data?.data ?? []}
        isSaving={ifoodCatalogItemMutation.isPending}
        onClose={() => setIfoodCatalogLinkDialog(null)}
        onLink={(productId, saveCatalogMapping) => {
          if (!ifoodCatalogLinkDialog) {
            return;
          }
          ifoodCatalogItemMutation.mutate({
            item: ifoodCatalogLinkDialog.item,
            source: ifoodCatalogLinkDialog.source,
            mode: "link",
            productId,
            ...(saveCatalogMapping !== undefined ? { saveCatalogMapping } : {})
          });
        }}
        onCreate={(categoryId) => {
          if (!ifoodCatalogLinkDialog) {
            return;
          }
          ifoodCatalogItemMutation.mutate({ item: ifoodCatalogLinkDialog.item, source: ifoodCatalogLinkDialog.source, mode: "create", ...(categoryId ? { categoryId } : {}) });
        }}
      />
      {alert ? <SystemAlert alert={alert} onDismiss={dismissAlert} /> : null}
      <ProductCreateDialog
        open={productDialogOpen}
        categories={productCategoriesQuery.data?.data ?? []}
        warehouses={warehouseOptions}
        canManageFiscalProfile={canManageFiscalProfile}
        isSaving={createProductMutation.isPending}
        isCreatingCategory={categoryCreateMutation.isPending}
        onClose={() => setProductDialogOpen(false)}
        onCreateCategory={(name) => categoryCreateMutation.mutateAsync({ name })}
        onSave={(input) => createProductMutation.mutate(input)}
      />
      <ProductEditDialog
        product={editingProduct}
        categories={productCategoriesQuery.data?.data ?? []}
        isSaving={productUpdateMutation.isPending}
        onClose={() => setEditingProduct(null)}
        onSave={(input) => {
          if (!editingProduct) {
            return;
          }
          confirmProductUpdate(editingProduct, input);
        }}
      />
      <PurchaseCreateDialog
        open={Boolean(purchaseDialog?.open)}
        suppliers={purchaseSuppliersQuery.data?.data ?? []}
        products={(purchaseProductsQuery.data?.data ?? []).filter((product) => product.active)}
        warehouses={warehouseOptions}
        isSaving={createPurchaseMutation.isPending}
        onClose={() => setPurchaseDialog(null)}
        onSave={(input) => createPurchaseMutation.mutate(input)}
      />
      <DetailsDialog details={detailsDialog} pricingConfig={pricingConfig} onClose={() => setDetailsDialog(null)} />
      <UserAccessDialog
        user={selectedUser}
        roles={rolesQuery.data?.data ?? []}
        branches={branchesQuery.data?.data ?? []}
        isSaving={userAccessMutation.isPending}
        onClose={() => setSelectedUser(null)}
        onSave={(input) => {
          if (!selectedUser) {
            return;
          }
          userAccessMutation.mutate({ userId: selectedUser.id, ...input });
        }}
      />
      {isOperationalActionPending ? <BusyOverlay message={busyMessage} /> : null}
    </main>
  );
}

export default function Home() {
  const router = useRouter();
  const [session, setSession] = useState<StoredSession | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function restoreSession() {
      try {
        const refreshed = await refreshSession();
        const nextSession = {
          accessToken: refreshed.accessToken
        };

        if (!mounted) {
          return;
        }

        setSession(nextSession);
      } catch {
        if (mounted) {
          setSession(null);
        }
      } finally {
        if (mounted) {
          setSessionChecked(true);
        }
      }
    }

    void restoreSession();

    return () => {
      mounted = false;
    };
  }, []);

  function handleLoggedIn(response: LoginResponse) {
    const nextSession = {
      accessToken: response.accessToken
    };

    setSession(nextSession);
    router.push(tabRoutes.overview);
  }

  async function handleLogout() {
    const currentSession = session;
    setSession(null);

    if (!currentSession) {
      return;
    }

    try {
      await logoutSession(currentSession.accessToken);
    } catch {
      // A tela ja saiu da sessao local. O backend tambem valida tokens revogados nas proximas requisicoes.
    }
  }

  if (!sessionChecked) {
    return (
      <main className="grid min-h-screen place-items-center bg-background px-4">
        <div className="flex items-center gap-3 rounded-lg border border-border bg-white px-4 py-3 text-sm text-muted-foreground shadow-sm">
          <Loader2 aria-hidden="true" size={16} className="animate-spin text-emerald-700" />
          Carregando sua sessão...
        </div>
      </main>
    );
  }

  if (!session) {
    return <MarketingHome onLoggedIn={handleLoggedIn} />;
  }

  return <Dashboard accessToken={session.accessToken} onSessionChange={handleLoggedIn} onLogout={handleLogout} />;
}
