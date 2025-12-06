import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function ClientPortal() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [formData, setFormData] = useState({
    pan: "",
    clientCode: "",
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      console.log("ClientPortal: User detected via hook:", user.id);
      console.log("ClientPortal: Redirecting to /documents in 500ms...");
      // Small delay to ensure state propagation
      const timer = setTimeout(() => {
          navigate("/documents");
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [user, navigate]);


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
        
        console.log("Attempting login for:", clientEmail);

        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: clientEmail,
          password: `client_${client.client_id}_${formData.clientCode}`,
        });

        console.log("Sign in result:", { signInData, signInError });

        if (signInError) {
          toast({
            title: "Login failed",
            description: "Unable to sign in. Please contact support.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        if (!signInData.session) {
             console.error("Login successful but no session returned in data!");
             toast({
                title: "Login Error",
                description: "Server did not return a session. Please try again.",
                variant: "destructive"
             });
             setLoading(false);
             return;
        }

        // Explicitly set the session to ensure persistence
        if (signInData.session) {
            const { error: setSessionError } = await supabase.auth.setSession(signInData.session);
            if (setSessionError) console.error("Error setting session:", setSessionError);
        }

        // Cache role for immediate access
        localStorage.setItem("user_role", "client");
        localStorage.setItem("client_id", client.client_id);

        toast({ title: `Welcome back, ${client.client_name}!` });
        console.log("Login successful, session obtained. Waiting for auth state...");
        
        // We do NOT navigate here. We wait for the useAuth hook to detect the user.
        // This ensures the global state is updated before we change routes.

      } else {
        // No user_id means client hasn't logged in before - create or sign in
        const clientEmail = `${formData.pan.toLowerCase().trim()}@client.app`;
        const clientPassword = `client_${client.client_id}_${formData.clientCode.trim()}`;

        console.log("Attempting login with:", clientEmail);

        // First try to sign in (in case user exists but client_auth link is missing)
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: clientEmail,
          password: clientPassword,
        });

        if (signInError) {
          console.log("Sign in failed (expected if new user):", signInError.message);
          if (signInError.message.includes("Email not confirmed")) {
            toast({
              title: "Login Failed",
              description: "Account exists but email is not confirmed. Please ask Admin to disable 'Confirm Email' in Supabase settings.",
              variant: "destructive",
            });
            setLoading(false);
            return;
          }
        }

        if (!signInError && signInData.user) {
          console.log("Sign in successful, linking client...");
          // User exists - link them to client_auth if not already linked
          const { error: linkError } = await supabase.from("client_auth").upsert({
            client_id: client.client_id,
            user_id: signInData.user.id,
          }, { onConflict: "client_id" });

          if (linkError) console.error("Link error (existing user):", linkError);

          // Ensure role is set to client
          await supabase.rpc("set_user_role", {
            _user_id: signInData.user.id,
            _role: "client",
          });

          // Cache role
          localStorage.setItem("user_role", "client");
          localStorage.setItem("client_id", client.client_id);

          toast({ title: `Welcome back, ${client.client_name}!` });
          
          // Wait for hook
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
          console.error("Sign up error:", signUpError);
          toast({
            title: "Login failed",
            description: signUpError?.message || "Unable to create account.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        if (!signUpData.session) {
           console.warn("User created but no session returned. Email confirmation might be required or user already exists with different password.");
           // If we don't have a session, we can't link the user via RLS.
           // We should try to sign in again if possible, or alert the user.
           if (signInError) {
             toast({
               title: "Login Failed",
               description: "User exists but password incorrect, or email confirmation required.",
               variant: "destructive"
             });
             setLoading(false);
             return;
           }
        }

        // Set user role to client using secure function
        await supabase.rpc("set_user_role", {
          _user_id: signUpData.user.id,
          _role: "client",
        });

        // Link client to auth account
        // Use upsert to avoid unique constraint violations if it already exists
        const { error: linkError } = await supabase.from("client_auth").upsert({
          client_id: client.client_id,
          user_id: signUpData.user.id,
        }, { onConflict: 'client_id' });

        if (linkError) {
          console.error("Error linking client:", linkError);
          toast({
            title: "Account created but linking failed",
            description: linkError.message,
            variant: "destructive",
          });
          // Don't return, try to navigate anyway, maybe it was already linked?
        } else {
          console.log("Client linked successfully");
        }

        // Cache role
        localStorage.setItem("user_role", "client");
        localStorage.setItem("client_id", client.client_id);

        toast({ title: `Welcome, ${client.client_name}!` });
        console.log("Signup successful, checking session...");
        
        // Wait for hook
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
      {redirecting && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <h2 className="text-xl font-semibold">Redirecting to Dashboard...</h2>
            <p className="text-muted-foreground">Please wait while we secure your session.</p>
          </div>
        </div>
      )}
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
