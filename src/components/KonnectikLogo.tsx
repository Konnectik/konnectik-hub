import { Wifi } from "lucide-react";

const KonnectikLogo = ({ size = "md" }: { size?: "sm" | "md" | "lg" }) => {
  const sizeMap = { sm: "h-8 w-8", md: "h-12 w-12", lg: "h-16 w-16" };
  const iconMap = { sm: 14, md: 20, lg: 28 };

  return (
    <div className={`${sizeMap[size]} rounded-lg bg-primary flex items-center justify-center relative`}>
      <span className="text-primary-foreground font-bold text-lg">K</span>
      <Wifi className="absolute -top-1 -right-1 text-primary" size={iconMap[size]} />
    </div>
  );
};

export default KonnectikLogo;
