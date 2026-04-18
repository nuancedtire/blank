import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadiantPromptInput } from "@/components/ui/radiant-input";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  Brain,
  Clock,
  Stethoscope,
  Shield,
  Activity,
  FileText,
  ChevronRight,
  Search,
  Zap,
} from "lucide-react";
import { AideLogo } from "@/components/ui/aide-logo";
import { useState } from "react";

export const Route = createFileRoute("/")({
  beforeLoad: ({ context }) => {
    if (context.isAuthenticated) {
      throw redirect({ to: "/search", search: { threadId: undefined } });
    }
  },
  component: LandingPage,
});

const QUICK_ACTIONS = [
  { label: "Sepsis Protocol", icon: Activity },
  { label: "Chest Pain Guide", icon: Stethoscope },
  { label: "Stroke Pathway", icon: Brain },
  { label: "Trauma Assessment", icon: Shield },
];

const FEATURE_HIGHLIGHTS = [
  {
    value: "Local Guidance First",
    label: "Hospital protocols are searched before broader web sources.",
  },
  {
    value: "Citations Included",
    label: "Every response points back to the underlying guideline text.",
  },
  {
    value: "Built for ED Pace",
    label: "Fast retrieval when time pressure is high.",
  },
];

const FEATURE_BENTO_CARDS = [
  {
    icon: Search,
    title: "Natural language input",
    description:
      "Type questions the way clinicians actually speak. No rigid command syntax required.",
    tone: "from-primary/15 to-secondary/20",
  },
  {
    icon: Brain,
    title: "Evidence-aware answers",
    description:
      "Responses are generated from retrieved guidance, with source context preserved.",
    tone: "from-accent/15 to-accent/5",
  },
  {
    icon: Clock,
    title: "Always current",
    description:
      "Keep local protocols updated while still drawing from NICE and RCEM when needed.",
    tone: "from-secondary/15 to-primary/10",
  },
  {
    icon: Shield,
    title: "Clinically defensible",
    description:
      "Teams can validate each recommendation quickly because sources remain visible.",
    tone: "from-primary/10 to-accent/10",
  },
  {
    icon: Zap,
    title: "Fast when it matters",
    description:
      "Retrieve the right section quickly during triage and escalation moments.",
    tone: "from-accent/20 to-secondary/10",
  },
  {
    icon: FileText,
    title: "Full document access",
    description:
      "Move from summary to full guideline in one tap when deeper review is needed.",
    tone: "from-primary/10 to-secondary/10",
  },
];

const WORKFLOW_STEPS = [
  {
    step: "01",
    phase: "Input",
    title: "Type naturally",
    description:
      "Enter the clinical question in plain language exactly how you would ask it on shift.",
    icon: Search,
  },
  {
    step: "02",
    phase: "Retrieval",
    title: "Search and retrieval runs",
    description:
      "The system searches local guidance first, then NICE/RCEM sources where relevant.",
    icon: Brain,
  },
  {
    step: "03",
    phase: "Optional AI Agent",
    title: "Continue with the AI agent",
    description:
      "For deeper follow-up, chat with the AI agent to keep searching and retrieving for you.",
    icon: FileText,
  },
];

function LandingPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (query: string) => {
    window.location.href = `/login?redirect=/search&q=${encodeURIComponent(query)}`;
  };

  const navCtaClass =
    "h-9 px-4 rounded-md font-medium transition-all duration-200 !bg-primary !text-primary-foreground hover:!bg-primary/90 hover:shadow-lg hover:shadow-primary/20";
  const primaryCtaClass =
    "h-12 px-8 rounded-xl font-semibold transition-all duration-200 !bg-white !text-primary hover:!bg-white/90 hover:shadow-2xl hover:shadow-black/15 dark:!bg-card dark:!text-primary dark:hover:!bg-card/90";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-card to-background relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, oklch(0.65 0.15 195 / 0.2) 0%, transparent 70%)",
            filter: "blur(80px)",
          }}
        />
        <div
          className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-20"
          style={{
            background:
              "radial-gradient(circle, oklch(0.7 0.17 155 / 0.2) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />

        {/* Subtle Grid */}
        <div
          className="absolute inset-0 opacity-[0.3]"
          style={{
            backgroundImage: `linear-gradient(oklch(0.65 0.15 195 / 0.5) 1px, transparent 1px),
              linear-gradient(90deg, oklch(0.65 0.15 195 / 0.5) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 w-full px-6 lg:px-12 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/">
            <AideLogo size="lg" animate="hover" />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle variant="ghost" size="sm" />
            <Button asChild className={navCtaClass}>
              <Link to="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Search Focused */}
      <section className="relative z-10 px-6 lg:px-12 pt-12 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground leading-[1.1] tracking-tight mb-6 animate-slide-up">
            Find Protocols{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              in Seconds
            </span>
          </h1>

          <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto mb-10 animate-slide-up stagger-1">
            Instant access to Emergency Department guidelines. Ask naturally,
            get accurate answers backed by your uploaded local protocols, with
            optional NICE/RCEM web lookup.
          </p>

          {/* Radiant Search Input */}
          <div className="mb-8 animate-slide-up stagger-2">
            <RadiantPromptInput
              placeholder="Ask about any protocol, e.g., 'Acute coronary syndrome workup'..."
              value={searchQuery}
              onChange={setSearchQuery}
              onSubmit={handleSearch}
              className="w-full"
            />
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-12 animate-fade-in stagger-3">
            <span className="text-sm text-muted-foreground">Popular:</span>
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => handleSearch(action.label)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card border border-border text-sm text-foreground hover:border-primary hover:bg-background transition-all cursor-pointer shadow-sm"
              >
                <action.icon className="w-3.5 h-3.5 text-primary" />
                {action.label}
              </button>
            ))}
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto animate-fade-in stagger-4">
            {[
              { value: "500+", label: "Guidelines" },
              { value: "< 2s", label: "Avg Response" },
              { value: "50K+", label: "Daily Queries" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-2xl sm:text-3xl font-bold text-primary">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-muted-foreground">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="relative z-10 px-6 lg:px-12 py-12 border-y border-border/50 bg-card/50">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-sm text-muted-foreground mb-6">
            Trusted by Emergency Departments across the UK
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
            {["NHS Trusts", "Local Protocols", "NICE Web", "RCEM Web"].map(
              (org) => (
                <div key={org} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-sm font-medium text-foreground">
                    {org}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* Feature Studio Section */}
      <section className="relative z-10 px-6 lg:px-12 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
              Why ED Guidelines?
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
              Built for High-Pressure Environments
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-muted-foreground">
              Real-world ED workflow support: local guidance first, cited
              retrieval, and optional AI-agent follow-up when you need deeper
              search.
            </p>
          </div>

          <div className="relative space-y-5">
            <div className="pointer-events-none absolute -inset-6 bg-gradient-to-r from-primary/8 via-transparent to-accent/10 blur-3xl" />
            <div className="relative grid grid-cols-1 gap-5 lg:grid-cols-12">
              <article className="group relative overflow-hidden rounded-3xl border border-border/70 bg-card/85 p-6 sm:p-8 lg:col-span-7 shadow-[0_20px_45px_-34px_rgba(8,145,178,0.95)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_30px_65px_-38px_rgba(8,145,178,0.95)]">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/12 via-transparent to-accent/12" />
                <div className="absolute -top-20 right-0 h-56 w-56 rounded-full bg-primary/15 blur-3xl" />
                <Activity className="pointer-events-none absolute -bottom-16 -right-14 h-64 w-64 text-primary/8" />
                <div className="relative z-10">
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    Clinical Response Engine
                  </div>
                  <h3 className="mt-4 text-2xl sm:text-3xl font-bold text-foreground leading-tight">
                    Ask naturally, retrieve reliably, and escalate to an AI
                    agent only when you want more.
                  </h3>
                  <p className="mt-4 max-w-2xl text-muted-foreground leading-relaxed">
                    The app supports direct search and guided AI assistance in
                    the same flow, so clinicians can move from initial query to
                    validated action without context switching.
                  </p>

                  <div className="mt-8 grid gap-3 sm:grid-cols-3">
                    {FEATURE_HIGHLIGHTS.map((highlight) => (
                      <div
                        key={highlight.value}
                        className="rounded-2xl border border-border/70 bg-background/70 p-4"
                      >
                        <p className="text-sm font-bold text-primary">
                          {highlight.value}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {highlight.label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </article>

              <div className="grid gap-5 sm:grid-cols-2 lg:col-span-5">
                {FEATURE_BENTO_CARDS.slice(0, 4).map((feature) => (
                  <article
                    key={feature.title}
                    className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-5 shadow-[0_16px_36px_-30px_rgba(8,145,178,0.8)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_28px_52px_-34px_rgba(8,145,178,0.85)]"
                  >
                    <div
                      className={`absolute inset-0 bg-gradient-to-br ${feature.tone}`}
                    />
                    <feature.icon className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 text-foreground/[0.05] transition-all duration-300 group-hover:scale-105 group-hover:text-primary/[0.10]" />
                    <div className="relative">
                      <h3 className="text-lg font-bold text-foreground">
                        {feature.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURE_BENTO_CARDS.slice(4).map((feature, index) => (
                <article
                  key={feature.title}
                  className={`group relative overflow-hidden rounded-2xl border border-border/70 bg-card/80 p-5 shadow-[0_16px_36px_-30px_rgba(8,145,178,0.8)] transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-[0_28px_52px_-34px_rgba(8,145,178,0.85)] ${
                    index === 1 ? "lg:col-span-2" : "lg:col-span-1"
                  }`}
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${feature.tone}`}
                  />
                  <feature.icon className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 text-foreground/[0.05] transition-all duration-300 group-hover:scale-105 group-hover:text-primary/[0.10]" />
                  <div className="relative">
                    <h3 className="text-lg font-bold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="relative z-10 px-6 lg:px-12 pb-20">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <Badge className="mb-4 bg-accent/10 text-accent border-accent/20 hover:bg-accent/20">
                Workflow
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
                How It Works in 3 Steps
              </h2>
            </div>
            <p className="max-w-md text-sm text-muted-foreground md:text-right">
              Start with natural language, run retrieval across trusted sources,
              then optionally continue with the AI agent for deeper search
              support.
            </p>
          </div>

          <div className="relative">
            <div className="pointer-events-none absolute left-[17%] right-[17%] top-14 hidden lg:block border-t border-dashed border-primary/35" />
            <div className="grid gap-5 lg:grid-cols-3">
              {WORKFLOW_STEPS.map((item, index) => (
                <article
                  key={item.step}
                  className="group relative overflow-hidden rounded-3xl border border-border/70 bg-background/75 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-[0_22px_48px_-34px_rgba(8,145,178,0.9)]"
                >
                  <item.icon className="pointer-events-none absolute -right-8 -bottom-10 h-36 w-36 text-foreground/[0.045] transition-colors duration-300 group-hover:text-primary/[0.08]" />
                  <div className="mb-6 flex items-start justify-between">
                    <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold tracking-wider text-primary">
                      {item.phase}
                    </span>
                    <span className="text-3xl font-bold leading-none text-primary/30">
                      {item.step}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.description}
                  </p>

                  {index < WORKFLOW_STEPS.length - 1 && (
                    <ChevronRight className="pointer-events-none absolute -right-3 top-12 hidden h-6 w-6 text-primary/50 lg:block" />
                  )}
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 lg:px-12 py-20">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-primary to-primary/80 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-accent/20 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-primary-foreground mb-4">
                Ready to Streamline Your Clinical Workflow?
              </h2>
              <div className="flex justify-center">
                <Button size="lg" asChild className={primaryCtaClass}>
                  <Link to="/login">Get Started Now</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 lg:px-12 py-12 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <Link to="/">
              <AideLogo size="sm" animate="none" />
            </Link>
            <p className="text-sm text-muted-foreground">
              © 2026 ED Guidelines. Designed for healthcare professionals.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-primary transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                Support
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
