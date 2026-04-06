import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocumentLayout } from "@/components/marketing/LegalDocumentLayout";

export const metadata: Metadata = {
  title: "Terms of Service | NexusFreight",
  description:
    "Terms of Service for NexusFreight, a B2B logistics management platform.",
};

export default function TermsPage() {
  return (
    <LegalDocumentLayout>
      <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Last updated: April 5, 2026 · Placeholder for B2B logistics SaaS—have
        counsel review before production.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-white sm:text-2xl">
        Agreement
      </h2>
      <p className="mt-4 leading-relaxed">
        These Terms of Service (“Terms”) govern access to and use of NexusFreight
        (“NexusFreight,” “we,” “us,” or “our”) by you and the organization you
        represent (“Customer,” “you”). By using the Service, you agree to these
        Terms. If you do not agree, do not use the Service.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-white sm:text-2xl">
        Service definition
      </h2>
      <p className="mt-4 leading-relaxed">
        NexusFreight is a{" "}
        <strong className="font-semibold text-slate-200">
          logistics management platform
        </strong>{" "}
        provided on a software-as-a-service basis. The Service is intended for
        business users (including motor carriers, brokers, and logistics
        operators) to manage loads, fleet visibility, settlements-related
        workflows, and related operational data within the product. Features,
        availability, and integrations may change as we develop the platform.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-white sm:text-2xl">
        User responsibility
      </h2>
      <p className="mt-4 leading-relaxed">
        You are responsible for the accuracy and legality of information you and
        your users submit to the Service, including{" "}
        <strong className="font-semibold text-slate-200">
          Motor Carrier (MC) and USDOT identifiers
        </strong>
        , business records, and credentials used to connect third-party
        systems. You must provide{" "}
        <strong className="font-semibold text-slate-200">
          accurate MC/DOT and ELD-related credentials
        </strong>{" "}
        where required for integrations and compliance-related features, and
        you must maintain those credentials in good standing. You are
        responsible for activity under your accounts and for ensuring your users
        comply with these Terms and applicable law.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-white sm:text-2xl">
        Payment terms
      </h2>
      <p className="mt-4 leading-relaxed">
        Access to the Service may be offered on a{" "}
        <strong className="font-semibold text-slate-200">
          subscription-based
        </strong>{" "}
        or other commercial model described in an order form, checkout flow, or
        separate agreement. Fees, billing cycles, taxes, and payment methods
        will be specified at the time of purchase or as otherwise agreed in
        writing. Unless stated otherwise, fees are non-refundable except as
        required by law or expressly provided in your agreement with us.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-white sm:text-2xl">
        Limitation of liability
      </h2>
      <p className="mt-4 leading-relaxed">
        To the maximum extent permitted by law, the Service is provided “as is”
        and “as available.”{" "}
        <strong className="font-semibold text-slate-200">
          We are not responsible for road incidents, accidents, injuries, cargo
          loss, delays, fines, or dispatching or operational errors
        </strong>{" "}
        that occur in the physical world or outside our reasonable control,
        including decisions made by carriers, drivers, shippers, or regulators.
        Nothing in the Service constitutes legal, safety, or compliance advice.
        Our total liability for any claim arising out of or relating to these
        Terms or the Service will be limited as set forth in your subscription
        agreement or, if none, to the greater of amounts you paid us in the
        twelve (12) months preceding the claim or one hundred U.S. dollars
        (US$100), except where limitations are prohibited by law.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-white sm:text-2xl">
        Changes
      </h2>
      <p className="mt-4 leading-relaxed">
        We may update these Terms from time to time. We will post the revised
        Terms on this page and update the “Last updated” date. Continued use of
        the Service after changes constitutes acceptance of the revised Terms
        where permitted by law.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-white sm:text-2xl">
        Contact
      </h2>
      <p className="mt-4 leading-relaxed">
        Questions about these Terms:{" "}
        <a href="mailto:info@nexusfreight.tech">info@nexusfreight.tech</a>. See
        also our{" "}
        <Link href="/privacy" className="font-medium">
          Privacy Policy
        </Link>
        .
      </p>
    </LegalDocumentLayout>
  );
}
