import Markdoc, { type Config } from "@markdoc/markdoc";
import React, { type ReactNode } from "react";

function Callout({ title, tone = "info", children }: { title?: string; tone?: "info" | "warning" | "danger"; children: ReactNode }) {
  const styles = {
    info: "border-blue-200 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100",
    warning: "border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100",
    danger: "border-red-200 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100"
  };

  return (
    <aside className={`my-5 rounded-lg border px-4 py-3 text-sm ${styles[tone]}`}>
      {title ? <p className="mb-1 font-semibold">{title}</p> : null}
      <div className="space-y-2 leading-6">{children}</div>
    </aside>
  );
}

function Endpoint({ method, path, children }: { method: string; path: string; children: ReactNode }) {
  const methodTone = method === "GET" ? "bg-blue-600" : method === "POST" ? "bg-emerald-600" : method === "PUT" ? "bg-amber-600" : "bg-zinc-700";

  return (
    <section className="my-6 overflow-hidden rounded-lg border border-border bg-white dark:bg-zinc-950">
      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-zinc-50 px-4 py-3 dark:bg-zinc-900">
        <span className={`rounded px-2 py-1 text-xs font-semibold text-white ${methodTone}`}>{method}</span>
        <code className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{path}</code>
      </div>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

function Field({
  name,
  type,
  required = false,
  children
}: {
  name: string;
  type: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="my-3 rounded-lg border border-border bg-white px-4 py-3 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center gap-2">
        <code className="text-sm font-semibold">{name}</code>
        <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs text-muted-foreground dark:bg-zinc-900">{type}</span>
        {required ? <span className="rounded bg-red-50 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-200">obrigatorio</span> : null}
      </div>
      <div className="mt-2 text-sm leading-6 text-muted-foreground">{children}</div>
    </div>
  );
}

const markdocConfig: Config = {
  tags: {
    callout: {
      render: "Callout",
      attributes: {
        title: { type: String },
        tone: { type: String, default: "info" }
      }
    },
    endpoint: {
      render: "Endpoint",
      attributes: {
        method: { type: String, required: true },
        path: { type: String, required: true }
      }
    },
    field: {
      render: "Field",
      attributes: {
        name: { type: String, required: true },
        type: { type: String, required: true },
        required: { type: Boolean, default: false }
      }
    }
  }
};

export function renderMarkdoc(source: string) {
  const ast = Markdoc.parse(source);
  const content = Markdoc.transform(ast, markdocConfig);
  return Markdoc.renderers.react(content, React, {
    components: {
      Callout,
      Endpoint,
      Field
    }
  });
}
