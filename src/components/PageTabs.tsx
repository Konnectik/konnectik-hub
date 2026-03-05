interface PageTabsProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const PageTabs = ({ tabs, activeTab, onTabChange }: PageTabsProps) => {
  return (
    <div className="bg-muted/40 px-6 pt-2">
      <div className="flex items-end gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`px-5 py-2.5 text-sm font-medium transition-all relative ${
                isActive
                  ? "bg-background text-primary rounded-t-lg border border-b-0 border-border -mb-px z-10 border-t-[3px] border-t-primary shadow-sm"
                  : "text-muted-foreground hover:text-foreground rounded-t-lg hover:bg-background/50"
              }`}
            >
              {tab}
            </button>
          );
        })}
      </div>
      <div className="border-b border-border -mx-6" />
    </div>
  );
};

export default PageTabs;
