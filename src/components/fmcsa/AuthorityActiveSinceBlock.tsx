import {
  carrierIsNewAuthority,
  formatAuthorityDateHuman,
} from "@/lib/fmcsa_authority";
import { NewAuthorityBadge } from "@/components/fmcsa/NewAuthorityBadge";

type Props = {
  authority_date: string | null | undefined;
  is_new_authority?: boolean | null;
};

export function AuthorityActiveSinceBlock({
  authority_date,
  is_new_authority,
}: Props) {
  const date = authority_date ?? null;
  const showBadge = carrierIsNewAuthority({
    authority_date: date,
    is_new_authority,
  });

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
        Authority Active Since:
      </p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <p className="text-sm text-slate-200">
          {date ? formatAuthorityDateHuman(date) : "Not reported by FMCSA"}
        </p>
        {showBadge ? <NewAuthorityBadge /> : null}
      </div>
    </div>
  );
}
