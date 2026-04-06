/**
 * ELD / telematics sync — implementation in telematics-sync-engine.
 */

import {
  executeTelematicsSync,
  syncSingleTelematicsRow,
  type TelematicsTokenRow,
} from "@/lib/integrations/telematics-sync-engine";

export { executeTelematicsSync, syncSingleTelematicsRow, type TelematicsTokenRow };

export type TelematicsVaultRow = TelematicsTokenRow;

/** @deprecated Use syncSingleTelematicsRow */
export const syncEldConnectionFromVault = syncSingleTelematicsRow;
