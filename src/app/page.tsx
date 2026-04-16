import Link from "next/link";
import { redirect } from "next/navigation";
import { NexusFreightLogo } from "@/components/marketing/NexusFreightLogo";
import { BrokerSetupEngineSection } from "@/components/landing/BrokerSetupEngineSection";
import { PlatformCapabilitiesSection } from "@/components/landing/FeatureCardsGrid";
import { HeroPlatformCTA } from "@/components/landing/HeroPlatformCTA";
import { HeroProductPreview } from "@/components/landing/HeroProductPreview";
import { ImpactStatsBar } from "@/components/landing/ImpactStatsBar";
import { IntegrationPartnersSection } from "@/components/landing/IntegrationPartnersSection";
import { LandingFaqAccordion } from "@/components/landing/LandingFaqAccordion";
import { LandingLeadCapture } from "@/components/landing/LandingLeadCapture";
import { BetaLaunchBanner } from "@/components/landing/BetaLaunchBanner";
import { LandingHashScroll } from "@/components/landing/LandingHashScroll";
import { MarketingNav } from "@/components/landing/MarketingNav";
import { MarketingPageBackdrop } from "@/components/landing/MarketingPageBackdrop";
import { NativeDriverAppSection } from "@/components/landing/NativeDriverAppSection";
import { NexusFreightShieldSection } from "@/components/landing/NexusFreightShieldSection";
import { SecurityDataTrustSection } from "@/components/landing/SecurityDataTrustSection";
import { SiteFooter } from "@/components/landing/SiteFooter";
import LandingPricingCards from "@/components/landing/LandingPricingCards";
import { LandingBridgeSection } from "@/components/landing/LandingBridgeSection";
import { LandingMarketPulseSection } from "@/components/landing/LandingMarketPulseSection";
import { RateConFeatureSpotlightSection } from "@/components/landing/RateConFeatureSpotlightSection";
import { HomeJsonLd } from "@/components/seo/HomeJsonLd";

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/**
 * Supabase PKCE email links sometimes land on Site URL with `?code=` (no hash).
 * Forward to `/auth/callback` so the client can `exchangeCodeForSession` — otherwise
 * users stay on the marketing home and appear “stuck” after signup/invite.
 */
export default async function Home({ searchParams }: HomePageProps) {
  const q = await searchParams;
  const hasCode = typeof q.code === "string" && q.code.length > 0;
  const hasOAuthError =
    typeof q.error === "string" &&
    (typeof q.error_description === "string" ||
      typeof q.error_code === "string");
  if (hasCode || hasOAuthError) {
    const usp = new URLSearchParams();
    for (const [k, v] of Object.entries(q)) {
      if (typeof v === "string") usp.set(k, v);
      else if (Array.isArray(v) && v[0]) usp.set(k, v[0]);
    }
    redirect(`/auth/callback?${usp.toString()}`);
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-[#0D0E10] text-white">
      <HomeJsonLd />
      <MarketingPageBackdrop />

      <div className="relative z-10 flex min-h-screen flex-col">
        <LandingHashScroll />
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
                    Built for dispatchers and carrier fleets.
                  </h1>
                  <p className="mx-auto mt-6 max-w-2xl text-base font-medium leading-relaxed text-slate-300 sm:text-lg">
                    Real-time ELD integration, driver dispatch, and carrier settlements
                    in one dashboard—office and road in sync. For dispatch teams and
                    fleet operators moving freight every day.
                  </p>
                  <p className="mx-auto mt-4 max-w-xl text-sm text-slate-400">
                    Pick a plan on pricing, check out with Stripe, then create your
                    account—same day access. Or explore the sandbox with sample data.
                  </p>
                  <div className="mt-10 flex w-full max-w-md flex-col items-center justify-center sm:mt-12 sm:max-w-none">
                    <HeroPlatformCTA />
                  </div>
                </div>

                <div className="mt-14 w-full max-w-none sm:mt-16">
                  <HeroProductPreview />
                </div>
              </div>
            </div>
          </section>

          <ImpactStatsBar />

          <IntegrationPartnersSection />

          <LandingBridgeSection />

          <LandingMarketPulseSection />

          <RateConFeatureSpotlightSection />

          <LandingPricingCards />

          <BrokerSetupEngineSection />

          <PlatformCapabilitiesSection />

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
