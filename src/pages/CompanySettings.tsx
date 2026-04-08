import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import "@/styles/quill.css";

const CompanySettings = () => {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [companyDetails, setCompanyDetails] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (profile?.tenant) {
      setCompanyName(profile.tenant.name || "");
      setLogoUrl(profile.tenant.logo_url || null);
      setCompanyDetails(profile.tenant.company_details || "");
      setBankDetails(profile.tenant.bank_details || "");
    }
  }, [profile]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!acceptedFiles.length) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", acceptedFiles[0]);
      const { data } = await api.post("/auth/logo/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setLogoUrl(data.logo_url);
      await refreshProfile();
      toast({ title: "Success", description: "Logo uploaded successfully" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [refreshProfile, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".svg"] },
    maxFiles: 1,
    disabled: uploading,
  });

  const handleRemoveLogo = async () => {
    setUploading(true);
    try {
      await api.delete("/auth/logo/delete/");
      setLogoUrl(null);
      await refreshProfile();
      toast({ title: "Success", description: "Logo removed successfully" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch("/auth/tenant/", {
        name: companyName,
        company_details: companyDetails,
        bank_details: bankDetails,
      });
      await refreshProfile();
      toast({ title: "Success", description: "Company settings updated successfully" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match.", variant: "destructive" });
      return;
    }
    setChangingPassword(true);
    try {
      const { data } = await api.post("/auth/change-password/", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      localStorage.setItem("access_token", data.access);
      localStorage.setItem("refresh_token", data.refresh);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({ title: "Success", description: "Password changed successfully." });
    } catch (e: any) {
      const msg = e.response?.data?.error || "Failed to change password.";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setChangingPassword(false);
    }
  };

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Company Settings</CardTitle>
          <CardDescription>Manage your company information and preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input id="companyName" type="text" placeholder="Your Company Name" value={companyName}
                onChange={(e) => setCompanyName(e.target.value)} required />
            </div>

            <div className="space-y-2">
              <Label>Company Logo</Label>
              {logoUrl ? (
                <div className="space-y-2">
                  <div className="relative w-48 h-48 border rounded-lg overflow-hidden">
                    <img src={logoUrl} alt="Company logo" className="w-full h-full object-contain" />
                    <Button type="button" variant="destructive" size="icon"
                      className="absolute top-2 right-2" onClick={handleRemoveLogo} disabled={uploading}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"} ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
                  <input {...getInputProps()} />
                  <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  {uploading ? (
                    <p className="text-sm text-muted-foreground">Uploading...</p>
                  ) : isDragActive ? (
                    <p className="text-sm text-muted-foreground">Drop the logo here</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium mb-1">Drop your logo here, or click to select</p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, JPEG or SVG (max 5MB)</p>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Company Details</Label>
              <div className="border rounded-md">
                <ReactQuill theme="snow" value={companyDetails} onChange={setCompanyDetails}
                  placeholder="Enter company details (address, contact, etc.)" className="bg-background" />
              </div>
              <p className="text-xs text-muted-foreground">Appears in the "From" section of exported PDFs</p>
            </div>

            <div className="space-y-2">
              <Label>Bank Details</Label>
              <div className="border rounded-md">
                <ReactQuill theme="snow" value={bankDetails} onChange={setBankDetails}
                  placeholder="Enter bank details" className="bg-background" />
              </div>
              <p className="text-xs text-muted-foreground">Appears in the bank details section of exported PDFs</p>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current password</Label>
              <Input id="current-password" type="password" value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)} required />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="new-password">New password</Label>
              <Input id="new-password" type="password" placeholder="Min. 8 characters"
                value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
                required minLength={8} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input id="confirm-password" type="password" value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            <Button type="submit" disabled={changingPassword}>
              {changingPassword ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Changing...</> : "Change Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanySettings;
