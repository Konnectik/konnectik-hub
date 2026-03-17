import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronRight, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase, SUPABASE_ANON_KEY } from "@/integrations/supabase/client";

const AddUser = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [name, setName] = useState("");
  const [gender, setGender] = useState("male");
  const [phone, setPhone] = useState("");
  const [DOB, setDOB] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState(location.state?.role || "user");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !DOB || !email.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error("Your session expired. Please sign in again.");
      }

      const { data, error } = await supabase.functions.invoke("admin-create-user", {
        headers: {
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          "x-user-authorization": `Bearer ${accessToken}`,
        },
        body: {
          email,
          full_name: name,
          phone,
          gender,
          date_of_birth: DOB,
          role,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast({ title: "User created and magic link sent successfully!" });
      navigate("/dashboard/users");
    } catch (err: any) {
      toast({
        title: "Failed to create user",
        description: err.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
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
          <div className="px-8 pt-6">
            <h3 className="text-lg font-bold">User Information</h3>
            <div className="border-b border-border mt-4 -mx-8" />
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-8">
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
                    type="email"
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
                    className="border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex h-10 w-full items-center rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
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
            <div className="pt-6 flex justify-end max-w-2xl mx-auto">
              <Button type="submit" className="uppercase font-bold tracking-wide" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating user...
                  </>
                ) : (
                  "Send Invitation"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddUser;
