import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronRight, RefreshCw, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const AddUser = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [gender, setGender] = useState("male");
  const [phone, setPhone] = useState("");
  const [DOB, setDOB] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(location.state?.role || "user");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
    let result = "";
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setPassword(result);
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !DOB || !email.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    setStep(2);
  };

  const handleSendInvitation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      toast({ title: "Please create a password", variant: "destructive" });
      return;
    }
    // Here you can send the invitation or submit data
    toast({ title: "Invitation sent successfully!" });
    navigate("/dashboard/users");
  };

  return (
    <div>
      {/* Breadcrumb */}
        <div className="bg-muted/40 px-6 py-3 border-b border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <button
                    onClick={() => navigate("/dashboard/users")}
                    className="hover:text-foreground transition-colors"
                    >
                    Users
                </button>
                <ChevronRight size={14} />
                <span className="text-foreground font-medium">Add a new user</span>
            </div>
        </div>

        {/* Content */}
        <div className="p-6">
            <div className="bg-card rounded-xl border shadow-sm max-w-3xl mx-auto">
            {/* Tab header */}
            <div className="px-8 pt-6">
                <div className="flex items-end gap-0.5">
                    <span className={`px-5 py-2.5 text-sm font-semibold pb-3 ${step === 1 ? 'text-primary border-b-[3px] border-primary' : 'text-muted-foreground'}`}>
                        1. User Information
                    </span>
                    <span className={`px-5 py-2.5 text-sm font-semibold pb-3 ${step === 2 ? 'text-primary border-b-[3px] border-primary' : 'text-muted-foreground'}`}>
                        2. Send Invitation Link
                    </span>
                </div>
                <div className="border-b border-border -mx-8" />
            </div>

            {/* Form */}
            <form onSubmit={step === 1 ? handleNextStep : handleSendInvitation} className="px-8 py-8">
                {step === 1 ? (
                    <>
                        <h3 className="text-lg font-bold mb-6">Basic information</h3>
                        <div className="grid grid-cols-2 gap-5 max-w-2xl mx-auto">
                            {/* Left Column */}
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Full name</Label>
                                    <Input
                                        id="name"
                                        placeholder="Enter full name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone number</Label>
                                    <Input
                                        id="phone"
                                        placeholder="+237 6XX XX XX XX"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email address</Label>
                                    <Input
                                        id="email"
                                        placeholder="Enter email address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Right Column */}
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <Label htmlFor="gender">Gender</Label>
                                    <select
                                        id="gender"
                                        value={gender}
                                        onChange={(e) => setGender(e.target.value)}
                                        className="border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex h-10 w-full items-center justify-content rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="dob">Date of Birth</Label>
                                    <Input
                                        id="dob"
                                        type="date"
                                        value={DOB}
                                        onChange={(e) => setDOB(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="pt-4 flex justify-end max-w-2xl mx-auto">
                            <Button type="submit" className="uppercase font-bold tracking-wide">
                                Next Step
                            </Button>
                        </div>
                    </>
                ) : (
                    <>
                        <h3 className="text-lg font-bold mb-6">Create Password</h3>
                        <div className="max-w-md mx-auto space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Enter password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    <Button type="button" variant="outline" onClick={generatePassword}>
                                        <RefreshCw size={16} className="mr-2" />
                                        Generate
                                    </Button>
                                </div>
                            </div>
                        </div>
                        <div className="pt-4 flex justify-end max-w-2xl mx-auto">
                            <Button type="submit" className="uppercase font-bold tracking-wide">
                                Send Invitation
                            </Button>
                        </div>
                    </>
                )}
            </form>
            </div>
        </div>
    </div>
  );
};

export default AddUser;
