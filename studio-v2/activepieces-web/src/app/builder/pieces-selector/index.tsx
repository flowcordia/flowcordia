import { isNil } from '@activepieces/core-utils';
import { FlowOperationType, FlowTriggerType } from '@activepieces/shared';
import { t } from 'i18next';
import {
  CheckCircle2Icon,
  Code2Icon,
  DatabaseIcon,
  LayoutGridIcon,
  PuzzleIcon,
  SparklesIcon,
  TimerResetIcon,
  WrenchIcon,
} from 'lucide-react';
import React, { useEffect, useRef } from 'react';
import { useDebounce } from 'use-debounce';

import { useBuilderStateContext } from '@/app/builder/builder-hooks';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  PiecesSearchInput,
  PieceSelectorTabs,
  PieceSelectorTabsProvider,
  PieceSelectorTabType,
  PieceSelectorOperation,
  pieceSelectorUtils,
  pieceSelectorCustomization,
  PieceSearchProvider,
  usePieceSearchContext,
} from '@/features/pieces';
import { aiProviderQueries } from '@/features/platform-admin';
import { platformHooks } from '@/hooks/platform-hooks';
import { useIsMobile } from '@/hooks/use-mobile';

import { AITabContent } from './ai-tab-content';
import { ApprovalsTabContent } from './approvals-tab-content';
import { ExploreTabContent } from './explore-tab-content';
import { PiecesCardList } from './pieces-card-list';

const getTabsList = (
  operationType: FlowOperationType,
  agentsEnabled: boolean,
) => {
  const replaceOrAddAction = [
    FlowOperationType.ADD_ACTION,
    FlowOperationType.UPDATE_ACTION,
  ].includes(operationType);
  const baseTabs = [
    {
      value: PieceSelectorTabType.EXPLORE,
      name: replaceOrAddAction ? t('Popular') : t('Start'),
      icon: <LayoutGridIcon className="size-5" />,
    },
    {
      value: PieceSelectorTabType.APPS,
      name: t('Integrations'),
      icon: <PuzzleIcon className="size-5" />,
    },
  ];

  if (replaceOrAddAction && agentsEnabled) {
    baseTabs.splice(1, 0, {
      value: PieceSelectorTabType.AI_AND_AGENTS,
      name: t('AI'),
      icon: <SparklesIcon className="size-5" />,
    });
  }
  if (replaceOrAddAction) {
    baseTabs.push(
      {
        value: PieceSelectorTabType.DATA,
        name: t('Data'),
        icon: <DatabaseIcon className="size-5" />,
      },
      {
        value: PieceSelectorTabType.UTILITY,
        name: t('Logic'),
        icon: <WrenchIcon className="size-5" />,
      },
    );
  }
  baseTabs.push(
    {
      value: PieceSelectorTabType.TIMING,
      name: t('Timing'),
      icon: <TimerResetIcon className="size-5" />,
    },
    {
      value: PieceSelectorTabType.CODE,
      name: t('Code & API'),
      icon: <Code2Icon className="size-5" />,
    },
  );
  if (replaceOrAddAction) {
    baseTabs.push({
      value: PieceSelectorTabType.APPROVALS,
      name: t('Approvals'),
      icon: <CheckCircle2Icon className="size-5" />,
    });
  }
  return baseTabs;
};

type PieceSelectorProps = {
  children: React.ReactNode;
  id: string;
  operation: PieceSelectorOperation;
  openSelectorOnClick?: boolean;
  stepToReplacePieceDisplayName?: string;
};

const PieceSelectorWrapper = (props: PieceSelectorProps) => {
  return (
    <PieceSearchProvider>
      <PieceSelectorContent {...props} />
    </PieceSearchProvider>
  );
};

const PieceSelectorContent = ({
  children,
  operation,
  id,
  openSelectorOnClick = true,
  stepToReplacePieceDisplayName,
}: PieceSelectorProps) => {
  const [
    openedPieceSelectorStepNameOrAddButtonId,
    setOpenedPieceSelectorStepNameOrAddButtonId,
    setSelectedPieceMetadataInPieceSelector,
    isForEmptyTrigger,
    deselectStep,
  ] = useBuilderStateContext((state) => [
    state.openedPieceSelectorStepNameOrAddButtonId,
    state.setOpenedPieceSelectorStepNameOrAddButtonId,
    state.setSelectedPieceMetadataInPieceSelector,
    state.flowVersion.trigger.type === FlowTriggerType.EMPTY &&
      id === 'trigger',
    state.deselectStep,
  ]);
  const { searchQuery, setSearchQuery } = usePieceSearchContext();
  const isForReplace =
    operation.type === FlowOperationType.UPDATE_ACTION ||
    (operation.type === FlowOperationType.UPDATE_TRIGGER && !isForEmptyTrigger);
  const [debouncedQuery] = useDebounce(searchQuery, 300);
  const isOpen = openedPieceSelectorStepNameOrAddButtonId === id;
  const isMobile = useIsMobile();
  const { listHeightRef, popoverTriggerRef } =
    pieceSelectorUtils.useAdjustPieceListHeightToAvailableSpace();
  const listHeight = Math.min(listHeightRef.current, 400);
  const searchInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [isOpen]);
  const { data: aiProviders } = aiProviderQueries.useAiProviders();
  const clearSearch = () => {
    setSearchQuery('');
    setSelectedPieceMetadataInPieceSelector(null);
  };

  const { platform } = platformHooks.useCurrentPlatform();
  const tabsList = pieceSelectorCustomization.buildResolvedTabs({
    availableBuiltinTabs: getTabsList(
      operation.type,
      platform.plan.agentsEnabled &&
        !isNil(aiProviders) &&
        aiProviders.length > 0,
    ),
    config: platform.pieceSelectorConfig,
  });
  const firstTab = tabsList[0];

  return (
    <Popover
      open={isOpen}
      modal={false}
      onOpenChange={(open) => {
        if (open) {
          setOpenedPieceSelectorStepNameOrAddButtonId(id);
          return;
        }
        clearSearch();
        setOpenedPieceSelectorStepNameOrAddButtonId(null);
        if (isForEmptyTrigger) {
          deselectStep();
        }
      }}
    >
      <PopoverTrigger
        ref={popoverTriggerRef}
        asChild={true}
        onClick={() => {
          if (openSelectorOnClick) {
            setOpenedPieceSelectorStepNameOrAddButtonId(id);
          }
        }}
      >
        {children}
      </PopoverTrigger>

      <PieceSelectorTabsProvider
        initiallySelectedTab={
          isForReplace || isMobile
            ? PieceSelectorTabType.NONE
            : (firstTab?.type ?? PieceSelectorTabType.EXPLORE)
        }
        initiallySelectedCustomTabId={
          isForReplace || isMobile ? null : (firstTab?.customTabId ?? null)
        }
        onTabChange={clearSearch}
        key={isOpen ? 'open' : 'closed'}
      >
        <PopoverContent
          data-flowcordia-region="node-library"
          collisionPadding={{ top: 60, bottom: 12, left: 8, right: 8 }}
          onContextMenu={(e) => {
            e.stopPropagation();
          }}
          onInteractOutside={(e) => {
            if (e.detail.originalEvent.type === 'focusin') {
              e.preventDefault();
            }
          }}
          className="w-[340px] md:w-[720px] p-0"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <>
            <div data-flowcordia-region="node-library-header">
              <div className="flex items-center justify-between px-3 pb-1 pt-3">
                <div>
                  <div className="text-sm font-semibold">
                    {isForReplace ? t('Replace step') : t('Add a step')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('Choose an integration or built-in tool')}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className="h-5 px-1.5 text-[10px] uppercase"
                >
                  {t('Beta')}
                </Badge>
              </div>
              <PiecesSearchInput
                searchInputRef={searchInputRef}
                onSearchChange={(e) => {
                  setSelectedPieceMetadataInPieceSelector(null);
                  if (e === '') {
                    clearSearch();
                  }
                }}
              />
              {!isMobile && <PieceSelectorTabs tabs={tabsList} />}
              <Separator orientation="horizontal" className="mt-1" />
            </div>
            <div
              className="flex min-h-0 flex-row max-h-[400px]"
              style={{
                height: listHeight + 'px',
              }}
            >
              <ExploreTabContent operation={operation} />
              <AITabContent operation={operation} />
              <ApprovalsTabContent operation={operation} />

              <PiecesCardList
                //this is done to avoid debounced results when user clears search
                searchQuery={searchQuery === '' ? '' : debouncedQuery}
                operation={operation}
                stepToReplacePieceDisplayName={
                  isMobile ? undefined : stepToReplacePieceDisplayName
                }
              />
            </div>
          </>
        </PopoverContent>
      </PieceSelectorTabsProvider>
    </Popover>
  );
};

export { PieceSelectorWrapper as PieceSelector };
