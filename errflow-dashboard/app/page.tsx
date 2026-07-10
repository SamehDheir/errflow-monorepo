import Link from "next/link"
import {
  ArrowRight,
  Bot,
  Check,
  GitBranch,
  GitPullRequest,
  Github,
  Layers,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { LandingNav } from "@/components/landing/landing-nav"
import { GetStartedButton } from "@/components/landing/get-started-button"

const GITHUB_URL = "https://github.com/SamehDheir/errflow"
const NPM_URL = "https://www.npmjs.com/package/errflow"

// Honest, product-accurate structured data. No fabricated ratings/user counts.
const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "errflow",
  applicationCategory: "DeveloperApplication",
  operatingSystem: "Node.js",
  description:
    "errflow captures runtime errors in your Node.js app, enriches them with stack, code and git context, then uses AI to generate a fix and open a pull request automatically.",
  url: "https://errflow.dev",
  softwareVersion: "1.0.0",
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  author: { "@type": "Person", name: "Sameh Dheir" },
  featureList: [
    "Automatic runtime error capture",
    "Rich context: stack frames, code snippets, git blame",
    "AI-generated fixes gated by confidence and existing tests",
    "Automatic pull requests",
    "Deduplication and severity scoring",
  ],
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <LandingNav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_0%,hsl(var(--primary)/0.12),transparent_70%)]"
        />
        <div className="container relative mx-auto max-w-5xl px-6 py-24 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-primary" />
            From uncaught error to open pull request
          </div>

          <h1 className="mx-auto max-w-3xl text-balance text-4xl font-bold leading-tight tracking-tight md:text-6xl">
            Your runtime errors, fixed by AI and{" "}
            <span className="text-primary">shipped as a pull request</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            errflow captures exceptions in your Node.js app, enriches them with stack
            frames, code snippets and git history, then has an AI generate a fix and open
            a PR for you to review — automatically.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <GetStartedButton />
            <Button asChild size="lg" variant="outline" className="h-11 px-6 text-base">
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                <Github className="mr-2 h-5 w-5" />
                View on GitHub
              </a>
            </Button>
          </div>

          <p className="mt-6 text-sm text-muted-foreground">
            Free tier included · No credit card required · MIT-licensed SDK
          </p>

          <div className="mx-auto mt-14 max-w-2xl">
            <Terminal />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" aria-labelledby="how-heading" className="border-t border-border bg-card py-24">
        <div className="container mx-auto max-w-6xl px-6">
          <SectionHeading
            id="how-heading"
            eyebrow="How it works"
            title="Four steps, zero babysitting"
            subtitle="Install the SDK once. errflow handles the rest of the pipeline on every error."
          />
          <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <StepCard
              step="1"
              icon={<Zap className="h-6 w-6" />}
              title="Capture"
              description="The SDK hooks uncaught exceptions and unhandled rejections — or capture manually with one call."
            />
            <StepCard
              step="2"
              icon={<Layers className="h-6 w-6" />}
              title="Enrich"
              description="Each error ships with stack frames, ±5 lines of code, git blame and the recent diff for the failing file."
            />
            <StepCard
              step="3"
              icon={<Bot className="h-6 w-6" />}
              title="AI fix"
              description="An AI proposes a fix. It only proceeds when confidence is high, the diff is small, and your existing tests still pass."
            />
            <StepCard
              step="4"
              icon={<GitPullRequest className="h-6 w-6" />}
              title="Pull request"
              description="A branch is created, the fix committed, and a PR opened on GitHub — with the root cause and explanation in the body."
            />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" aria-labelledby="features-heading" className="py-24">
        <div className="container mx-auto max-w-6xl px-6">
          <SectionHeading
            id="features-heading"
            eyebrow="Features"
            title="Built for real production debugging"
            subtitle="Everything the AI needs to understand — and safely fix — what broke."
          />
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Auto-capture"
              description="Catches uncaught exceptions and unhandled rejections out of the box, with a manual capture API for handled paths."
            />
            <FeatureCard
              icon={<Layers className="h-6 w-6" />}
              title="Rich context"
              description="Stack frames, surrounding code, git blame, recent diffs, breadcrumbs and request context — collected concurrently, never blocking your app."
            />
            <FeatureCard
              icon={<Bot className="h-6 w-6" />}
              title="Guarded AI fixes"
              description="Fixes become PRs only past a confidence threshold and changed-line limit, and only if your existing test suite still passes."
            />
            <FeatureCard
              icon={<GitBranch className="h-6 w-6" />}
              title="Automatic PRs"
              description="Every accepted fix lands as a reviewable GitHub pull request — you stay in control of what merges."
            />
            <FeatureCard
              icon={<ShieldCheck className="h-6 w-6" />}
              title="Secrets stay home"
              description="Collected code and diffs are scanned and redacted before they leave your machine, with a beforeSend hook for anything domain-specific."
            />
            <FeatureCard
              icon={<Sparkles className="h-6 w-6" />}
              title="Quiet by default"
              description="Deduplicates noisy errors, scores severity, and stays silent in your logs unless you turn on debug mode."
            />
          </div>
        </div>
      </section>

      {/* Quickstart */}
      <section id="quickstart" aria-labelledby="quickstart-heading" className="border-y border-border bg-card py-24">
        <div className="container mx-auto grid max-w-6xl items-center gap-12 px-6 lg:grid-cols-2">
          <div>
            <SectionHeading
              id="quickstart-heading"
              eyebrow="Quickstart"
              title="Two lines to start capturing"
              subtitle="Add the SDK, initialise with your API key, and you're live. The host app owns its own env — errflow never loads it for you."
              align="left"
            />
            <ul className="mt-8 space-y-3">
              {[
                "Dual ESM / CommonJS build — works anywhere Node 18+ runs",
                "TypeScript types included",
                "Fully async context collection — no event-loop blocking",
                "Silent by default; opt into debug logs when you need them",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-muted-foreground">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-4">
              <GetStartedButton label="Create your API key" />
              <Button asChild variant="outline" className="h-11 px-6 text-base">
                <a href={NPM_URL} target="_blank" rel="noopener noreferrer">
                  View on npm
                </a>
              </Button>
            </div>
          </div>
          <CodeSample />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" aria-labelledby="pricing-heading" className="py-24">
        <div className="container mx-auto max-w-6xl px-6">
          <SectionHeading
            id="pricing-heading"
            eyebrow="Pricing"
            title="Start free, scale when you need to"
            subtitle="The SDK is open source and MIT-licensed. Plans cover the hosted pipeline and auto-fix volume."
          />
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <PricingCard
              name="Free"
              price="$0"
              cadence="/month"
              description="For side projects and trying errflow out."
              features={["1 project", "10 auto-fixes / month", "Community support", "Full error context"]}
            />
            <PricingCard
              name="Pro"
              price="$29"
              cadence="/month"
              description="For teams shipping to production."
              features={[
                "5 projects",
                "500 auto-fixes / month",
                "Priority support",
                "Regression detection",
                "Email notifications",
              ]}
              popular
            />
            <PricingCard
              name="Enterprise"
              price="Custom"
              description="For organisations with scale and compliance needs."
              features={[
                "Unlimited projects",
                "Custom fix volume",
                "SSO & audit logs",
                "Dedicated support",
                "SLA",
              ]}
              cta="Contact sales"
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border bg-card py-24">
        <div className="container mx-auto max-w-3xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight md:text-4xl">
            Stop triaging. Start reviewing fixes.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Point errflow at your project and let the next production error arrive as a
            pull request instead of a pager alert.
          </p>
          <div className="mt-8 flex justify-center">
            <GetStartedButton />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}

function Terminal() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-foreground/[0.03] text-left shadow-sm dark:bg-white/[0.02]">
      <div className="flex items-center gap-1.5 border-b border-border px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-destructive/60" />
        <span className="h-3 w-3 rounded-full bg-yellow-400/60" />
        <span className="h-3 w-3 rounded-full bg-green-500/60" />
        <span className="ml-3 text-xs text-muted-foreground">errflow · pipeline</span>
      </div>
      <div className="space-y-1.5 p-5 font-mono text-sm">
        <p className="text-muted-foreground">$ node server.js</p>
        <p className="text-destructive">✗ TypeError: Cannot read properties of undefined (reading &apos;id&apos;)</p>
        <p className="text-muted-foreground">→ captured, enriched with git blame + code snippet</p>
        <p className="text-muted-foreground">→ AI fix generated · confidence 0.86 · 3 lines changed</p>
        <p className="text-muted-foreground">→ existing tests passed</p>
        <p className="text-primary">✓ opened PR #42: fix: guard against undefined user</p>
      </div>
    </div>
  )
}

function CodeSample() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background shadow-sm">
      <div className="border-b border-border px-4 py-2.5 font-mono text-xs text-muted-foreground">
        server.ts
      </div>
      <pre className="overflow-x-auto p-5 font-mono text-sm leading-relaxed">
        <code>
          <span className="text-muted-foreground">{"// npm install errflow"}</span>
          {"\n"}
          <span className="text-primary">import</span>
          {" { Errflow } "}
          <span className="text-primary">from</span>
          {" "}
          <span className="text-green-600 dark:text-green-400">&quot;errflow&quot;</span>
          {";\n\n"}
          {"Errflow."}
          <span className="text-accent">init</span>
          {"({\n  apiKey: process.env."}
          <span className="text-foreground">ERRFLOW_API_KEY</span>
          {"!,\n});\n\n"}
          <span className="text-muted-foreground">{"// uncaught errors are now captured,"}</span>
          {"\n"}
          <span className="text-muted-foreground">{"// enriched, and sent for an AI fix."}</span>
        </code>
      </pre>
    </div>
  )
}

function SectionHeading({
  id,
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  id?: string
  eyebrow: string
  title: string
  subtitle: string
  align?: "center" | "left"
}) {
  const alignment = align === "center" ? "text-center mx-auto" : "text-left"
  return (
    <div className={`max-w-2xl ${alignment}`}>
      <p className="text-sm font-semibold uppercase tracking-wide text-primary">{eyebrow}</p>
      <h2 id={id} className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p>
    </div>
  )
}

function StepCard({
  step,
  icon,
  title,
  description,
}: {
  step: string
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="relative rounded-2xl border border-border bg-background p-6">
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <span className="text-sm font-semibold text-muted-foreground">Step {step}</span>
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary/40">
      <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function PricingCard({
  name,
  price,
  cadence,
  description,
  features,
  cta = "Get started",
  popular,
}: {
  name: string
  price: string
  cadence?: string
  description: string
  features: string[]
  cta?: string
  popular?: boolean
}) {
  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-background p-8 ${
        popular ? "border-primary shadow-lg" : "border-border"
      }`}
    >
      {popular && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground">
          Most popular
        </span>
      )}
      <h3 className="text-lg font-semibold">{name}</h3>
      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-4xl font-bold tracking-tight">{price}</span>
        {cadence && <span className="text-muted-foreground">{cadence}</span>}
      </div>
      <p className="mt-3 text-sm text-muted-foreground">{description}</p>
      <ul className="mt-6 space-y-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-3 text-sm">
            <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>
      <div className="mt-8">
        {name === "Enterprise" ? (
          <Button asChild variant="outline" className="w-full">
            <a href="mailto:sameh.dheir1@gmail.com">{cta}</a>
          </Button>
        ) : (
          <Button asChild className="w-full" variant={popular ? "default" : "secondary"}>
            <Link href="/register">{cta}</Link>
          </Button>
        )}
      </div>
    </div>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border bg-background py-12">
      <div className="container mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-5 w-5 text-primary-foreground" />
            </span>
            <span className="text-lg font-bold">errflow</span>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#pricing" className="transition-colors hover:text-foreground">Pricing</a>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">GitHub</a>
            <a href={NPM_URL} target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">npm</a>
          </nav>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground transition-colors hover:text-foreground"
            aria-label="errflow on GitHub"
          >
            <Github className="h-5 w-5" />
          </a>
        </div>
        <div className="mt-8 border-t border-border pt-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} errflow · Built by Sameh Dheir · MIT-licensed SDK</p>
        </div>
      </div>
    </footer>
  )
}
