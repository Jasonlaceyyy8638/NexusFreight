import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocumentLayout } from "@/components/marketing/LegalDocumentLayout";

export const metadata: Metadata = {
  title: "Privacy Policy | NexusFreight",
  description:
    "How NexusFreight collects, uses, and protects data for our logistics platform.",
};

export default function PrivacyPage() {
  return (
    <LegalDocumentLayout>
      <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Last updated: April 5, 2026 · Placeholder for B2B logistics SaaS—have
        counsel review before production.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-white sm:text-2xl">
        Overview
      </h2>
      <p className="mt-4 leading-relaxed">
        This Privacy Policy describes how NexusFreight (“NexusFreight,” “we,”
        “us”) handles personal and operational information when you use our
        logistics management platform. It applies to business customers and
        their authorized users.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-white sm:text-2xl">
        Data collection
      </h2>
      <p className="mt-4 leading-relaxed">
        Depending on how you use the Service, we may collect or process:
      </p>
      <ul className="mt-4 list-disc space-y-2 pl-6 leading-relaxed">
        <li>
          <strong className="font-semibold text-slate-200">Identity and contact</strong>{" "}
          information such as name and email address for accounts and
          communications.
        </li>
        <li>
          <strong className="font-semibold text-slate-200">
            Regulatory and business identifiers
          </strong>{" "}
          such as MC and USDOT numbers and related carrier profile data you
          choose to store in the platform.
        </li>
        <li>
          <strong className="font-semibold text-slate-200">
            Real-time GPS and location data
          </strong>{" "}
          received from electronic logging device (ELD) and telematics providers
          when you connect those integrations and authorize data access.
        </li>
        <li>
          Technical and usage data (e.g., device, browser, log data) needed to
          operate and secure the Service.
        </li>
      </ul>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-white sm:text-2xl">
        Data usage
      </h2>
      <p className="mt-4 leading-relaxed">
        We use account and operational data to provide, maintain, and improve
        NexusFreight, including authentication, customer support, analytics
        relating to product performance, and security monitoring.{" "}
        <strong className="font-semibold text-slate-200">
          We use GPS and location data from ELD providers only to support
          operational features within the Service—such as displaying vehicle or
          asset positions on our internal maps and related logistics workflows
          tied to your loads and fleet.
        </strong>{" "}
        We do not use driver location data for unrelated advertising purposes.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-white sm:text-2xl">
        Data security
      </h2>
      <p className="mt-4 leading-relaxed">
        We implement administrative, technical, and organizational safeguards
        designed to protect information, including{" "}
        <strong className="font-semibold text-slate-200">
          encryption in transit (and where appropriate at rest)
        </strong>{" "}
        for data handled by our systems. No method of transmission or storage
        is completely secure; we work to follow industry-appropriate practices
        for a cloud SaaS product.{" "}
        <strong className="font-semibold text-slate-200">
          We do not sell driver location data to third parties.
        </strong>
      </p>
      <p className="mt-4 leading-relaxed">
        Tenant data in our application database is designed to be scoped by
        organization; for more on access controls, see{" "}
        <Link href="/resources/security" className="font-medium">
          Security &amp; RLS
        </Link>
        .
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-white sm:text-2xl">
        Integration transparency
      </h2>
      <p className="mt-4 leading-relaxed">
        When you connect third-party ELD or telematics services,{" "}
        <strong className="font-semibold text-slate-200">
          you authorize NexusFreight to retrieve data using industry-standard
          methods
        </strong>
        , including{" "}
        <strong className="font-semibold text-slate-200">
          OAuth 2.0 or vendor API tokens
        </strong>
        , as offered by providers such as Motive, Samsara, and similar
        platforms. The scope of data we receive depends on the permissions you
        grant and the provider’s API. You should review each provider’s terms
        and privacy notices in addition to this Policy.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-white sm:text-2xl">
        Data integration &amp; telematics
      </h2>
      <p className="mt-4 leading-relaxed">
        NexusFreight integrates with third-party Electronic Logging Device (ELD)
        providers, including but not limited to Motive, Samsara, and Geotab.
        When you authorize a connection via OAuth or API token, we collect
        real-time telematics data such as GPS location, vehicle identification,
        and engine diagnostics. This data is used exclusively to provide
        real-time fleet visibility on your dashboard and to automate internal
        driver payroll and settlement calculations.
      </p>
      <p className="mt-4 leading-relaxed">
        We do not store your ELD login passwords; all access is managed via
        secure, industry-standard tokens which you can revoke at any time
        through your ELD provider&apos;s dashboard or within NexusFreight
        settings.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-white sm:text-2xl">
        Retention and rights
      </h2>
      <p className="mt-4 leading-relaxed">
        We retain information for as long as needed to provide the Service and
        fulfill the purposes described here, unless a longer period is required
        by law. Depending on your jurisdiction, you may have rights to access,
        correct, or delete certain personal information. Contact us using the
        email below to submit a request.
      </p>

      <h2 className="mt-10 text-xl font-semibold tracking-tight text-white sm:text-2xl">
        Contact
      </h2>
      <p className="mt-4 leading-relaxed">
        Privacy questions:{" "}
        <a href="mailto:info@nexusfreight.tech">info@nexusfreight.tech</a>.
        See also our{" "}
        <Link href="/terms" className="font-medium">
          Terms of Service
        </Link>
        .
      </p>
    </LegalDocumentLayout>
  );
}
