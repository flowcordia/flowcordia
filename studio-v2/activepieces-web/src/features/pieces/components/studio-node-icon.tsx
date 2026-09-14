import { FlowActionType, FlowTriggerType } from '@activepieces/shared';
import {
  Calculator,
  CalendarDays,
  Clock,
  Code2,
  Database,
  GitBranch,
  Globe,
  MousePointerClick,
  Repeat2,
  Timer,
  Type,
  Webhook,
} from 'lucide-react';

import { cn } from '@/lib/utils';

import { StepMetadata } from '../types';

import { PieceIcon } from './piece-icon';

type StudioNodeIconProps = {
  metadata: Pick<StepMetadata, 'type' | 'displayName' | 'logoUrl'> & {
    pieceName?: string;
  };
  className?: string;
  imageSize?: 'sm' | 'md' | 'lg';
};

const nativeIcons = {
  [FlowActionType.CODE]: Code2,
  [FlowActionType.LOOP_ON_ITEMS]: Repeat2,
  [FlowActionType.ROUTER]: GitBranch,
  [FlowTriggerType.EMPTY]: MousePointerClick,
};

const toolIcons: Record<string, typeof Code2> = {
  '@activepieces/piece-manual-trigger': MousePointerClick,
  '@activepieces/piece-http': Globe,
  '@activepieces/piece-webhook': Webhook,
  '@activepieces/piece-delay': Timer,
  '@activepieces/piece-schedule': Clock,
  '@activepieces/piece-math-helper': Calculator,
  '@activepieces/piece-text-helper': Type,
  '@activepieces/piece-date-helper': CalendarDays,
  '@activepieces/piece-store': Database,
};

export const StudioNodeIcon = ({
  metadata,
  className,
  imageSize = 'sm',
}: StudioNodeIconProps) => {
  const ToolIcon = metadata.pieceName
    ? toolIcons[metadata.pieceName]
    : undefined;
  if (
    !ToolIcon &&
    (metadata.type === FlowActionType.PIECE ||
      metadata.type === FlowTriggerType.PIECE)
  ) {
    return (
      <PieceIcon
        logoUrl={metadata.logoUrl}
        displayName={metadata.displayName}
        showTooltip={false}
        size={imageSize}
      />
    );
  }

  const Icon =
    ToolIcon ?? nativeIcons[metadata.type as keyof typeof nativeIcons] ?? Code2;
  return (
    <div
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-foreground',
        className,
      )}
      aria-label={metadata.displayName}
      data-flowcordia-native-node={metadata.type}
    >
      <Icon className="size-4" strokeWidth={1.8} />
    </div>
  );
};
