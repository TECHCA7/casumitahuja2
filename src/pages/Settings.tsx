import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Mail, Building2 } from "lucide-react";

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and application settings
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Profile
            </CardTitle>
            <CardDescription>Your personal information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={user?.user_metadata?.full_name || ""}
                placeholder="Enter your name"
                readOnly
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ""} readOnly />
            </div>
            <Button variant="outline" className="w-full">
              Update Profile
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Office Information
            </CardTitle>
            <CardDescription>CA practice details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Office Name</Label>
              <Input value="CA Sumit Ahuja & Associates" readOnly />
            </div>
            <div className="space-y-2">
              <Label>Registration Number</Label>
              <Input placeholder="Enter registration number" />
            </div>
            <Button variant="outline" className="w-full">
              Update Office Details
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
