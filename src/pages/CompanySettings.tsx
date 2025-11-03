import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import "@/styles/quill.css";

const CompanySettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [companyDetails, setCompanyDetails] = useState("");
  const [bankDetails, setBankDetails] = useState("");
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchTenantInfo = async () => {
      if (!user) return;

      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("tenant_id")
          .eq("user_id", user.id)
          .single();

        if (profile?.tenant_id) {
          setTenantId(profile.tenant_id);
          
          const { data: tenant } = await supabase
            .from("tenants")
            .select("name, logo_url, company_details, bank_details")
            .eq("id", profile.tenant_id)
            .single();

          if (tenant) {
            setCompanyName(tenant.name || "");
            setLogoUrl(tenant.logo_url || null);
            setCompanyDetails(tenant.company_details || "");
            setBankDetails(tenant.bank_details || "");
          }
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to load company settings",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchTenantInfo();
  }, [user, toast]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!tenantId || acceptedFiles.length === 0) return;

    setUploading(true);
    const file = acceptedFiles[0];

    try {
      // Delete old logo if exists
      if (logoUrl) {
        const oldPath = logoUrl.split('/').slice(-2).join('/');
        await supabase.storage.from('company-logos').remove([oldPath]);
      }

      // Upload new logo
      const fileExt = file.name.split('.').pop();
      const fileName = `${tenantId}/logo.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('company-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('company-logos')
        .getPublicUrl(fileName);

      // Update tenant with logo URL
      const { error: updateError } = await supabase
        .from('tenants')
        .update({ logo_url: publicUrl })
        .eq('id', tenantId);

      if (updateError) throw updateError;

      setLogoUrl(publicUrl);
      toast({
        title: "Success",
        description: "Logo uploaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  }, [tenantId, logoUrl, toast]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.svg']
    },
    maxFiles: 1,
    disabled: uploading
  });

  const handleRemoveLogo = async () => {
    if (!tenantId || !logoUrl) return;

    setUploading(true);
    try {
      const path = logoUrl.split('/').slice(-2).join('/');
      await supabase.storage.from('company-logos').remove([path]);

      const { error } = await supabase
        .from('tenants')
        .update({ logo_url: null })
        .eq('id', tenantId);

      if (error) throw error;

      setLogoUrl(null);
      toast({
        title: "Success",
        description: "Logo removed successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("tenants")
        .update({ 
          name: companyName,
          company_details: companyDetails,
          bank_details: bankDetails
        })
        .eq("id", tenantId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Company settings updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
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
          <CardDescription>
            Manage your company information and preferences
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="companyName">Company Name</Label>
              <Input
                id="companyName"
                type="text"
                placeholder="Your Company Name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Company Logo</Label>
              {logoUrl ? (
                <div className="space-y-2">
                  <div className="relative w-48 h-48 border rounded-lg overflow-hidden">
                    <img src={logoUrl} alt="Company logo" className="w-full h-full object-contain" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2"
                      onClick={handleRemoveLogo}
                      disabled={uploading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'
                  } ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
                >
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
              <Label htmlFor="companyDetails">Company Details</Label>
              <div className="border rounded-md">
                <ReactQuill
                  theme="snow"
                  value={companyDetails}
                  onChange={setCompanyDetails}
                  placeholder="Enter company details (address, contact, etc.)"
                  className="bg-background"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This information will appear in the "From" section of exported PDFs
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bankDetails">Bank Details</Label>
              <div className="border rounded-md">
                <ReactQuill
                  theme="snow"
                  value={bankDetails}
                  onChange={setBankDetails}
                  placeholder="Enter bank details (account name, number, etc.)"
                  className="bg-background"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                This information will appear in the bank details section of exported PDFs
              </p>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default CompanySettings;
