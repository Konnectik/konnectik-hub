interface PageTabsProps {
  tabs: string[];
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const PageTabs = ({ tabs, activeTab, onTabChange }: PageTabsProps) => {
  return (
    <div className="bg-muted/40 px-6 py-3">
      <div className="flex items-center gap-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`px-5 py-3 text-sm transition-all relative rounded-lg ${
                isActive
                  ? "bg-tab-active-bg text-tab-active font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50 font-medium"
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
