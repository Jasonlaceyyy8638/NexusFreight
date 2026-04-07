import Link from "next/link";
import { NexusFreightLogo } from "@/components/marketing/NexusFreightLogo";
import { FeatureCardsGrid } from "@/components/landing/FeatureCardsGrid";
import { HeroPlatformCTA } from "@/components/landing/HeroPlatformCTA";
import { HeroProductPreview } from "@/components/landing/HeroProductPreview";
import { ImpactStatsBar } from "@/components/landing/ImpactStatsBar";
import { IntegrationPartnersSection } from "@/components/landing/IntegrationPartnersSection";
import { LandingFaqAccordion } from "@/components/landing/LandingFaqAccordion";
import { LandingLeadCapture } from "@/components/landing/LandingLeadCapture";
import { BetaLaunchBanner } from "@/components/landing/BetaLaunchBanner";
import { DownloadDesktopCta } from "@/components/pwa/DownloadDesktopCta";
import { MarketingNav } from "@/components/landing/MarketingNav";
import { MarketingPageBackdrop } from "@/components/landing/MarketingPageBackdrop";
import { NativeDriverAppSection } from "@/components/landing/NativeDriverAppSection";
import { NexusFreightShieldSection } from "@/components/landing/NexusFreightShieldSection";
import { SecurityDataTrustSection } from "@/components/landing/SecurityDataTrustSection";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { WhoWeServeSection } from "@/components/landing/WhoWeServeSection";

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col bg-[#0D0E10] text-white">
      <MarketingPageBackdrop />

      <div className="relative z-10 flex min-h-screen flex-col">
        <BetaLaunchBanner />
        <MarketingNav />

        <main className="flex flex-1 flex-col">
          <section
            className="relative overflow-hidden"
            aria-labelledby="hero-heading"
          >
            <div className="relative isolate min-h-[min(78vh,820px)]">
              <video
                className="absolute inset-0 h-full w-full object-cover opacity-40"
                autoPlay
                muted
                loop
                playsInline
                poster="https://images.pexels.com/videos/3045163/free-video-3045163.jpg?auto=compress&cs=tinysrgb&w=1920"
              >
                <source
                  src="https://videos.pexels.com/video-files/3045163/3045163-uhd_2560_1440_25fps.mp4"
                  type="video/mp4"
                />
              </video>
              <div
                className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-[#0D0E10]/90 via-[#0D0E10]/85 to-[#0D0E10]"
                aria-hidden
              />
              <div className="relative z-10 flex w-full flex-col items-center px-6 pb-20 pt-20 sm:pt-24">
                <div className="mx-auto max-w-4xl text-center">
                  <div className="flex justify-center">
                    <NexusFreightLogo priority className="h-10 w-auto sm:h-11" />
                  </div>
                  <h1
                    id="hero-heading"
                    className="mt-5 text-4xl font-black leading-[1.08] tracking-tight text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.45)] sm:text-5xl md:text-6xl lg:text-[3.25rem]"
                  >
                    The Unified Operating System for Modern Logistics.
                  </h1>
                  <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-relaxed text-slate-300 sm:text-lg">
                    Real-time ELD integration, automated driver dispatch, and instant
                    carrier settlements. Built for the office, engineered for the road.
                  </p>
                  <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:mt-12 sm:flex-row sm:gap-4">
                    <HeroPlatformCTA />
                    <Link
                      href="mailto:info@nexusfreight.tech?subject=Demo%20Request"
                      className="inline-flex min-w-[168px] items-center justify-center rounded-md border border-white/25 bg-white/5 px-8 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:border-white/40 hover:bg-white/10"
                    >
                      Request Demo
                    </Link>
                  </div>
                </div>

                <div className="mt-14 w-full max-w-none sm:mt-16">
                  <HeroProductPreview />
                </div>
              </div>
            </div>
          </section>

          <ImpactStatsBar />

          <DownloadDesktopCta />

          <IntegrationPartnersSection />

          <WhoWeServeSection />

          <section
            id="features"
            className="border-t border-white/[0.06] px-6 py-20 font-[family-name:var(--font-inter)] sm:py-28"
            aria-labelledby="features-heading"
          >
            <div className="mx-auto max-w-6xl text-center">
              <h2
                id="features-heading"
                className="text-3xl font-semibold tracking-tight text-white sm:text-4xl"
              >
                Built for serious operations
              </h2>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400">
                Three operational pillars—clear hierarchy, Inter typography,
                and proof in the product.
              </p>
            </div>
            <div className="mx-auto mt-14 max-w-6xl sm:mt-16">
              <FeatureCardsGrid />
            </div>
            <p className="mx-auto mt-12 max-w-xl text-center text-sm text-slate-500">
              Need fleet visibility?{" "}
              <Link
                href="/resources/live-map"
                className="font-medium text-slate-300 underline decoration-white/15 underline-offset-4 transition-colors hover:text-[#3B82F6] hover:decoration-[#3B82F6]/40"
              >
                Explore the Live Map
              </Link>
            </p>
          </section>

          <SecurityDataTrustSection />

          <NexusFreightShieldSection />

          <NativeDriverAppSection />

          <LandingFaqAccordion />

          <section className="border-t border-white/[0.06] px-6 py-20 font-sans sm:py-24">
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-sm text-slate-500">
                Questions about ELD, RLS, or FMCSA verification?{" "}
                <Link
                  href="/resources/security"
                  className="font-medium text-slate-300 transition-colors hover:text-blue-500"
                >
                  Security &amp; RLS
                </Link>
                {" · "}
                <Link
                  href="/help"
                  className="font-medium text-slate-300 transition-colors hover:text-blue-500"
                >
                  Help Center
                </Link>
              </p>
            </div>
          </section>

          <LandingLeadCapture />
        </main>

        <SiteFooter />
      </div>
    </div>
  );
}
