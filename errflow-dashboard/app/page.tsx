"use client"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { ArrowRight, Zap, Shield, GitBranch, Check, Star, Github, Twitter, Linkedin, Mail, LayoutDashboard, LogOut } from "lucide-react"
import Link from "next/link"
import { useEffect } from "react"
import { useSession, signOut } from "next-auth/react"

export default function LandingPage() {
  const { data: session, status } = useSession()

  useEffect(() => {
    // Add JSON-LD structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      "name": "errflow",
      "applicationCategory": "DeveloperApplication",
      "operatingSystem": "Web",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "description": "Lightweight, zero-dependency runtime error monitoring for Node.js applications. Capture exceptions, enrich with context, and ship to your dashboard.",
      "url": "https://errflow.dev",
      "author": {
        "@type": "Organization",
        "name": "errflow"
      },
      "aggregateRating": {
        "@type": "AggregateRating",
        "ratingValue": "4.9",
        "ratingCount": "10000"
      },
      "featureList": [
        "Real-time error capture",
        "Automatic deduplication",
        "Rich runtime context",
        "Zero dependencies",
        "TypeScript support"
      ]
    }

    const script = document.createElement('script')
    script.type = 'application/ld+json'
    script.text = JSON.stringify(structuredData)
    document.head.appendChild(script)

    return () => {
      document.head.removeChild(script)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-card">
      {/* Navigation */}
      <nav className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-[#EA4C48] rounded-lg flex items-center justify-center">
                <Zap className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">Errflow</span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition">Features</a>
              <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition">How it Works</a>
              <a href="#pricing" className="text-muted-foreground hover:text-foreground transition">Pricing</a>
              <ThemeToggle />
              {status === "loading" ? (
                <div className="flex items-center gap-3">
                  <div className="h-9 w-24 bg-muted animate-pulse rounded" />
                  <div className="h-9 w-32 bg-muted animate-pulse rounded" />
                </div>
              ) : session ? (
                <div className="flex items-center gap-3">
                  <Link href="/dashboard">
                    <Button variant="ghost" className="flex items-center bg-muted gap-2 hover:bg-card">
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Button>
                  </Link>
                  <Button variant="outline" className="flex items-center bg-muted gap-2 hover:bg-card" onClick={() => signOut({ callbackUrl: "/" })}>
                    <LogOut className="h-4 w-4 " />
                    Logout
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/login">
                    <Button variant="ghost" className="hover:bg-card">Sign In</Button>
                  </Link>
                  <Link href="/register">
                    <Button className="bg-[#EA4C48] hover:bg-[#d43d39]">Get Started</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-background to-card">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 bg-[#fde8e7] text-[#d43d39] px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Zap className="h-4 w-4" />
            <span>Lightweight Error Monitoring</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-bold text-foreground mb-6 leading-tight">
            Monitor Runtime Errors with Zero Dependencies
          </h1>
          <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            errflow captures exceptions, enriches them with runtime context, and ships them to your dashboard with automatic deduplication and retry logic.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {session ? (
              <Link href="/dashboard">
                <Button size="lg" className="bg-[#EA4C48] hover:bg-[#d43d39] text-lg px-8 py-6">
                  Go to Dashboard
                  <LayoutDashboard className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <>
                <Link href="/register">
                  <Button size="lg" className="bg-[#EA4C48] hover:bg-[#d43d39] text-lg px-8 py-6">
                    Get Started Free
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 border-2">
                  <Github className="mr-2 h-5 w-5" />
                  View on GitHub
                </Button>
              </>
            )}
          </div>
          <p className="text-muted-foreground mt-6 text-sm">No credit card required • 14-day free trial</p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-[#1C1A1B]">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-white mb-2">10K+</div>
              <div className="text-muted-foreground">Active Users</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">50M+</div>
              <div className="text-muted-foreground">Errors Captured</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">99.9%</div>
              <div className="text-muted-foreground">Uptime</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">4.9/5</div>
              <div className="text-muted-foreground">User Rating</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 bg-card">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">Powerful Features</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Everything you need for comprehensive error monitoring and debugging</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Zap className="h-8 w-8 text-[#EA4C48]" />}
              title="Auto-Capture"
              description="Automatically captures uncaught exceptions and unhandled rejections with zero configuration required."
            />
            <FeatureCard
              icon={<Shield className="h-8 w-8 text-[#EA4C48]" />}
              title="Smart Deduplication"
              description="Identical errors are throttled to prevent noise while ensuring critical issues are never missed."
            />
            <FeatureCard
              icon={<GitBranch className="h-8 w-8 text-[#EA4C48]" />}
              title="Rich Context"
              description="Every error includes Node version, platform, memory usage, and custom metadata for complete debugging context."
            />
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-24 px-6 bg-muted">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">How It Works</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Get started in minutes with our simple three-step process</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <StepCard
              step="1"
              title="Install Package"
              description="Add errflow to your Node.js project with npm install errflow - it's that simple."
            />
            <StepCard
              step="2"
              title="Initialize SDK"
              description="Configure your API key and let errflow automatically capture errors from your application."
            />
            <StepCard
              step="3"
              title="Monitor Dashboard"
              description="View enriched error data, track trends, and debug issues from your centralized dashboard."
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6 bg-muted">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-foreground mb-4">Simple Pricing</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">Choose the plan that fits your monitoring needs</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <PricingCard
              name="Starter"
              price="$0"
              description="Perfect for individual developers"
              features={[
                "1 Project",
                "10K Errors/month",
                "Community Support",
                "Basic Analytics"
              ]}
              cta="Start Free"
            />
            <PricingCard
              name="Pro"
              price="$29"
              description="For growing teams"
              features={[
                "5 Projects",
                "1M Errors/month",
                "Priority Support",
                "Advanced Analytics",
                "Custom Events"
              ]}
              cta="Get Started"
              popular
            />
            <PricingCard
              name="Enterprise"
              price="Custom"
              description="For large organizations"
              features={[
                "Unlimited Projects",
                "Unlimited Errors",
                "24/7 Support",
                "Custom Integrations",
                "SLA Guarantee",
                "Dedicated Account Manager"
              ]}
              cta="Contact Sales"
            />
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 px-6 bg-[#1C1A1B]">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-white mb-4">Loved by Developers</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">See what our users have to say about errflow</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <TestimonialCard
              name="Sarah Chen"
              role="Senior Developer at TechCorp"
              content="errflow has reduced our debugging time by 70%. The rich context and smart deduplication are game-changers."
              rating={5}
            />
            <TestimonialCard
              name="Marcus Johnson"
              role="CTO at StartupXYZ"
              content="The zero-dependency approach is perfect. Our monitoring overhead is virtually non-existent."
              rating={5}
            />
            <TestimonialCard
              name="Emily Rodriguez"
              role="Lead Engineer at DataFlow"
              content="Best error monitoring tool we've used. The automatic capture and retry logic work flawlessly."
              rating={5}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-r from-[#EA4C48] to-blue-600">
        <div className="container mx-auto text-center max-w-3xl">
          <h2 className="text-4xl font-bold text-white mb-6">Ready to Monitor Your Errors?</h2>
          <p className="text-xl text-[#fde8e7] mb-10">Join thousands of developers who trust errflow to keep their applications running smoothly</p>
          {session ? (
            <Link href="/dashboard">
              <Button size="lg" className="bg-white text-[#EA4C48] hover:bg-[#fef2f2] text-lg px-8 py-6">
                Go to Dashboard
                <LayoutDashboard className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          ) : (
            <Link href="/register">
              <Button size="lg" className="bg-white text-[#EA4C48] hover:bg-[#fef2f2] text-lg px-8 py-6">
                Start Your Free Trial
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1C1A1B] border-t border-border py-12 px-6">
        <div className="container mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 bg-[#EA4C48] rounded-lg flex items-center justify-center">
                  <Zap className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-white">errflow</span>
              </div>
              <p className="text-muted-foreground">Lightweight error monitoring for Node.js applications with zero dependencies.</p>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-muted-foreground hover:text-white transition">Features</a></li>
                <li><a href="#pricing" className="text-muted-foreground hover:text-white transition">Pricing</a></li>
                <li><a href="https://docs.errflow.dev" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-white transition">Documentation</a></li>
                <li><a href="https://github.com/errflow/errflow" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-white transition">Changelog</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Company</h3>
              <ul className="space-y-2">
                <li><a href="/about" className="text-muted-foreground hover:text-white transition">About</a></li>
                <li><a href="/blog" className="text-muted-foreground hover:text-white transition">Blog</a></li>
                <li><a href="/careers" className="text-muted-foreground hover:text-white transition">Careers</a></li>
                <li><a href="mailto:hello@errflow.dev" className="text-muted-foreground hover:text-white transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Connect</h3>
              <div className="flex gap-4">
                <a href="https://github.com/errflow/errflow" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-white transition">
                  <Github className="h-5 w-5" />
                </a>
                <a href="https://twitter.com/errflow_dev" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-white transition">
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="https://linkedin.com/company/errflow" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-white transition">
                  <Linkedin className="h-5 w-5" />
                </a>
                <a href="mailto:hello@errflow.dev" className="text-muted-foreground hover:text-white transition">
                  <Mail className="h-5 w-5" />
                </a>
              </div>
            </div>
          </div>
          <div className="border-t border-border pt-8 text-center text-muted-foreground">
            <p>&copy; 2026 errflow. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="bg-card p-8 rounded-2xl border border-border shadow-sm hover:shadow-md transition">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function StepCard({ step, title, description }: { step: string, title: string, description: string }) {
  return (
    <div className="text-center">
      <div className="h-16 w-16 bg-[#EA4C48] text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6">
        {step}
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-3">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  )
}

function PricingCard({ name, price, description, features, cta, popular }: {
  name: string,
  price: string,
  description: string,
  features: string[],
  cta: string,
  popular?: boolean
}) {
  return (
    <div className={`bg-card p-8 rounded-2xl border-2 ${popular ? 'border-[#EA4C48] shadow-lg' : 'border-border shadow-sm'} relative`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#EA4C48] text-white px-4 py-1 rounded-full text-sm font-medium">
          Most Popular
        </div>
      )}
      <h3 className="text-2xl font-bold text-foreground mb-2">{name}</h3>
      <div className="text-4xl font-bold text-foreground mb-2">{price}<span className="text-lg font-normal text-muted-foreground">{price !== "Custom" && "/month"}</span></div>
      <p className="text-muted-foreground mb-6">{description}</p>
      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center gap-3">
            <Check className="h-5 w-5 text-green-600 flex-shrink-0" />
            <span className="text-slate-700">{feature}</span>
          </li>
        ))}
      </ul>
      <Button className={`w-full ${popular ? 'bg-[#EA4C48] hover:bg-[#d43d39]' : 'bg-[#1C1A1B] hover:bg-slate-800'}`}>
        {cta}
      </Button>
    </div>
  )
}

function TestimonialCard({ name, role, content, rating }: {
  name: string,
  role: string,
  content: string,
  rating: number
}) {
  return (
    <div className="bg-card p-8 rounded-2xl">
      <div className="flex gap-1 mb-4">
        {[...Array(rating)].map((_, i) => (
          <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
        ))}
      </div>
      <p className="text-muted-foreground mb-6">{content}</p>
      <div>
        <div className="font-semibold text-white">{name}</div>
        <div className="text-muted-foreground text-sm">{role}</div>
      </div>
    </div>
  )
}
