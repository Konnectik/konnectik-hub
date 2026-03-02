import { useLocation } from "react-router-dom";

const PlaceholderPage = () => {
  const location = useLocation();
  const pageName = location.pathname.split("/").pop()?.replace(/-/g, " ") || "Page";

  return (
    <div className="p-6">
      <div className="bg-card rounded-xl border p-12 text-center animate-fade-in">
        <h2 className="text-xl font-bold capitalize mb-2">{pageName}</h2>
        <p className="text-muted-foreground">This section is coming soon.</p>
      </div>
    </div>
  );
};

export default PlaceholderPage;
