import { t } from 'i18next';
import { PanelRightClose, PanelRight } from 'lucide-react';

import { useBuilderStateContext } from '@/app/builder/builder-hooks';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

type StepDataPanelViewToggleProps = {
  disabled?: boolean;
  className?: string;
};

const StepDataPanelViewToggle = ({
  disabled = false,
  className,
}: StepDataPanelViewToggleProps) => {
  const isMobile = useIsMobile();
  const [stepDataPanelView, setStepDataPanelView] = useBuilderStateContext(
    (state) => [state.stepDataPanelView, state.setStepDataPanelView],
  );

  const isSplit = stepDataPanelView === 'split';
  const ToggleIcon = isSplit ? PanelRightClose : PanelRight;
  const toggleLabel = isSplit ? t('Test panel') : t('Side by Side');
  if (isMobile) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => setStepDataPanelView(isSplit ? 'drawer' : 'split')}
      disabled={disabled}
      className={cn('text-sm shrink-0', className)}
      aria-label={toggleLabel}
    >
      <ToggleIcon className="size-4" />
      <span>{toggleLabel}</span>
    </Button>
  );
};

StepDataPanelViewToggle.displayName = 'StepDataPanelViewToggle';
export { StepDataPanelViewToggle };
