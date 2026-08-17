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
  Check,
  ClipboardCheck,
  CreditCard,
  FileText,
  Gauge,
  Layers3,
  Landmark,
  Loader2,
  LogOut,
  Menu,
  PackageCheck,
  PackagePlus,
  Plug,
  ReceiptText,
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
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  createCategory,
  createBranch,
  getBranches,
  getCategories,
  getDashboard,
  getCustomers,
  getMe,
  getPaginatedResource,
  getProducts,
  getRoles,
  getSuppliers,
  getStockBalances,
  getUsers,
  getUserPreferences,
  login,
  logoutSession,
  register,
  refreshSession,
  updateCategoryActive,
  updateProductActive,
  switchContext,
  updateUserAccess,
  updateUserPreferences,
  type BranchListResponse,
  type CategoryListResponse,
  type DashboardResponse,
  type GenericListItem,
  type GenericListResponse,
  type LoginBody,
  type LoginResponse,
  type MeResponse,
  type PersonListResponse,
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
      title: "Segurança no backend",
      description: "Tenant, permissões e IDs sensíveis são validados no servidor. O frontend nunca é fonte de verdade."
    },
    {
      icon: Layers3,
      title: "Pronto para canais",
      description: "A base já nasce preparada para iFood, 99Food, PDV, e-commerce e marketplaces."
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
  | "payments"
  | "purchases"
  | "transfers"
  | "counts"
  | "fiscal"
  | "imports"
  | "integrations"
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

type ProductItem = ProductListResponse["data"][number];
type UserItem = UserListResponse["data"][number];

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

type OperationalTab = Exclude<DashboardTab, "overview" | "products" | "inventory" | "customers" | "suppliers" | "categories">;

type OperationalModuleConfig = {
  title: string;
  eyebrow: string;
  description: string;
  endpoint?: `/api/v1/${string}`;
  searchPlaceholder?: string;
  emptyMessage: string;
  primaryAction: string;
  actionTitle: string;
  actionDescription: string;
  status: "connected" | "foundation" | "planned";
};

const tabRoutes: Record<DashboardTab, string> = {
  overview: "/app/hoje",
  alerts: "/app/alertas",
  "global-search": "/app/busca",
  sales: "/app/vendas",
  payments: "/app/pagamentos",
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

function analyzePricing(product: ProductItem): PricingAnalysis {
  const salePrice = Number(product.branchPrices[0]?.salePrice ?? product.salePrice);
  const costPrice = Number(product.costPrice ?? 0);
  const taxPercent = 6;
  const feePercent = 3;
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
  const toneClass = {
    info: "border-emerald-200 bg-emerald-50 text-emerald-950",
    warning: "border-amber-200 bg-amber-50 text-amber-950",
    success: "border-emerald-200 bg-white text-slate-950"
  }[alert.tone];

  const iconClass = {
    info: "text-emerald-700",
    warning: "text-amber-600",
    success: "text-emerald-700"
  }[alert.tone];

  return (
    <aside className={`mb-4 flex gap-3 rounded-lg border px-4 py-3 shadow-sm ${toneClass}`} role="status" aria-live="polite">
      <AlertTriangle aria-hidden="true" size={18} className={`mt-0.5 shrink-0 ${iconClass}`} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{alert.title}</p>
        <p className="mt-1 text-sm leading-6 opacity-80">{alert.description}</p>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Fechar alerta"
        className="self-start rounded-md p-1 opacity-70 transition-[transform,background-color,opacity] duration-150 ease-[var(--ease-out)] hover:bg-white/60 hover:opacity-100 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
      >
        <X aria-hidden="true" size={16} />
      </button>
    </aside>
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

function PricingInsightDialog({ product, onClose }: { product: ProductItem | null; onClose: () => void }) {
  if (!product) {
    return null;
  }

  const analysis = analyzePricing(product);
  const statusContent = {
    good: {
      title: "Preço saudável",
      description: "A margem estimada está confortável para uma operação pequena.",
      className: "border-emerald-200 bg-emerald-50 text-emerald-800"
    },
    attention: {
      title: "Preço no limite",
      description: "A margem existe, mas pode apertar com perdas, descontos ou taxas maiores.",
      className: "border-amber-200 bg-amber-50 text-amber-800"
    },
    bad: {
      title: "Preço perigoso",
      description: "A margem estimada está baixa. Revise custo, preço de venda ou taxas.",
      className: "border-red-200 bg-red-50 text-red-700"
    },
    unknown: {
      title: "Informe o custo",
      description: "Sem custo de compra, o Pulso não consegue estimar lucro líquido.",
      className: "border-slate-200 bg-slate-50 text-slate-700"
    }
  }[analysis.status];

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/55 px-4 py-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="pricing-title">
      <section className="auth-card-enter w-full max-w-lg rounded-xl border border-white/20 bg-white p-5 text-slate-950 shadow-2xl shadow-slate-950/30">
        <div className="flex items-start gap-3">
          <LogoMark className="h-10 w-10" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Precificacao</p>
            <h2 id="pricing-title" className="mt-1 truncate text-xl font-semibold tracking-normal">{product.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{product.sku} · {product.unit}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar precificacao"
            className="rounded-md p-2 text-muted-foreground transition-[transform,background-color,color] duration-150 ease-[var(--ease-out)] hover:bg-slate-100 hover:text-slate-950 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
          >
            <X aria-hidden="true" size={18} />
          </button>
        </div>

        <div className={`mt-5 rounded-lg border p-4 ${statusContent.className}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold">{statusContent.title}</p>
              <p className="mt-1 text-sm leading-6 opacity-85">{statusContent.description}</p>
            </div>
            <p className="text-3xl font-semibold tabular-nums">{analysis.status === "unknown" ? "--" : `${analysis.netMargin.toFixed(1)}%`}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {[
            ["Preço de venda", money(analysis.salePrice)],
            ["Custo informado", analysis.costPrice ? money(analysis.costPrice) : "Sem custo"],
            [`Impostos estimados (${analysis.taxPercent}%)`, money(analysis.salePrice * (analysis.taxPercent / 100))],
            [`Taxas estimadas (${analysis.feePercent}%)`, money(analysis.salePrice * (analysis.feePercent / 100))],
            ["Lucro líquido estimado", analysis.status === "unknown" ? "Sem cálculo" : money(analysis.netProfit)],
            ["Markup sobre custo", analysis.status === "unknown" ? "Sem cálculo" : `${analysis.markup.toFixed(1)}%`]
          ].map(([label, value]) => (
            <article key={label} className="rounded-lg border border-border bg-slate-50 p-3">
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="mt-1 text-base font-semibold tabular-nums text-slate-950">{value}</p>
            </article>
          ))}
        </div>

        <p className="mt-4 text-xs leading-5 text-muted-foreground">
          Estimativa operacional: usa custo do produto, preço da loja, {analysis.taxPercent}% de impostos e {analysis.feePercent}% de taxas. Não substitui cálculo fiscal/contábil.
        </p>
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
  onNext
}: {
  title: string;
  description: string;
  emptyMessage: string;
  query: {
    data: PersonListResponse | undefined;
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
        {query.data?.data.map((person) => (
          <article key={person.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[1fr_150px_190px_130px] lg:items-center">
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
            <p className="text-sm text-muted-foreground">{new Date(person.createdAt).toLocaleDateString("pt-BR")}</p>
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
    actionDescription: "Alertas e regras já têm endpoints tenant-aware. O próximo passo é ligar o formulário visual de criação de regra.",
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
    actionDescription: "A busca já consulta o backend com limite de resultados. A próxima etapa é transformar isso em command palette.",
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
    actionDescription: "A API de venda já está pronta com baixa de estoque e idempotência. Falta conectar o formulário guiado completo.",
    status: "connected"
  },
  payments: {
    title: "Pagamentos",
    eyebrow: "Financeiro",
    description: "Base para acompanhar meios de pagamento ligados às vendas e conciliação futura.",
    endpoint: "/api/v1/sales",
    searchPlaceholder: "Buscar venda por cliente...",
    emptyMessage: "Nenhum pagamento encontrado nas vendas atuais.",
    primaryAction: "Conferir pagamentos",
    actionTitle: "Conferir pagamentos?",
    actionDescription: "Pagamentos já existem dentro das vendas. O próximo passo é uma visão dedicada com filtros por método e período.",
    status: "foundation"
  },
  purchases: {
    title: "Compras",
    eyebrow: "Reposição",
    description: "Pedidos de compra da loja ativa. Compra criada não altera estoque até ser recebida.",
    endpoint: "/api/v1/purchases",
    searchPlaceholder: "Buscar por fornecedor...",
    emptyMessage: "Nenhuma compra encontrada.",
    primaryAction: "Nova compra",
    actionTitle: "Criar compra?",
    actionDescription: "A API de compras já está pronta. O formulário final precisa selecionar fornecedor, depósito e itens.",
    status: "connected"
  },
  multistore: {
    title: "Dashboard multiloja",
    eyebrow: "Comparação",
    description: "Base para comparar lojas por vendas, estoque baixo e pendências sem misturar permissões.",
    endpoint: "/api/v1/branches",
    searchPlaceholder: "Buscar loja...",
    emptyMessage: "Nenhuma loja encontrada.",
    primaryAction: "Comparar lojas",
    actionTitle: "Comparar lojas?",
    actionDescription: "A listagem de lojas está conectada. Os indicadores comparativos entram quando os agregados por filial estiverem prontos.",
    status: "foundation"
  },
  transfers: {
    title: "Transferências",
    eyebrow: "Estoque",
    description: "Transferências entre depósitos e lojas, com status e recebimento controlado.",
    endpoint: "/api/v1/inventory/transfers",
    emptyMessage: "Nenhuma transferência encontrada.",
    primaryAction: "Nova transferência",
    actionTitle: "Criar transferência?",
    actionDescription: "A API já valida origem, destino, produtos e permissões. Falta o assistente visual de envio e recebimento.",
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
    actionDescription: "A API de inventário já existe. Falta conectar a tela de contagem produto a produto.",
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
    actionDescription: "Pendências e regras fiscais já têm API. A próxima etapa é o formulário completo por produto e regra versionada.",
    status: "connected"
  },
  imports: {
    title: "Migração",
    eyebrow: "Importação",
    description: "Base para CSV/XLSX com staging, mapeamento, validação, prévia e relatório de erros.",
    endpoint: "/api/v1/imports/jobs",
    searchPlaceholder: "Buscar arquivo ou origem...",
    emptyMessage: "Nenhum job de importação ainda.",
    primaryAction: "Preparar importação",
    actionTitle: "Preparar importação?",
    actionDescription: "Jobs de importação já são registrados no backend. Upload, staging detalhado e worker entram no fluxo completo.",
    status: "connected"
  },
  integrations: {
    title: "Integrações",
    eyebrow: "Canais",
    description: "Base para iFood, 99Food, marketplaces, PDV e e-commerce usando adapters e outbox.",
    endpoint: "/api/v1/integrations/connections",
    searchPlaceholder: "Buscar conta externa...",
    emptyMessage: "Nenhuma conexão configurada ainda.",
    primaryAction: "Nova conexão",
    actionTitle: "Criar conexão?",
    actionDescription: "Conexões por canal já são persistidas por empresa e loja. Credenciais reais continuam fora até ativar adapters seguros.",
    status: "connected"
  },
  reports: {
    title: "Relatórios",
    eyebrow: "Análise",
    description: "Base para relatórios paginados e exportações pesadas por worker.",
    endpoint: "/api/v1/reports/jobs",
    emptyMessage: "Nenhum relatório gerado ainda.",
    primaryAction: "Gerar relatório",
    actionTitle: "Gerar relatório?",
    actionDescription: "Jobs de relatório já são criados com filtros no backend. A execução pesada fica preparada para worker.",
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
    actionDescription: "A API já valida papel e filiais. O próximo passo é o formulário com escopo de permissão claro.",
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
    actionDescription: "Empresas, lojas e depósitos já possuem endpoints tenant-aware. Falta a tela agrupada para edição.",
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

function nestedName(item: GenericListItem, key: string, fallback = "Sem vínculo") {
  return textValue(asRecord(item[key])?.name, fallback);
}

function dateValue(value: unknown) {
  return typeof value === "string" ? new Date(value).toLocaleDateString("pt-BR") : "Sem data";
}

function itemSummary(tab: OperationalTab, item: GenericListItem) {
  const fiscalReasons = Array.isArray(item.reasons) ? item.reasons.length : 0;
  const itemCount = Array.isArray(item.items) ? item.items.length : 0;
  const paymentCount = Array.isArray(item.payments) ? item.payments.length : 0;

  switch (tab) {
    case "sales":
      return {
        title: `${money(textValue(item.total, "0"))} em venda`,
        subtitle: nestedName(item, "customer", "Cliente não informado"),
        meta: `${textValue(item.source, "MANUAL")} · ${dateValue(item.createdAt)}`,
        status: textValue(item.status)
      };
    case "payments":
      return {
        title: `${paymentCount} pagamento${paymentCount === 1 ? "" : "s"} na venda ${money(textValue(item.total, "0"))}`,
        subtitle: nestedName(item, "customer", "Cliente não informado"),
        meta: `${dateValue(item.createdAt)} · ${textValue(item.status)}`,
        status: paymentCount > 0 ? "Registrado" : "Sem pagamento"
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
    case "integrations":
      return {
        title: textValue(item.channel, "Canal"),
        subtitle: textValue(item.externalAccountId, "Conta externa ainda não informada"),
        meta: item.lastSyncAt ? `Última sincronização ${dateValue(item.lastSyncAt)}` : `Criada em ${dateValue(item.createdAt)}`,
        status: textValue(item.status, "Rascunho")
      };
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
  onPrimaryAction
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
  onPrimaryAction: () => void;
}) {
  const connected = config.status === "connected";
  const statusClass = connected
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : config.status === "foundation"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-slate-200 bg-slate-50 text-slate-600";
  const items = query.data?.data ?? [];
  const summary = query.data?.summary;

  return (
    <section className="rounded-lg border border-border bg-white">
      <div className="border-b border-border px-4 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">{config.eyebrow}</p>
              <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusClass}`}>
                {connected ? "Conectado" : config.status === "foundation" ? "Base pronta" : "Planejado"}
              </span>
            </div>
            <h2 className="mt-2 text-xl font-semibold tracking-normal text-slate-950">{config.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{config.description}</p>
          </div>

          <button
            type="button"
            onClick={onPrimaryAction}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white transition-[transform,background-color] duration-150 ease-[var(--ease-out)] hover:bg-slate-800 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
          >
            <ArrowRight aria-hidden="true" size={16} />
            {config.primaryAction}
          </button>
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
      </div>

      {config.endpoint ? (
        <>
          <div className="divide-y divide-border">
            {query.isLoading ? <p className="px-4 py-5 text-sm text-muted-foreground">Carregando {config.title.toLowerCase()}...</p> : null}
            {query.error ? <p className="px-4 py-5 text-sm text-red-600">{query.error.message}</p> : null}
            {items.map((item) => {
              const summaryItem = itemSummary(tab, item);
              return (
                <article key={item.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[1fr_180px_140px] lg:items-center">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <h3 className="truncate text-sm font-medium">{summaryItem.title}</h3>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{summaryItem.status}</span>
                    </div>
                    <p className="mt-1 truncate text-sm text-muted-foreground">{summaryItem.subtitle}</p>
                  </div>
                  <p className="truncate text-sm text-muted-foreground">{summaryItem.meta}</p>
                  <button
                    type="button"
                    onClick={onPrimaryAction}
                    className="inline-flex items-center justify-center rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-slate-950 transition-[transform,border-color,background-color] duration-150 ease-[var(--ease-out)] hover:border-emerald-200 hover:bg-emerald-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    Abrir fluxo
                  </button>
                </article>
              );
            })}
            {!query.isLoading && items.length === 0 ? <p className="px-4 py-5 text-sm text-muted-foreground">{config.emptyMessage}</p> : null}
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
        </>
      ) : (
        <div className="grid gap-3 p-4 md:grid-cols-3">
          {[
            ["1", "Modelar dados e permissões"],
            ["2", "Criar endpoints paginados"],
            ["3", "Conectar worker quando houver processamento pesado"]
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
  onOpenAction
}: {
  companyName: string;
  branchName: string;
  settings: SettingsState;
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
  onOpenAction: (title: string, description: string) => void;
}) {
  return (
    <div className="grid gap-4">
      <section className="electric-border electric-border-soft overflow-hidden rounded-lg border border-emerald-100 bg-white">
        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_280px] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Configuração ativa</p>
            <h2 className="mt-2 text-xl font-semibold tracking-normal text-slate-950">Empresa, loja e preferências do Pulso</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Ajuste o comportamento da tela sem misturar dados de outra empresa ou loja. Configurações sensíveis continuam dependendo do backend para valer na operação real.
            </p>
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
        <SettingsCard icon={Settings} title="Tela e experiência" description="Preferências que deixam o uso diário mais rápido e menos poluído.">
          <SettingsToggleRow title="Modo escuro" description="Prepara a interface para fundo escuro quando a paleta final estiver ativada." checked={settings.darkMode} onChange={(checked) => onToggle("darkMode", checked)} />
          <SettingsToggleRow title="Menu compacto ao navegar" description="Ao abrir uma seção, a lateral encolhe e o foco fica no conteúdo." checked={settings.compactMenu} onChange={(checked) => onToggle("compactMenu", checked)} />
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
            description="No backend de produção, vendas simultâneas não poderão baixar além do saldo permitido."
            checked={settings.blockNegativeStock}
            critical
            onChange={(checked) => onCriticalToggle("blockNegativeStock", checked, "Alterar regra de estoque negativo?", "Essa regra afeta vendas, importações e ajustes. Em produção ela deve ser salva por empresa, loja, depósito ou produto.")}
          />
          <SettingsToggleRow title="Alertar produto acabando" description="Mostra alertas claros quando saldo chegar perto do ponto de reposição." checked={settings.lowStockAlerts} onChange={(checked) => onToggle("lowStockAlerts", checked)} />
          <SettingsToggleRow title="Usar loja atual como filtro padrão" description="Listas de estoque, vendas e compras começam pela loja selecionada." checked={settings.currentBranchOnly} onChange={(checked) => onToggle("currentBranchOnly", checked)} />
        </SettingsCard>

        <SettingsCard icon={Plug} title="Fiscal e canais" description="Preparação para crescer sem espalhar regra fiscal ou integração pelo sistema.">
          <SettingsToggleRow title="Mostrar pendências fiscais" description="Produtos sem NCM, ICMS, PIS ou COFINS continuam visíveis sem travar o cadastro simples." checked={settings.showFiscalPending} onChange={(checked) => onToggle("showFiscalPending", checked)} />
          <SettingsToggleRow title="Preparar sincronização por canal" description="Mantém a estrutura de iFood, 99Food e outros canais visível quando houver conexão." checked={settings.prepareChannelSync} onChange={(checked) => onToggle("prepareChannelSync", checked)} />
          <div className="border-t border-border px-4 py-4">
            <button
              type="button"
              onClick={() => onOpenAction("Abrir configurações avançadas?", "As configurações avançadas devem salvar no backend com auditoria e permissões de administrador da empresa.")}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-slate-950 px-3 py-2 text-sm font-medium text-white transition-[transform,background-color] duration-150 ease-[var(--ease-out)] hover:bg-slate-800 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 sm:w-auto"
            >
              <Settings aria-hidden="true" size={16} />
              Configurações avançadas
            </button>
          </div>
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
  onEditUser
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
      { label: "Painel", icon: BarChart3, tab: "overview", status: "available" },
      { label: "Alertas", icon: Bell, tab: "alerts", status: "available" },
      { label: "Busca rápida", icon: Search, tab: "global-search", status: "available" }
    ]
  },
  {
    title: "Operação",
    items: [
      { label: "Vendas", icon: ShoppingCart, tab: "sales", status: "available" },
      { label: "Pagamentos", icon: CreditCard, tab: "payments", badge: "Base pronta", status: "foundation" },
      { label: "Compras", icon: ShoppingBag, tab: "purchases", status: "available" },
      { label: "Dashboard multiloja", icon: Store, tab: "multistore", badge: "Base pronta", status: "foundation" }
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
      { label: "Categorias", icon: Layers3, tab: "categories", status: "available" },
      { label: "Empresas e lojas", icon: Store, tab: "settings", status: "available" }
    ]
  },
  {
    title: "Crescimento",
    items: [
      { label: "Fiscal", icon: Landmark, tab: "fiscal", status: "available" },
      { label: "Migração", icon: Upload, tab: "imports", status: "available" },
      { label: "Integrações", icon: Plug, tab: "integrations", status: "available" },
      { label: "Relatórios", icon: ReceiptText, tab: "reports", status: "available" }
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

function AppSidebar({
  activeTab,
  onNavigate,
  onUnavailableItem,
  companyName,
  branchName,
  userName,
  branches,
  activeBranchId,
  isSwitchingBranch,
  onBranchChange,
  collapsed,
  onToggleCollapsed,
  onLogout
}: {
  activeTab: DashboardTab;
  onNavigate: () => void;
  onUnavailableItem: (item: SidebarItem) => void;
  companyName: string;
  branchName: string;
  userName: string;
  branches: BranchListResponse["data"];
  activeBranchId: string | undefined;
  isSwitchingBranch: boolean;
  onBranchChange: (branchId: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onLogout: () => void | Promise<void>;
}) {
  const [contextOpen, setContextOpen] = useState(false);

  return (
    <aside
      className={`relative z-40 hidden h-screen shrink-0 border-r border-emerald-100 bg-white shadow-[18px_0_60px_rgba(15,23,42,0.06)] transition-[width] duration-300 ease-[var(--ease-out)] lg:sticky lg:top-0 lg:flex lg:flex-col ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      <div className={`border-b border-border p-4 ${collapsed ? "px-3" : ""}`}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "justify-between gap-3"}`}>
          {collapsed ? <BrandMark compact /> : <BrandMark />}
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expandir menu lateral" : "Encolher menu lateral"}
            className="hidden rounded-md border border-border bg-white p-2 text-slate-700 transition-[transform,border-color,background-color,color] duration-150 ease-[var(--ease-out)] hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 lg:inline-flex"
          >
            {collapsed ? <ChevronRight aria-hidden="true" size={16} /> : <ChevronLeft aria-hidden="true" size={16} />}
          </button>
        </div>
        <button
          type="button"
          aria-label={`Contexto atual: ${companyName}, ${branchName}`}
          onClick={() => setContextOpen((value) => !value)}
          className={`electric-border electric-border-soft mt-4 flex w-full items-center rounded-lg border border-emerald-100 bg-slate-50 text-left transition-[transform,border-color,background-color] duration-150 ease-[var(--ease-out)] hover:border-emerald-200 hover:bg-emerald-50/50 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
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
                    branch.id === activeBranchId ? "bg-emerald-50 font-medium text-emerald-700" : "text-slate-700 hover:bg-slate-50"
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

      <nav aria-label="Módulos do ERP" className={`app-sidebar-scroll min-h-0 flex-1 overflow-y-auto py-4 ${collapsed ? "px-2" : "px-3"}`}>
        {!collapsed ? (
          <div className="mb-4 rounded-lg border border-border bg-slate-50 px-3 py-2 text-xs leading-5 text-muted-foreground">
            <p><span className="font-semibold text-slate-950">Disponível:</span> abre tela agora.</p>
            <p><span className="font-semibold text-amber-700">Base pronta:</span> backend existe, tela ainda não.</p>
            <p><span className="font-semibold text-slate-500">Em breve:</span> planejado.</p>
          </div>
        ) : null}
        <div className={collapsed ? "grid gap-3" : "grid gap-5"}>
          {sidebarGroups.map((group) => (
            <section key={group.title}>
              {!collapsed ? <h2 className="px-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{group.title}</h2> : null}
              <div className="mt-2 grid gap-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = item.tab === activeTab;
                  const href = item.href ?? (item.tab ? tabRoutes[item.tab] : undefined);
                  const available = item.status === "available";
                  const foundation = item.status === "foundation";
                  const statusLabel = available ? "Disponível" : foundation ? "Base pronta, tela em breve" : "Em breve";
                  const badgeClass = foundation
                    ? "bg-amber-50 text-amber-700"
                    : item.status === "soon"
                      ? "bg-slate-100 text-slate-500"
                      : "bg-emerald-50 text-emerald-700";
                  const itemClassName = `relative flex w-full items-center rounded-md text-left text-sm transition-[transform,background-color,color] duration-150 ease-[var(--ease-out)] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                        collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-2.5 py-2"
                      } ${
                        active
                          ? "bg-emerald-600 font-medium text-white"
                          : available
                            ? "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                            : foundation
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
                      <Link
                        key={item.label}
                        href={href}
                        title={collapsed ? `${item.label} - ${statusLabel}` : statusLabel}
                        aria-label={collapsed ? `${item.label} - ${statusLabel}` : undefined}
                        onClick={onNavigate}
                        className={itemClassName}
                      >
                        {itemContent}
                      </Link>
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
        <div className={`rounded-lg bg-slate-50 p-3 ${collapsed ? "grid justify-items-center gap-2" : "flex items-center gap-3"}`}>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white">
            {userName.slice(0, 1).toUpperCase()}
          </div>
          {collapsed ? (
            <button
              type="button"
              onClick={onLogout}
              aria-label="Sair"
              title="Sair"
              className="rounded-md p-2 text-muted-foreground transition-[transform,background-color,color] duration-150 ease-[var(--ease-out)] hover:bg-white hover:text-slate-950 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <LogOut aria-hidden="true" size={16} />
            </button>
          ) : (
            <>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-950">{userName}</p>
                <p className="truncate text-xs text-muted-foreground">Conta da empresa</p>
              </div>
              <button
                type="button"
                onClick={onLogout}
                aria-label="Sair"
                className="rounded-md p-2 text-muted-foreground transition-[transform,background-color,color] duration-150 ease-[var(--ease-out)] hover:bg-white hover:text-slate-950 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <LogOut aria-hidden="true" size={16} />
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );
}

function Dashboard({ accessToken, onSessionChange, onLogout }: { accessToken: string; onSessionChange: (session: LoginResponse) => void; onLogout: () => void | Promise<void> }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const contentFocusRef = useRef<HTMLElement>(null);
  const tab = tabFromPathname(pathname);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [alert, setAlert] = useState<AppAlert | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [pricingProduct, setPricingProduct] = useState<ProductItem | null>(null);
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
  const [operationalLimit, setOperationalLimit] = useState(10);
  const [operationalCursorStack, setOperationalCursorStack] = useState<Array<string | null>>([null]);
  const [operationalSearchDraft, setOperationalSearchDraft] = useState("");
  const [operationalSearch, setOperationalSearch] = useState("");
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
    queryKey: ["products", accessToken, productLimit, productCursor],
    queryFn: () => getProducts(accessToken, { limit: productLimit, cursor: productCursor }),
    enabled: tab === "products"
  });
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
  const categoriesQuery = useQuery<CategoryListResponse>({
    queryKey: ["categories", accessToken, categoryLimit, categoryCursor, categorySearch],
    queryFn: () => getCategories(accessToken, { limit: categoryLimit, cursor: categoryCursor, search: categorySearch }),
    enabled: tab === "categories"
  });
  const preferencesQuery = useQuery({
    queryKey: ["settings-preferences", accessToken],
    queryFn: () => getUserPreferences(accessToken)
  });
  const branchesQuery = useQuery<BranchListResponse>({
    queryKey: ["branches", accessToken],
    queryFn: () => getBranches(accessToken, { limit: 100 })
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
  const operationalQuery = useQuery<GenericListResponse, Error>({
    queryKey: ["operational-module", accessToken, tab, operationalLimit, operationalCursor, operationalSearch],
    queryFn: () =>
      getPaginatedResource(accessToken, operationalConfig!.endpoint!, {
        limit: operationalLimit,
        cursor: operationalCursor,
        search: operationalSearch
      }),
    enabled: Boolean(operationalConfig?.endpoint)
  });
  const dashboardQuery = useQuery<DashboardResponse>({
    queryKey: ["dashboard", accessToken],
    queryFn: () => getDashboard(accessToken),
    enabled: tab === "overview"
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
        description: "O contexto ativo foi validado no backend antes da troca."
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
        description: "Perfil e lojas permitidas foram atualizados com auditoria."
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
  const categoryCreateMutation = useMutation({
    mutationFn: ({ name }: { name: string }) => createCategory(accessToken, { name }),
    onSuccess: async () => {
      setNewCategoryName("");
      setCategoryCursorStack([null]);
      await queryClient.invalidateQueries({ queryKey: ["categories", accessToken] });
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

  const activeContext = useMemo(() => {
    const data = meQuery.data;
    const company = data?.user.companyAccesses.find((item) => item.company.id === data.tenant.companyId)?.company;
    const branch = data?.user.branchAccesses.find((item) => item.branch.id === data.tenant.branchId)?.branch;
    return { company, branch };
  }, [meQuery.data]);

  const companyName = activeContext.company?.tradeName ?? activeContext.company?.legalName ?? "Minha empresa";
  const branchName = activeContext.branch?.name ?? "Minha loja";
  const userName = meQuery.data?.user.name ?? "Usuário";

  useEffect(() => {
    if (!preferencesQuery.data) {
      return;
    }

    setSettingsState((current) => ({ ...current, ...preferencesQuery.data }));
  }, [preferencesQuery.data]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settingsState.darkMode);
  }, [settingsState.darkMode]);

  const focusContentAfterNavigation = useCallback(() => {
    setSidebarCollapsed(settingsState.compactMenu);
    setOperationalCursorStack([null]);
    setOperationalSearchDraft("");
    setOperationalSearch("");
    window.requestAnimationFrame(() => {
      contentFocusRef.current?.focus();
    });
  }, [settingsState.compactMenu]);

  useEffect(() => {
    if (pathname === "/") {
      router.replace(tabRoutes.overview);
      return;
    }

    focusContentAfterNavigation();
  }, [focusContentAfterNavigation, pathname, router]);

  function showUnavailableItem(item: SidebarItem) {
    if (item.status === "foundation") {
      setAlert({
        tone: "warning",
        title: `${item.label} ainda não tem tela.`,
        description: "A base de backend ja existe, mas a interface dessa area ainda sera montada. Use os modulos marcados como Disponivel por enquanto."
      });
      return;
    }

    setAlert({
      tone: "info",
      title: `${item.label} esta no roadmap.`,
      description: "Esse modulo esta planejado para uma proxima etapa e ainda nao possui tela ou fluxo operacional."
    });
  }

  function confirmImportantAction(title: string, description: string) {
    setConfirmAction({
      title,
      description,
      confirmLabel: "Entendi",
      onConfirm: () => {
        setAlert({
          tone: "info",
          title: "Fluxo ainda nao conectado.",
          description: "A confirmacao ja esta pronta. A proxima etapa e ligar essa acao ao endpoint correspondente quando a tela operacional for implementada."
        });
      }
    });
  }

  function toggleSetting(key: keyof SettingsState, checked: boolean) {
    setSettingsState((current) => ({ ...current, [key]: checked }));
    if (key === "compactMenu") {
      setSidebarCollapsed(checked);
    }
    preferencesMutation.mutate({ [key]: checked });
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

  function resetProductPagination(limit: number) {
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

  return (
    <main id="main" className="flex min-h-screen bg-background">
      <AppSidebar
        activeTab={tab}
        onNavigate={focusContentAfterNavigation}
        onUnavailableItem={showUnavailableItem}
        companyName={companyName}
        branchName={branchName}
        userName={userName}
        branches={branchesQuery.data?.data ?? []}
        activeBranchId={meQuery.data?.tenant.branchId}
        isSwitchingBranch={switchBranchMutation.isPending}
        onBranchChange={(branchId) => switchBranchMutation.mutate(branchId)}
        collapsed={sidebarCollapsed}
        onToggleCollapsed={() => setSidebarCollapsed((value) => !value)}
        onLogout={() =>
          setConfirmAction({
            title: "Sair da conta?",
            description: "Voce voltara para a landing page e a sessao atual sera revogada no backend.",
            confirmLabel: "Sair",
            tone: "danger",
            onConfirm: onLogout
          })
        }
      />

      <div
        className={`relative min-w-0 flex-1 transition-[background-color,filter] duration-300 ease-[var(--ease-out)] ${
          sidebarCollapsed ? "bg-background" : "bg-slate-100/70"
        }`}
      >
        <div
          aria-hidden="true"
          className={`pointer-events-none fixed inset-y-0 right-0 z-30 hidden bg-slate-950/5 backdrop-grayscale transition-opacity duration-300 ease-[var(--ease-out)] lg:block ${
            sidebarCollapsed ? "opacity-0" : "opacity-100"
          }`}
          style={{ left: sidebarCollapsed ? "5rem" : "18rem" }}
        />
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
                  description: "Voce voltara para a landing page e a sessao atual sera revogada no backend.",
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

      <section ref={contentFocusRef} tabIndex={-1} className="mx-auto max-w-7xl px-4 py-6 outline-none">
        {alert ? <SystemAlert alert={alert} onDismiss={() => setAlert(null)} /> : null}
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
              onClick={() => confirmImportantAction("Criar nova venda?", "Venda concluida reduz estoque e gera historico. Como a tela de venda ainda nao esta pronta, a acao fica protegida por confirmacao.")}
              className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <ShoppingCart aria-hidden="true" size={16} />
              Nova venda
            </button>
            <button
              type="button"
              onClick={() => confirmImportantAction("Criar novo produto?", "Cadastrar produto afeta precos, estoque e pendencias fiscais. A tela de cadastro completo sera conectada em seguida.")}
              className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
            >
              <PackagePlus aria-hidden="true" size={16} />
              Novo produto
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-border bg-white px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">Tela atual</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {sidebarGroups.flatMap((group) => group.items).find((item) => item.tab === tab)?.label ?? "Painel"}
          </p>
        </div>

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
                  {dashboardQuery.data?.attention.map((item) => (
                    <article key={item.title} className="flex min-w-0 items-start gap-3 px-4 py-4">
                      <AlertTriangle aria-hidden="true" size={18} className={item.type === "OUT_OF_STOCK" ? "mt-0.5 text-red-600" : "mt-0.5 text-amber-500"} />
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-medium">{item.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                      </div>
                      <button type="button" className="rounded-md border border-border px-3 py-2 text-sm font-medium transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500">
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
                    onClick={() => confirmImportantAction("Registrar entrada de estoque?", "Entrada de estoque altera saldo e deve gerar StockMovement. A confirmacao evita ajuste acidental.")}
                    className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-left text-sm transition-transform duration-150 ease-[var(--ease-out)] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    <Box aria-hidden="true" size={16} />
                    Entrada de estoque
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmImportantAction("Transferir estoque?", "Transferencia movimenta origem e destino. O fluxo final deve validar loja, deposito e permissao antes de gravar.")}
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
            <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">Produtos</h2>
                <p className="text-sm text-muted-foreground">Pagina {productCursorStack.length}. Mostrando ate {productLimit} por tela.</p>
              </div>
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
            <div className="divide-y divide-border">
              {productsQuery.isLoading ? <p className="px-4 py-5 text-sm text-muted-foreground">Carregando produtos...</p> : null}
              {productsQuery.data?.data.map((product) => (
                <article key={product.id} className="grid gap-3 px-4 py-4 sm:grid-cols-[1fr_120px_120px_120px_150px] sm:items-center">
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <h3 className="truncate text-sm font-medium">{product.name}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${product.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {product.active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {product.sku} · {product.category?.name ?? "Sem categoria"}
                    </p>
                  </div>
                  <p className="text-sm text-muted-foreground">{product.barcodes[0]?.barcode ?? "Sem EAN"}</p>
                  <p className="text-sm font-medium tabular-nums">{money(product.branchPrices[0]?.salePrice ?? product.salePrice)}</p>
                  <button
                    type="button"
                    onClick={() => setPricingProduct(product)}
                    className="inline-flex items-center justify-center rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-slate-950 transition-[transform,border-color,background-color] duration-150 ease-[var(--ease-out)] hover:border-emerald-200 hover:bg-emerald-50 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    Ver margem
                  </button>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="text-xs text-muted-foreground sm:hidden">Disponivel</span>
                    <ModernSwitch
                      checked={product.active}
                      disabled={productStatusMutation.isPending}
                      label={product.active ? `Desativar ${product.name}` : `Ativar ${product.name}`}
                      onCheckedChange={(checked) => confirmProductStatus(product, checked)}
                    />
                  </div>
                </article>
              ))}
              {productsQuery.data?.data.length === 0 ? <p className="px-4 py-5 text-sm text-muted-foreground">Nenhum produto encontrado.</p> : null}
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
            onOpenAction={confirmImportantAction}
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
          />
        ) : null}

        {operationalConfig && isOperationalTab(tab) ? (
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
            onPrimaryAction={() => confirmImportantAction(operationalConfig.actionTitle, operationalConfig.actionDescription)}
          />
        ) : null}
      </section>
      </div>
      <ConfirmDialog action={confirmAction} onClose={() => setConfirmAction(null)} />
      <PricingInsightDialog product={pricingProduct} onClose={() => setPricingProduct(null)} />
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
