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
      throw redirect({ to: "/search" });
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

function LandingPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (query: string) => {
    window.location.href = `/login?redirect=/search&q=${encodeURIComponent(query)}`;
  };

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
            <Button
              asChild
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25"
            >
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
            get accurate answers backed by RCEM, NICE, and your local trust
            protocols.
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
            {["NHS Trusts", "RCEM", "NICE", "Local Protocols"].map((org) => (
              <div key={org} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-sm font-medium text-foreground">
                  {org}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 px-6 lg:px-12 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
              Why ED Guidelines?
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Built for High-Pressure Environments
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Search,
                title: "Natural Language Search",
                description:
                  "Ask questions like you would ask a senior colleague. No need to remember exact terminology.",
                color: "from-primary to-secondary",
              },
              {
                icon: Brain,
                title: "AI-Powered Answers",
                description:
                  "Get instant, accurate responses grounded in official guidelines with proper citations.",
                color: "from-accent to-accent/70",
              },
              {
                icon: Clock,
                title: "Always Current",
                description:
                  "Guidelines automatically updated from RCEM, NICE, and your local trust protocols.",
                color: "from-primary to-primary/70",
              },
              {
                icon: Shield,
                title: "Clinical Confidence",
                description:
                  "Every answer shows sources. Know exactly which guideline your information comes from.",
                color: "from-secondary to-primary",
              },
              {
                icon: Zap,
                title: "Lightning Fast",
                description:
                  "Sub-second response times. Critical information when every second counts.",
                color: "from-accent/70 to-accent",
              },
              {
                icon: FileText,
                title: "Full Documents",
                description:
                  "Access complete guideline documents with one tap. No more searching through folders.",
                color: "from-primary/70 to-primary",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group bg-card rounded-2xl p-6 shadow-sm border border-border hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30 transition-all duration-300"
              >
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <feature.icon className="w-6 h-6 text-white dark:text-black" />
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 px-6 lg:px-12 py-20 bg-card">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-accent/10 text-accent border-accent/20 hover:bg-accent/20">
              Simple & Fast
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              Get Answers in 3 Steps
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Ask Your Question",
                description:
                  "Type naturally about any clinical scenario. No special syntax needed.",
                icon: Search,
              },
              {
                step: "2",
                title: "AI Searches Guidelines",
                description:
                  "Our AI searches through RCEM, NICE, and local protocols instantly.",
                icon: Brain,
              },
              {
                step: "3",
                title: "Get Your Answer",
                description:
                  "Receive a clear, cited answer with links to full documents.",
                icon: FileText,
              },
            ].map((item, index) => (
              <div key={item.step} className="relative text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4 shadow-lg shadow-primary/20">
                  <item.icon className="w-7 h-7 text-primary-foreground" />
                </div>
                <div className="text-sm font-bold text-primary mb-2">
                  Step {item.step}
                </div>
                <h3 className="text-lg font-bold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>

                {index < 2 && (
                  <div className="hidden md:block absolute top-8 left-full w-full">
                    <ChevronRight className="w-6 h-6 text-primary/30 mx-auto" />
                  </div>
                )}
              </div>
            ))}
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
              <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
                Join thousands of healthcare professionals accessing guidelines
                faster.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  size="lg"
                  asChild
                  className="bg-white text-primary hover:bg-white/90 dark:bg-background dark:text-primary h-12 px-8 font-semibold shadow-xl"
                >
                  <Link to="/login">Get Started Free</Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="border-2 border-white/30 text-primary-foreground hover:bg-white/10 h-12 px-8 font-semibold"
                >
                  <Link to="/login">Sign In</Link>
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
