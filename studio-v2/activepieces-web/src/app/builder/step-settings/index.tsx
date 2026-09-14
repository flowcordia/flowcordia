import { isNil } from '@activepieces/core-utils';
import {
  FlowAction,
  FlowActionType,
  FlowOperationType,
  FlowTrigger,
  FlowTriggerType,
  flowPieceUtil,
  flowStructureUtil,
} from '@activepieces/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import deepEqual from 'deep-equal';
import { t } from 'i18next';
import { useEffect, useRef, useState } from 'react';
import { useForm, Resolver } from 'react-hook-form';

import { useBuilderStateContext } from '@/app/builder/builder-hooks';
import { TextWithTooltip } from '@/components/custom/text-with-tooltip';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  stepsHooks,
  pieceSelectorUtils,
  formUtils,
  StudioNodeIcon,
  PieceStepMetadata,
} from '@/features/pieces';
import { projectCollectionUtils } from '@/features/projects';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn, GAP_SIZE_FOR_STEP_SETTINGS } from '@/lib/utils';

import { ActionErrorHandlingForm } from '../piece-properties/action-error-handling';
import { PieceSelector } from '../pieces-selector';
import { DynamicPropertiesProvider } from '../piece-properties/dynamic-properties-context';
import { SidebarHeader } from '../sidebar-header';
import { StepDataPanelHost } from '../step-data/step-data-panel-host';
import {
  ActionTestRunnerProvider,
  TriggerTestRunnerProvider,
} from '../test-step/test-runner-context';

import { AgentSettings } from './agent-settings';
import { CodeSettings } from './code-settings';
import EditableStepName from './editable-step-name';
import { LoopsSettings } from './loops-settings';
import { PieceSettings } from './piece-settings';
import { RouterSettings } from './router-settings';
import { StepNavigationButtons } from './step-navigation-buttons';
import { useStepSettingsContext } from './step-settings-context';
import { UpdatePieceVersionDialog } from './update-piece-version-dialog/update-piece-version-dialog';

const StepSettingsContainer = () => {
  const { selectedStep, pieceModel, formSchema } = useStepSettingsContext();
  const { project } = projectCollectionUtils.useCurrentProject();
  const [
    readonly,
    exitStepSettings,
    applyOperation,
    saving,
    flowVersion,
    selectedBranchIndex,
    setSelectedBranchIndex,
    run,
    isStepDataPanelOpen,
    setStepDataPanelOpen,
  ] = useBuilderStateContext((state) => [
    state.readonly,
    state.exitStepSettings,
    state.applyOperation,
    state.saving,
    state.flowVersion,
    state.selectedBranchIndex,
    state.setSelectedBranchIndex,
    state.run,
    state.isStepDataPanelOpen,
    state.setStepDataPanelOpen,
  ]);

  const { stepMetadata } = stepsHooks.useStepMetadata({
    step: selectedStep,
  });

  const selectedStepRef = useRef(selectedStep);
  selectedStepRef.current = selectedStep;

  const currentValuesRef = useRef<FlowAction | FlowTrigger>(selectedStep);
  const form = useForm<FlowAction | FlowTrigger>({
    mode: 'all',
    disabled: readonly,
    reValidateMode: 'onChange',
    defaultValues: selectedStep,
    resetOptions: {
      keepDefaultValues: false,
      keepDirtyValues: true,
    },
    resolver: async (values, context, options) => {
      const result = await (
        zodResolver(formSchema) as unknown as Resolver<FlowAction | FlowTrigger>
      )(values, context, options);

      const cleanedNewValues = formUtils.removeUndefinedFromInput(values);
      const cleanedCurrentValues = formUtils.removeUndefinedFromInput(
        currentValuesRef.current,
      );
      const valid = Object.keys(result.errors).length === 0;
      cleanedNewValues.valid = valid;
      if (
        cleanedNewValues.type === FlowTriggerType.EMPTY ||
        (isNil(pieceModel) &&
          (cleanedNewValues.type === FlowActionType.PIECE ||
            cleanedNewValues.type === FlowTriggerType.PIECE))
      ) {
        return result;
      }
      if (
        deepEqual(
          stripSampleData(cleanedNewValues),
          stripSampleData(cleanedCurrentValues),
        )
      ) {
        return result;
      }
      //We need to copy the object because the form is using the same object reference
      currentValuesRef.current = JSON.parse(JSON.stringify(cleanedNewValues));
      if (cleanedNewValues.type === FlowTriggerType.PIECE) {
        applyOperation({
          type: FlowOperationType.UPDATE_TRIGGER,
          request: {
            ...cleanedNewValues,
            valid,
          },
        });
      } else {
        applyOperation({
          type: FlowOperationType.UPDATE_ACTION,
          request: {
            ...cleanedNewValues,
            valid,
          },
        });
      }
      return result;
    },
  });

  const sidebarHeaderContainerRef = useRef<HTMLDivElement>(null);
  const modifiedStep = form.getValues();
  const isManualTrigger =
    modifiedStep.type === FlowTriggerType.PIECE &&
    pieceSelectorUtils.isManualTrigger({
      pieceName: modifiedStep.settings.pieceName,
      triggerName: modifiedStep.settings.triggerName ?? '',
    });
  const isEmptyTrigger = modifiedStep.type === FlowTriggerType.EMPTY;
  const showGenerateSampleData =
    !readonly && !isManualTrigger && !isEmptyTrigger;
  const showStepInputOutFromRun =
    !isNil(run) && !isManualTrigger && !isEmptyTrigger;

  const [isEditingStepOrBranchName, setIsEditingStepOrBranchName] =
    useState(false);
  const [activeInspectorTab, setActiveInspectorTab] = useState<
    'setup' | 'configure'
  >(selectedStep.type === FlowActionType.CODE ? 'configure' : 'setup');
  const showActionErrorHandlingForm =
    [FlowActionType.CODE, FlowActionType.PIECE].includes(
      modifiedStep.type as FlowActionType,
    ) && !isNil(stepMetadata);

  const runAgentStep =
    modifiedStep.settings.pieceName === '@activepieces/piece-ai' &&
    modifiedStep.settings.actionName === 'run_agent';

  useEffect(() => {
    //RHF doesn't automatically trigger validation when the form is rendered, so we need to trigger it manually
    form.trigger();
  }, []);

  const showTestPanel = showGenerateSampleData || showStepInputOutFromRun;

  const settingsForm = (
    <ScrollArea className="h-full">
      <div
        className={cn(
          'flex flex-col px-4 pb-6 pt-3',
          GAP_SIZE_FOR_STEP_SETTINGS,
        )}
      >
        {modifiedStep.type === FlowActionType.LOOP_ON_ITEMS && (
          <LoopsSettings readonly={readonly}></LoopsSettings>
        )}
        {modifiedStep.type === FlowActionType.CODE && (
          <CodeSettings readonly={readonly}></CodeSettings>
        )}
        {modifiedStep.type === FlowActionType.PIECE &&
          runAgentStep &&
          modifiedStep && (
            <AgentSettings
              step={modifiedStep}
              flowId={flowVersion.flowId}
              readonly={readonly}
            />
          )}
        {modifiedStep.type === FlowActionType.PIECE &&
          !runAgentStep &&
          modifiedStep && (
            <PieceSettings
              step={modifiedStep}
              flowId={flowVersion.flowId}
              readonly={readonly}
              section="configure"
            ></PieceSettings>
          )}
        {modifiedStep.type === FlowActionType.ROUTER && modifiedStep && (
          <RouterSettings readonly={readonly}></RouterSettings>
        )}
        {modifiedStep.type === FlowTriggerType.PIECE && modifiedStep && (
          <PieceSettings
            step={modifiedStep}
            flowId={flowVersion.flowId}
            readonly={readonly}
            section="configure"
          ></PieceSettings>
        )}
        {showActionErrorHandlingForm && (
          <ActionErrorHandlingForm
            hideContinueOnFailure={
              stepMetadata.type === FlowActionType.PIECE
                ? stepMetadata.errorHandlingOptions?.continueOnFailure?.hide
                : false
            }
            disabled={readonly}
            hideRetryOnFailure={
              stepMetadata.type === FlowActionType.PIECE
                ? stepMetadata.errorHandlingOptions?.retryOnFailure?.hide
                : false
            }
          ></ActionErrorHandlingForm>
        )}
      </div>
    </ScrollArea>
  );

  const isPieceStep =
    modifiedStep.type === FlowActionType.PIECE ||
    modifiedStep.type === FlowTriggerType.PIECE;
  const isTriggerStep = flowStructureUtil.isTrigger(modifiedStep.type);
  const pieceSelectorOperation = isTriggerStep
    ? ({ type: FlowOperationType.UPDATE_TRIGGER } as const)
    : ({
        type: FlowOperationType.UPDATE_ACTION,
        stepName: modifiedStep.name,
      } as const);

  const setupForm = (
    <ScrollArea className="h-full">
      <div className="flex flex-col gap-5 px-4 py-4">
        <section
          className="flex flex-col gap-2"
          data-flowcordia-region="setup-integration"
        >
          <div className="text-xs font-semibold uppercase text-muted-foreground">
            {t(isTriggerStep ? 'Trigger' : 'App and event')}
          </div>
          <div className="flex items-center gap-3 rounded-md border border-border bg-background p-3">
            {stepMetadata ? (
              <StudioNodeIcon metadata={stepMetadata} imageSize="md" />
            ) : null}
            <div className="min-w-0 grow">
              <TextWithTooltip
                tooltipMessage={stepMetadata?.displayName ?? t('Built-in tool')}
              >
                <div className="truncate text-sm font-semibold">
                  {stepMetadata?.displayName ?? t('Built-in tool')}
                </div>
              </TextWithTooltip>
              <TextWithTooltip
                tooltipMessage={
                  stepMetadata?.actionOrTriggerOrAgentDisplayName ||
                  stepMetadata?.description ||
                  modifiedStep.displayName
                }
              >
                <div className="truncate text-xs text-muted-foreground">
                  {stepMetadata?.actionOrTriggerOrAgentDisplayName ||
                    stepMetadata?.description ||
                    modifiedStep.displayName}
                </div>
              </TextWithTooltip>
            </div>
            {!readonly && (
              <PieceSelector
                id={`inspector-${modifiedStep.name}`}
                operation={pieceSelectorOperation}
                stepToReplacePieceDisplayName={stepMetadata?.displayName}
              >
                <Button type="button" variant="outline" size="sm">
                  {t('Change')}
                </Button>
              </PieceSelector>
            )}
          </div>
        </section>
        {isPieceStep && pieceModel?.auth && (
          <section
            className="flex flex-col gap-2"
            data-flowcordia-region="setup-connection"
          >
            <div className="text-xs font-semibold uppercase text-muted-foreground">
              {t('Connection')}
            </div>
            <PieceSettings
              step={modifiedStep}
              flowId={flowVersion.flowId}
              readonly={readonly}
              section="setup"
            />
          </section>
        )}
      </div>
    </ScrollArea>
  );

  return (
    <Form {...form}>
      <form
        data-flowcordia-region="step-settings"
        onSubmit={(e) => e.preventDefault()}
        onChange={(e) => e.preventDefault()}
        className="w-full h-full flex flex-col"
      >
        <div
          ref={sidebarHeaderContainerRef}
          className="relative z-10 bg-background"
        >
          <SidebarHeader
            onClose={() => exitStepSettings()}
            leadingIcon={
              stepMetadata ? (
                <StudioNodeIcon metadata={stepMetadata} imageSize="md" />
              ) : null
            }
            actions={
              <div className="flex items-center gap-1">
                {isPieceMetadata(stepMetadata) &&
                  stepMetadata.pieceVersion &&
                  (modifiedStep.type === FlowActionType.PIECE ||
                    modifiedStep.type === FlowTriggerType.PIECE) && (
                    <PieceVersionInHeader
                      step={modifiedStep}
                      pieceVersion={stepMetadata.pieceVersion}
                      readonly={readonly}
                    />
                  )}
                <StepNavigationButtons />
              </div>
            }
          >
            <EditableStepName
              selectedBranchIndex={selectedBranchIndex}
              stepIndex={flowStructureUtil.getStepNumber(
                flowVersion.trigger,
                selectedStep.name,
              )}
              setDisplayName={(value) => {
                form.setValue('displayName', value, {
                  shouldValidate: true,
                });
              }}
              readonly={readonly}
              displayName={modifiedStep.displayName}
              branchName={
                !isNil(selectedBranchIndex)
                  ? modifiedStep.settings.branches?.[selectedBranchIndex]
                      ?.branchName
                  : undefined
              }
              setBranchName={(value) => {
                if (!isNil(selectedBranchIndex)) {
                  form.setValue(
                    `settings.branches[${selectedBranchIndex}].branchName`,
                    value,
                    {
                      shouldValidate: true,
                    },
                  );
                }
              }}
              setSelectedBranchIndex={setSelectedBranchIndex}
              isEditingStepOrBranchName={isEditingStepOrBranchName}
              setIsEditingStepOrBranchName={setIsEditingStepOrBranchName}
              tooltipTitle={
                stepMetadata?.actionOrTriggerOrAgentDisplayName ||
                stepMetadata?.displayName
              }
              tooltipDescription={
                stepMetadata?.actionOrTriggerOrAgentDescription ||
                stepMetadata?.description
              }
              pieceVersion={
                isPieceMetadata(stepMetadata)
                  ? stepMetadata.pieceVersion
                  : undefined
              }
            ></EditableStepName>
          </SidebarHeader>
        </div>

        <DynamicPropertiesProvider
          key={`${selectedStep.name}-${selectedStep.type}`}
        >
          <StepTestRunnerProvider step={selectedStep}>
            <StepSettingsLayout
              activeTab={
                showTestPanel && isStepDataPanelOpen
                  ? 'test'
                  : activeInspectorTab
              }
              onTabChange={(tab) => {
                setStepDataPanelOpen(tab === 'test');
                if (tab !== 'test') setActiveInspectorTab(tab);
              }}
              showTestPanel={showTestPanel}
              setupForm={setupForm}
              settingsForm={settingsForm}
              testPanelHost={
                showTestPanel ? (
                  <StepDataPanelHost
                    mode="split"
                    flowId={flowVersion.flowId}
                    flowVersionId={flowVersion.id}
                    projectId={project?.id}
                    stepType={modifiedStep.type}
                    showGenerateSampleData={showGenerateSampleData}
                    showStepInputOutFromRun={showStepInputOutFromRun}
                    saving={saving}
                  />
                ) : null
              }
            />
          </StepTestRunnerProvider>
        </DynamicPropertiesProvider>
      </form>
    </Form>
  );
};
StepSettingsContainer.displayName = 'StepSettingsContainer';
export { StepSettingsContainer };

type StepSettingsLayoutProps = {
  activeTab: 'setup' | 'configure' | 'test';
  onTabChange: (tab: 'setup' | 'configure' | 'test') => void;
  showTestPanel: boolean;
  setupForm: React.ReactNode;
  settingsForm: React.ReactNode;
  testPanelHost: React.ReactNode;
};

const StepSettingsLayout = ({
  activeTab,
  onTabChange,
  showTestPanel,
  setupForm,
  settingsForm,
  testPanelHost,
}: StepSettingsLayoutProps) => {
  const isMobile = useIsMobile();
  const stepDataPanelView = useBuilderStateContext(
    (state) => state.stepDataPanelView,
  );
  const showConfigurationBesideTest =
    activeTab === 'test' && stepDataPanelView === 'split' && !isMobile;
  return (
    <Tabs
      value={activeTab}
      onValueChange={(value) =>
        onTabChange(value as 'setup' | 'configure' | 'test')
      }
      className="flex min-h-0 flex-1 flex-col"
      data-flowcordia-region="inspector-tabs"
    >
      <TabsList className="h-11 w-full shrink-0 justify-start rounded-none border-b border-border bg-background px-3">
        <TabsTrigger value="setup" className="h-11 rounded-none px-3">
          {t('Setup')}
        </TabsTrigger>
        <TabsTrigger value="configure" className="h-11 rounded-none px-3">
          {t('Configure')}
        </TabsTrigger>
        {showTestPanel && (
          <TabsTrigger value="test" className="h-11 rounded-none px-3">
            {t('Test')}
          </TabsTrigger>
        )}
      </TabsList>
      <div
        className={cn(
          'min-h-0 flex-1',
          showConfigurationBesideTest && 'grid grid-cols-2',
        )}
      >
        <TabsContent
          value="setup"
          forceMount
          className="m-0 h-full data-[state=inactive]:hidden"
        >
          {setupForm}
        </TabsContent>
        <TabsContent
          value="configure"
          forceMount
          className={cn(
            'm-0 h-full min-w-0',
            activeTab !== 'configure' &&
              !showConfigurationBesideTest &&
              'hidden',
          )}
        >
          {settingsForm}
        </TabsContent>
        {showTestPanel && (
          <TabsContent
            value="test"
            forceMount
            className="m-0 h-full p-2 data-[state=inactive]:hidden"
          >
            {testPanelHost}
          </TabsContent>
        )}
      </div>
    </Tabs>
  );
};

type PieceVersionInHeaderProps = {
  step: FlowAction | FlowTrigger;
  pieceVersion: string;
  readonly: boolean;
};

const PieceVersionInHeader = ({
  step,
  pieceVersion,
  readonly,
}: PieceVersionInHeaderProps) => {
  const exactVersion = flowPieceUtil.getExactVersion(pieceVersion);
  const showSwitcher =
    !readonly &&
    (step.type === FlowActionType.PIECE || step.type === FlowTriggerType.PIECE);
  return (
    <div className="flex items-center gap-1 shrink-0">
      <Badge
        variant="outline"
        className="h-5 px-1.5 text-[10px] font-semibold uppercase text-muted-foreground"
        title={t('Integration version {version}', { version: exactVersion })}
      >
        {t('Beta')}
      </Badge>
      {showSwitcher && (
        <UpdatePieceVersionDialog step={step} currentVersion={exactVersion} />
      )}
    </div>
  );
};

const isFlowActionStep = (step: FlowAction | FlowTrigger): step is FlowAction =>
  flowStructureUtil.isAction(step.type);

const StepTestRunnerProvider = ({
  step,
  children,
}: {
  step: FlowAction | FlowTrigger;
  children: React.ReactNode;
}) => {
  if (isFlowActionStep(step)) {
    return (
      <ActionTestRunnerProvider step={step} key={step.name}>
        {children}
      </ActionTestRunnerProvider>
    );
  }
  return (
    <TriggerTestRunnerProvider step={step} key={step.name}>
      {children}
    </TriggerTestRunnerProvider>
  );
};

const stripSampleData = (step: FlowAction | FlowTrigger) => {
  const { sampleData: _, ...settingsWithoutSampleData } = step.settings;
  const { lastUpdatedDate: __, ...stepWithoutMetadata } = step;

  return { ...stepWithoutMetadata, settings: settingsWithoutSampleData };
};

const isPieceMetadata = (
  metadata: { type: FlowActionType | FlowTriggerType } | undefined,
): metadata is PieceStepMetadata =>
  metadata?.type === FlowActionType.PIECE ||
  metadata?.type === FlowTriggerType.PIECE;
