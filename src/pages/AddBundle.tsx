import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const AddBundle = () => {
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [duration, setDuration] = useState("");
    const [durationUnit, setDurationUnit] = useState("hours");
    const [price, setPrice] = useState("");
    const [currency, setCurrency] = useState("FCFA");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim() || !duration || !price) {
            toast({ title: "Please fill in all fields", variant: "destructive" });
            return;
        }
        toast({ title: "Bundle added successfully!" });
        navigate("/dashboard/k-bundles");
    };

    return (
        <div>
            {/* Breadcrumb */}
            <div className="bg-muted/40 px-6 py-3 border-b border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <button
                        onClick={() => navigate("/dashboard/k-bundles")}
                        className="hover:text-foreground transition-colors"
                    >
                        Bundles
                    </button>
                    <ChevronRight size={14} />
                    <span className="text-foreground font-medium">Add a new bundle</span>
                </div>
            </div>

            {/* Content */}
            <div className="p-6">
                <div className="bg-card rounded-xl border shadow-sm max-w-3xl mx-auto">
                    {/* Tab header */}
                    <div className="px-8 pt-6">
                        <div className="inline-flex">
                            <span className="text-sm font-semibold text-primary border-b-[3px] border-primary pb-3 px-1">
                                Bundle Information
                            </span>
                        </div>
                        <div className="border-b border-border -mx-8" />
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="px-8 py-8">
                        <h3 className="text-lg font-bold mb-6">Basic information</h3>

                        <div className="max-w-md mx-auto space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-sm font-medium">Name</Label>
                                <Input
                                    id="name"
                                    placeholder="Bundle Display Name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    maxLength={100}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="duration" className="text-sm font-medium">Duration</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="duration"
                                        type="number"
                                        min={0}
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value)}
                                    />
                                    <select
                                        id="durationUnit"
                                        value={durationUnit}
                                        onChange={(e) => setDurationUnit(e.target.value)}
                                        className="border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex h-10 w-full items-center justify-content rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="hours">Hours</option>
                                        <option value="days">Days</option>
                                        <option value="weeks">Weeks</option>
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="price" className="text-sm font-medium">Price</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="price"
                                        type="number"
                                        min={0}
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                    />
                                    <select
                                        id="currency"
                                        value={currency}
                                        onChange={(e) => setCurrency(e.target.value)}
                                        className="border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex h-10 w-full items-center justify-content rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="FCFA">FCFA</option>
                                        <option value="USD">USD</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-4">
                                <Button type="submit" className="w-full uppercase font-bold tracking-wide">
                                    Add Bundle
                                </Button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default AddBundle;
