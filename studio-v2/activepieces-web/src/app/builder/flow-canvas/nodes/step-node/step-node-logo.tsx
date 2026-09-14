import { useBuilderStateContext } from '@/app/builder/builder-hooks';
import { StepMetadata, StudioNodeIcon } from '@/features/pieces';
import { cn } from '@/lib/utils';

const StepNodeLogo = ({
  isSkipped,
  logoUrl,
  displayName,
  stepType,
  pieceName,
}: {
  isSkipped: boolean;
  logoUrl: string;
  displayName: string;
  stepType: StepMetadata['type'];
  pieceName?: string;
}) => {
  const canvasOrientation = useBuilderStateContext(
    (state) => state.canvasOrientation,
  );
  const isHorizontal = canvasOrientation === 'horizontal';
  return (
    <div
      className={cn('flex items-center justify-center rounded-sm shrink-0', {
        'opacity-80': isSkipped,
      })}
    >
      <StudioNodeIcon
        metadata={{ type: stepType, logoUrl, displayName, pieceName }}
        key={`${stepType}-${logoUrl}-${displayName}`}
        imageSize={isHorizontal ? 'lg' : 'md'}
        className={cn({
          'size-9': !isHorizontal,
          'size-12': isHorizontal,
        })}
      />
    </div>
  );
};

export { StepNodeLogo };
