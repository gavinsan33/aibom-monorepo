import type { LabelProps } from '@patternfly/react-core';
import type { VerifyStatus } from '../../utils/verifySignature';

/** Green only for a fully anchored signature, matching `oc aibom describe`'s color rules. */
export const verifyLabelColor = (status: VerifyStatus): LabelProps['color'] =>
  (
    ({
      valid: 'green',
      invalid: 'red',
      'key-mismatch': 'orange',
      unconfirmed: 'orange',
      unsigned: 'grey',
    }) as const satisfies Record<VerifyStatus, LabelProps['color']>
  )[status];
