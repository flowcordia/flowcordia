import { Tabs, TabsTrigger, TabsList } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

import {
  PieceSelectorTabType,
  usePieceSelectorTabs,
} from '../stores/piece-selector-tabs-provider';
import { ResolvedPieceSelectorTab } from '../utils/piece-selector-customization';

export const PieceSelectorTabs = ({
  tabs,
}: {
  tabs: ResolvedPieceSelectorTab[];
}) => {
  const { selectedTab, selectedCustomTabId, setSelectedTab } =
    usePieceSelectorTabs();
  const selectedTabKey =
    selectedTab === PieceSelectorTabType.CUSTOM
      ? (selectedCustomTabId ?? '')
      : selectedTab;
  return (
    <Tabs
      value={selectedTabKey}
      onValueChange={(value) => {
        const tab = tabs.find((candidate) => candidate.key === value);
        if (tab) {
          setSelectedTab(tab.type, tab.customTabId ?? null);
        }
      }}
      className="w-full min-w-0"
    >
      <TabsList
        data-flowcordia-region="node-library-tabs"
        className="h-full w-full flex gap-1 px-2 justify-start rounded-none bg-background overflow-x-auto [&::-webkit-scrollbar]:hidden [scrollbar-width:none]"
      >
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.key}
            value={tab.key}
            data-flowcordia-tab={tab.type}
            className={cn(
              'flex flex-row h-9 rounded-md w-auto max-w-none shrink-0 gap-2 px-3',
              'hover:bg-muted data-[state=active]:text-primary-foreground data-[state=active]:shadow-none',
              'border-transparent data-[state=active]:border-primary data-[state=active]:bg-primary',
              'text-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0',
            )}
          >
            {tab.icon}
            <span className="text-sm truncate text-left">{tab.name}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};
