import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RadiantPromptInput } from "@/components/ui/radiant-input";
import { 
  Brain, 
  Clock, 
  Stethoscope,
  Shield,
  Activity,
  FileText,
  ChevronRight,
  Sparkles,
  Search,
  Zap
} from "lucide-react";
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
    // For now, just redirect to login with the query
    window.location.href = `/login?redirect=/search&q=${encodeURIComponent(query)}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#F0FDFA] via-white to-[#F0FDFA] relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] rounded-full opacity-30"
          style={{
            background: 'radial-gradient(circle, rgba(8, 145, 178, 0.2) 0%, transparent 70%)',
            filter: 'blur(80px)',
          }}
        />
        <div 
          className="absolute bottom-0 right-0 w-[500px] h-[500px] rounded-full opacity-20"
          style={{
            background: 'radial-gradient(circle, rgba(34, 197, 94, 0.2) 0%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />
        
        {/* Subtle Grid */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(8, 145, 178, 0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(8, 145, 178, 0.5) 1px, transparent 1px)`,
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 w-full px-6 lg:px-12 py-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0891B2] to-[#22D3EE] flex items-center justify-center shadow-lg shadow-[#0891B2]/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-[#134E4A]">ED Guidelines</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild className="hidden sm:flex text-[#5E6B6A] hover:text-[#0891B2] hover:bg-[#0891B2]/5">
              <Link to="/login">Sign In</Link>
            </Button>
            <Button asChild className="bg-[#0891B2] hover:bg-[#0E7490] text-white shadow-lg shadow-[#0891B2]/25">
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section - Search Focused */}
      <section className="relative z-10 px-6 lg:px-12 pt-12 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#0891B2]/10 border border-[#0891B2]/20 mb-8 animate-fade-in">
            <Sparkles className="w-4 h-4 text-[#0891B2]" />
            <span className="text-sm font-medium text-[#0891B2]">AI-Powered Clinical Guidelines</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#134E4A] leading-[1.1] tracking-tight mb-6 animate-slide-up">
            Find Protocols{" "}
            <span className="bg-gradient-to-r from-[#0891B2] to-[#22C55E] bg-clip-text text-transparent">
              in Seconds
            </span>
          </h1>

          <p className="text-lg text-[#5E6B6A] leading-relaxed max-w-2xl mx-auto mb-10 animate-slide-up stagger-1">
            Instant access to Emergency Department guidelines. Ask naturally, get accurate answers 
            backed by RCEM, NICE, and your local trust protocols.
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
            <span className="text-sm text-[#5E6B6A]">Popular:</span>
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.label}
                onClick={() => handleSearch(action.label)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#99F6E4] text-sm text-[#134E4A] hover:border-[#0891B2] hover:bg-[#F0FDFA] transition-all cursor-pointer shadow-sm"
              >
                <action.icon className="w-3.5 h-3.5 text-[#0891B2]" />
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
                <div className="text-2xl sm:text-3xl font-bold text-[#0891B2]">{stat.value}</div>
                <div className="text-xs sm:text-sm text-[#5E6B6A]">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="relative z-10 px-6 lg:px-12 py-12 border-y border-[#99F6E4]/50 bg-white/50">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-sm text-[#5E6B6A] mb-6">Trusted by Emergency Departments across the UK</p>
          <div className="flex flex-wrap items-center justify-center gap-8 opacity-60">
            {["NHS Trusts", "RCEM", "NICE", "Local Protocols"].map((org) => (
              <div key={org} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#0891B2]" />
                <span className="text-sm font-medium text-[#134E4A]">{org}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative z-10 px-6 lg:px-12 py-20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-[#0891B2]/10 text-[#0891B2] border-[#0891B2]/20 hover:bg-[#0891B2]/20">
              Why ED Guidelines?
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#134E4A]">
              Built for High-Pressure Environments
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Search,
                title: "Natural Language Search",
                description: "Ask questions like you would ask a senior colleague. No need to remember exact terminology.",
                color: "from-[#0891B2] to-[#22D3EE]",
              },
              {
                icon: Brain,
                title: "AI-Powered Answers",
                description: "Get instant, accurate responses grounded in official guidelines with proper citations.",
                color: "from-[#22C55E] to-[#4ADE80]",
              },
              {
                icon: Clock,
                title: "Always Current",
                description: "Guidelines automatically updated from RCEM, NICE, and your local trust protocols.",
                color: "from-[#0891B2] to-[#0E7490]",
              },
              {
                icon: Shield,
                title: "Clinical Confidence",
                description: "Every answer shows sources. Know exactly which guideline your information comes from.",
                color: "from-[#22D3EE] to-[#0891B2]",
              },
              {
                icon: Zap,
                title: "Lightning Fast",
                description: "Sub-second response times. Critical information when every second counts.",
                color: "from-[#4ADE80] to-[#22C55E]",
              },
              {
                icon: FileText,
                title: "Full Documents",
                description: "Access complete guideline documents with one tap. No more searching through folders.",
                color: "from-[#0E7490] to-[#0891B2]",
              },
            ].map((feature) => (
              <div 
                key={feature.title}
                className="group bg-white rounded-2xl p-6 shadow-sm border border-[#99F6E4] hover:shadow-lg hover:shadow-[#0891B2]/5 hover:border-[#0891B2]/30 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-[#134E4A] mb-2">{feature.title}</h3>
                <p className="text-sm text-[#5E6B6A] leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="relative z-10 px-6 lg:px-12 py-20 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-[#22C55E]/10 text-[#22C55E] border-[#22C55E]/20 hover:bg-[#22C55E]/20">
              Simple & Fast
            </Badge>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#134E4A]">
              Get Answers in 3 Steps
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Ask Your Question",
                description: "Type naturally about any clinical scenario. No special syntax needed.",
                icon: Search,
              },
              {
                step: "2",
                title: "AI Searches Guidelines",
                description: "Our AI searches through RCEM, NICE, and local protocols instantly.",
                icon: Brain,
              },
              {
                step: "3",
                title: "Get Your Answer",
                description: "Receive a clear, cited answer with links to full documents.",
                icon: FileText,
              },
            ].map((item, index) => (
              <div key={item.step} className="relative text-center">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#0891B2] to-[#22D3EE] flex items-center justify-center mb-4 shadow-lg shadow-[#0891B2]/20">
                  <item.icon className="w-7 h-7 text-white" />
                </div>
                <div className="text-sm font-bold text-[#0891B2] mb-2">Step {item.step}</div>
                <h3 className="text-lg font-bold text-[#134E4A] mb-2">{item.title}</h3>
                <p className="text-sm text-[#5E6B6A]">{item.description}</p>
                
                {index < 2 && (
                  <div className="hidden md:block absolute top-8 left-full w-full">
                    <ChevronRight className="w-6 h-6 text-[#0891B2]/30 mx-auto" />
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
          <div className="bg-gradient-to-r from-[#0891B2] to-[#0E7490] rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-[#22C55E]/20 rounded-full blur-3xl" />
            </div>
            
            <div className="relative z-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                Ready to Streamline Your Clinical Workflow?
              </h2>
              <p className="text-white/80 mb-8 max-w-xl mx-auto">
                Join thousands of healthcare professionals accessing guidelines faster.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  asChild 
                  className="bg-white text-[#0891B2] hover:bg-white/90 h-12 px-8 font-semibold shadow-xl"
                >
                  <Link to="/signup">Get Started Free</Link>
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  asChild 
                  className="border-2 border-white/30 text-white hover:bg-white/10 h-12 px-8 font-semibold"
                >
                  <Link to="/login">Sign In</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 lg:px-12 py-12 border-t border-[#99F6E4]">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#0891B2] to-[#22D3EE] flex items-center justify-center">
                <Activity className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-[#134E4A]">ED Guidelines</span>
            </div>
            <p className="text-sm text-[#5E6B6A]">
              © 2026 ED Guidelines. Designed for healthcare professionals.
            </p>
            <div className="flex gap-6 text-sm text-[#5E6B6A]">
              <a href="#" className="hover:text-[#0891B2] transition-colors">Privacy</a>
              <a href="#" className="hover:text-[#0891B2] transition-colors">Terms</a>
              <a href="#" className="hover:text-[#0891B2] transition-colors">Support</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
