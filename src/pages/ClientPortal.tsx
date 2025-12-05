import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function ClientPortal() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    pan: "",
    clientCode: "",
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Use secure function to verify client credentials (bypasses RLS)
      const { data: clientData, error: clientError } = await supabase
        .rpc("verify_client_login", {
          p_pan: formData.pan,
          p_client_code: formData.clientCode,
        });

      if (clientError || !clientData || clientData.length === 0) {
        toast({
          title: "Invalid credentials",
          description: "PAN or Client Code is incorrect. Please check and try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const client = clientData[0];

      if (client.user_id) {
        // Client has an account - sign them in
        // Use a standard domain to avoid validation errors
        const clientEmail = `${formData.pan.toLowerCase().trim()}@client.app`;
        
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: clientEmail,
          password: `client_${client.client_id}_${formData.clientCode}`,
        });

        if (signInError) {
          toast({
            title: "Login failed",
            description: "Unable to sign in. Please contact support.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        toast({ title: `Welcome back, ${client.client_name}!` });
        navigate("/documents");
      } else {
        // No user_id means client hasn't logged in before - create or sign in
        const clientEmail = `${formData.pan.toLowerCase().trim()}@client.app`;
        const clientPassword = `client_${client.client_id}_${formData.clientCode}`;

        // First try to sign in (in case user exists but client_auth link is missing)
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: clientEmail,
          password: clientPassword,
        });

        if (!signInError && signInData.user) {
          // User exists - link them to client_auth if not already linked
          await supabase.from("client_auth").upsert({
            client_id: client.client_id,
            user_id: signInData.user.id,
          }, { onConflict: "client_id" });

          // Ensure role is set to client
          await supabase.rpc("set_user_role", {
            _user_id: signInData.user.id,
            _role: "client",
          });

          toast({ title: `Welcome back, ${client.client_name}!` });
          navigate("/documents");
          return;
        }

        // User doesn't exist - create new account
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: clientEmail,
          password: clientPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/documents`,
            data: {
              full_name: client.client_name,
              is_client: true,
            },
          },
        });

        if (signUpError || !signUpData.user) {
          toast({
            title: "Login failed",
            description: signUpError?.message || "Unable to create account.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Set user role to client using secure function
        await supabase.rpc("set_user_role", {
          _user_id: signUpData.user.id,
          _role: "client",
        });

        // Link client to auth account
        await supabase.from("client_auth").insert({
          client_id: client.client_id,
          user_id: signUpData.user.id,
        });

        toast({ title: `Welcome, ${client.client_name}!` });
        navigate("/documents");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Firm Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 mb-4 shadow-lg shadow-primary/20">
            <span className="text-3xl font-bold text-primary-foreground">SA</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Sumit Ahuja & Associates</h1>
          <p className="text-primary font-medium text-sm mt-1">Chartered Accountants</p>
          <p className="text-muted-foreground text-xs mt-0.5">Firm Regn. No. : 025395C</p>
        </div>

        <Card className="shadow-xl border-border/50 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl">Client Portal</CardTitle>
            <CardDescription>
              Login with your PAN and Client Code to access your documents
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pan">PAN Number</Label>
                <Input
                  id="pan"
                  placeholder="Enter your PAN (e.g., ABCDE1234F)"
                  value={formData.pan}
                  onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                  maxLength={10}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientCode">Client Code</Label>
                <Input
                  id="clientCode"
                  placeholder="Enter your Client Code"
                  value={formData.clientCode}
                  onChange={(e) => setFormData({ ...formData, clientCode: e.target.value })}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Access Portal"
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t text-center">
              <Link to="/auth" className="text-sm text-muted-foreground hover:text-primary inline-flex items-center gap-1">
                <ArrowLeft className="w-4 h-4" />
                Staff / Admin Login
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 space-y-1">
          <p className="text-xs text-muted-foreground">Developed by CA Sumit Ahuja</p>
          <p className="text-xs text-muted-foreground/60">Partner | M.No. 440143</p>
        </div>
      </div>
    </div>
  );
}
