import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Lock, Eye, EyeOff } from "lucide-react";
import AvatarUpload from "@/components/AvatarUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    address: "",
    company: "",
    gender: "" as string,
    date_of_birth: "",
  });
  const [passwords, setPasswords] = useState({
    newPassword: "",
    confirmPassword: "",
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || "",
        phone: profile.phone || "",
        address: profile.address || "",
        company: profile.company || "",
        gender: profile.gender || "",
        date_of_birth: profile.date_of_birth || "",
      });
    }
  }, [profile]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name,
        phone: form.phone || null,
        address: form.address || null,
        company: form.company || null,
        gender: form.gender || null,
        date_of_birth: form.date_of_birth || null,
      })
      .eq("id", user.id);

    setSaving(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated" });
      window.location.reload();
    }
  };

  const handlePasswordChange = async () => {
    if (passwords.newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: passwords.newPassword });
    setChangingPassword(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated successfully" });
      setPasswords({ newPassword: "", confirmPassword: "" });
    }
  };

  return (
    <div className="space-y-6 px-6 py-4">
      <div className="flex items-center gap-3 max-w-lg mx-auto">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} />
        </Button>
        <h1 className="text-2xl font-bold text-foreground">Profile Settings</h1>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 max-w-lg mx-auto space-y-5">
        <div className="flex justify-center">
          <AvatarUpload />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input value={user?.email || ""} disabled className="opacity-60" />
        </div>
        <div className="space-y-1.5">
          <Label>Full Name</Label>
          <Input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Phone</Label>
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="e.g. +254 700 000000"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Address</Label>
          <Input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="Your address"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Company</Label>
          <Input
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            placeholder="Company or business name"
          />
        </div>
        {profile?.terms_agreed_at && (
          <div className="space-y-1.5">
            <Label>Terms & Policy Agreed</Label>
            <Input
              value={new Date(profile.terms_agreed_at).toLocaleString()}
              disabled
              className="opacity-60"
            />
          </div>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Gender</Label>
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className="border-input bg-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-ring flex h-10 w-full items-center rounded-md border px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>Date of Birth</Label>
            <Input
              type="date"
              value={form.date_of_birth}
              onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })}
            />
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save size={16} />
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>

      <div className="bg-card rounded-xl border border-border p-6 max-w-lg mx-auto space-y-5">
        <div className="flex items-center gap-2">
          <Lock size={18} className="text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Change Password</h2>
        </div>
        <div className="space-y-1.5">
          <Label>New Password</Label>
          <div className="relative">
            <Input
              type={showNewPassword ? "text" : "password"}
              value={passwords.newPassword}
              onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
              placeholder="Min. 6 characters"
              className="pr-10"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-2 flex items-center justify-center text-muted-foreground"
              onClick={() => setShowNewPassword((prev) => !prev)}
              aria-label={showNewPassword ? "Hide password" : "Show password"}
            >
              {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Confirm New Password</Label>
          <div className="relative">
            <Input
              type={showConfirmPassword ? "text" : "password"}
              value={passwords.confirmPassword}
              onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
              placeholder="Re-enter new password"
              className="pr-10"
            />
            <button
              type="button"
              className="absolute inset-y-0 right-2 flex items-center justify-center text-muted-foreground"
              onClick={() => setShowConfirmPassword((prev) => !prev)}
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>
        <Button onClick={handlePasswordChange} disabled={changingPassword} className="gap-2">
          <Lock size={16} />
          {changingPassword ? "Updating…" : "Update Password"}
        </Button>
      </div>
    </div>
  );
};

export default ProfileSettings;
