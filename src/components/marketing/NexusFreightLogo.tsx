type Props = {
  className?: string;
  /** LCP / above-the-fold */
  priority?: boolean;
};

/** Two-tone wordmark on midnight charcoal — matches `nexusfreight-logo-v2.svg` (Crisp + site). */
export function NexusFreightLogo({
  className = "h-8 w-auto sm:h-9",
  priority = false,
}: Props) {
  return (
    <img
      src="/nexusfreight-logo-v2.svg"
      alt="NexusFreight"
      width={256}
      height={56}
      className={className}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
    />
  );
}
