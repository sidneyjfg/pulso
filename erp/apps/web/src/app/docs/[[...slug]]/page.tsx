import { readFile } from "node:fs/promises";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { docPages, getDocPage, groupedDocPages } from "../../../docs/navigation";
import { renderMarkdoc } from "../../../docs/markdoc";
import { ThemeToggle } from "../../../docs/theme-toggle";

type DocsPageProps = {
  params: Promise<{ slug?: string[] }>;
};

export function generateStaticParams() {
  return docPages.map((page) => ({ slug: [page.slug] }));
}

export async function generateMetadata({ params }: DocsPageProps) {
  const { slug } = await params;
  const page = getDocPage(slug?.[0] ?? "overview");

  if (!page) {
    return { title: "Documentacao" };
  }

  return {
    title: `${page.title} | ERP Docs`,
    description: page.description
  };
}

export default async function DocsPage({ params }: DocsPageProps) {
  const { slug } = await params;
  const activeSlug = slug?.[0];

  if (!activeSlug) {
    redirect("/docs/overview");
  }

  const page = getDocPage(activeSlug);

  if (!page) {
    notFound();
  }

  const contentPath = path.join(process.cwd(), "src/docs/content", page.file);
  const source = await readFile(contentPath, "utf8");
  const grouped = groupedDocPages();
  const pageIndex = docPages.findIndex((item) => item.slug === page.slug);
  const previous = docPages[pageIndex - 1];
  const next = docPages[pageIndex + 1];

  return (
    <main className="min-h-screen bg-white text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="border-b border-border bg-white dark:bg-zinc-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link href="/" className="inline-flex rounded-lg bg-white px-2 py-1 ring-1 ring-border">
            <Image src="/brand/pulso-logo.webp" alt="Pulso ERP" width={256} height={71} sizes="128px" className="h-auto w-32" />
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/docs/overview" className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-zinc-50 dark:hover:bg-zinc-900">
              Docs
            </Link>
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-7xl grid-cols-1 lg:grid-cols-[260px_1fr]">
        <aside className="border-b border-border px-4 py-5 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto lg:border-b-0 lg:border-r">
          <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Documentacao</p>
          <nav className="space-y-6">
            {Object.entries(grouped).map(([group, pages]) => (
              <div key={group}>
                <p className="mb-2 text-xs font-semibold text-zinc-500 dark:text-zinc-400">{group}</p>
                <div className="grid gap-1">
                  {pages.map((item) => (
                    <Link
                      key={item.slug}
                      href={`/docs/${item.slug}`}
                      className={`rounded-md px-3 py-2 text-sm transition-colors ${
                        item.slug === page.slug
                          ? "bg-zinc-950 text-white dark:bg-zinc-50 dark:text-zinc-950"
                          : "text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
                      }`}
                    >
                      {item.title}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <article className="min-w-0 px-4 py-8 lg:px-10">
          <div className="mx-auto max-w-3xl">
            <div className="mb-8">
              <p className="mb-2 text-sm font-medium text-emerald-700">{page.group}</p>
              <h1 className="text-4xl font-semibold tracking-normal text-zinc-950 dark:text-zinc-50">{page.title}</h1>
              <p className="mt-3 text-base leading-7 text-muted-foreground">{page.description}</p>
            </div>

            <div className="docs-content">{renderMarkdoc(source)}</div>

            <div className="mt-10 grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
              {previous ? (
                <Link href={`/docs/${previous.slug}`} className="rounded-lg border border-border px-4 py-3 text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <span className="block text-muted-foreground">Anterior</span>
                  <span className="font-medium">{previous.title}</span>
                </Link>
              ) : (
                <div />
              )}
              {next ? (
                <Link href={`/docs/${next.slug}`} className="rounded-lg border border-border px-4 py-3 text-right text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900">
                  <span className="block text-muted-foreground">Proximo</span>
                  <span className="font-medium">{next.title}</span>
                </Link>
              ) : null}
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
