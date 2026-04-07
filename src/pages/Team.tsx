import { useState, useEffect } from "react";
import api from "@/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { UserPlus, Trash2, Copy, Mail } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().trim().email({ message: "Invalid email address" }).max(255);

interface Member { id: string; email: string; created_at: string; }
interface Invitation { id: string; email: string; status: string; expires_at: string; created_at: string; token: string; }

const Team = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => { loadTeamData(); }, []);

  const loadTeamData = async () => {
    const [membersRes, invitationsRes] = await Promise.all([
      api.get("/auth/team/"),
      api.get("/auth/invitations/?status=pending"),
    ]);
    setMembers(membersRes.data.results ?? membersRes.data);
    setInvitations(invitationsRes.data.results ?? invitationsRes.data);
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const validatedEmail = emailSchema.parse(email);
      await api.post("/auth/invitations/", { email: validatedEmail });
      toast({ title: "Success", description: "Invitation created successfully" });
      setEmail("");
      loadTeamData();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({ title: "Validation Error", description: error.errors[0].message, variant: "destructive" });
      } else {
        toast({ title: "Error", description: error.response?.data?.detail || error.message, variant: "destructive" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvitation = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/auth/invitations/${deleteId}/`);
      toast({ title: "Success", description: "Invitation deleted successfully" });
      loadTeamData();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setDeleteId(null);
    }
  };

  const copyInvitationLink = (token: string) => {
    const inviteUrl = `${window.location.origin}/auth?invite=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    toast({ title: "Copied!", description: "Invitation link copied to clipboard" });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5" />Invite Team Member</CardTitle>
          <CardDescription>Send an invitation to add a new member to your team</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="colleague@company.com"
                value={email} onChange={(e) => setEmail(e.target.value)} required maxLength={255} />
            </div>
            <Button type="submit" disabled={loading}>
              <Mail className="w-4 h-4 mr-2" />{loading ? "Sending..." : "Send Invitation"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Team Members ({members.length})</CardTitle>
          <CardDescription>People who have access to this workspace</CardDescription>
        </CardHeader>
        <CardContent>
          {members.length > 0 ? (
            <Table>
              <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Joined</TableHead></TableRow></TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">
                      {member.email}
                      {member.id === user?.id && <Badge variant="secondary" className="ml-2">You</Badge>}
                    </TableCell>
                    <TableCell>{new Date(member.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-4">No team members yet</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations ({invitations.length})</CardTitle>
          <CardDescription>Invitations waiting to be accepted</CardDescription>
        </CardHeader>
        <CardContent>
          {invitations.length > 0 ? (
            <Table>
              <TableHeader><TableRow><TableHead>Email</TableHead><TableHead>Expires</TableHead><TableHead>Actions</TableHead></TableRow></TableHeader>
              <TableBody>
                {invitations.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-medium">{inv.email}</TableCell>
                    <TableCell>{new Date(inv.expires_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => copyInvitationLink(inv.token)}><Copy className="w-4 h-4" /></Button>
                        <Button variant="outline" size="sm" onClick={() => setDeleteId(inv.id)}><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-muted-foreground text-center py-4">No pending invitations</p>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invitation</AlertDialogTitle>
            <AlertDialogDescription>Are you sure you want to delete this invitation?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteInvitation}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Team;
