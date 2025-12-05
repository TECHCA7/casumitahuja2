import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = "admin" | "staff" | "client" | null;

interface UseUserRoleReturn {
  role: UserRole;
  loading: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  isClient: boolean;
  clientId: string | null;
}

export function useUserRole(): UseUserRoleReturn {
  const { user } = useAuth();
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [clientId, setClientId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      try {
        // Fetch user role
        const { data: roleData, error: roleError } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (roleError) {
          console.error("Error fetching role:", roleError);
          setRole("staff"); // Default to staff
        } else {
          setRole(roleData.role as UserRole);
        }

        // If client, fetch client_id
        if (roleData?.role === "client") {
          const { data: clientAuth } = await supabase
            .from("client_auth")
            .select("client_id")
            .eq("user_id", user.id)
            .single();
          
          if (clientAuth) {
            setClientId(clientAuth.client_id);
          }
        }
      } catch (error) {
        console.error("Error fetching user role:", error);
        setRole("staff");
      } finally {
        setLoading(false);
      }
    }

    fetchRole();
  }, [user]);

  return {
    role,
    loading,
    isAdmin: role === "admin",
    isStaff: role === "admin" || role === "staff",
    isClient: role === "client",
    clientId,
  };
}
