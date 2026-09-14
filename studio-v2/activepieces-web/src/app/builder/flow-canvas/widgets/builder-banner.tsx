import { isNil } from '@activepieces/core-utils';

import { ResourceLockWidget } from '@/components/custom/resource-lock-widget';

import { useBuilderStateContext } from '../../builder-hooks';

import { RunInfoWidget } from './run-info-widget';
import { useFlowLock } from './use-flow-lock';
import { ViewingOldVersionWidget } from './viewing-old-version-widget';

const BuilderBanner = () => {
  const { lockedBy, takeOver } = useFlowLock();
  const run = useBuilderStateContext((state) => state.run);

  if (lockedBy) {
    return (
      <ResourceLockWidget
        lockedBy={lockedBy}
        takeOver={takeOver}
        resourceLabel="flow"
      />
    );
  }
  if (!isNil(run)) {
    return <RunInfoWidget />;
  }
  return <ViewingOldVersionWidget />;
};

BuilderBanner.displayName = 'BuilderBanner';
export { BuilderBanner };
