import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";
import { format } from "date-fns";

export interface AttendanceRecord {
  id: string;
  user_id: string;
  check_in: string | null;
  check_out: string | null;
  method: string;
  date: string;
  created_at: string;
}

export interface StaffAttendance extends AttendanceRecord {
  profiles?: {
    full_name: string | null;
  };
}

export function useAttendance() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [allStaffRecords, setAllStaffRecords] = useState<StaffAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  const today = format(new Date(), "yyyy-MM-dd");

  const fetchRecords = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("attendance")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(30);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setRecords(data || []);
      const todayRec = data?.find(r => r.date === today);
      setTodayRecord(todayRec || null);
    }
    setLoading(false);
  };

  const fetchAllStaffAttendance = async (month: string) => {
    // month format: "2024-01"
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;

    // Fetch attendance records
    const { data: attendanceData, error: attendanceError } = await supabase
      .from("attendance")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: false });

    if (attendanceError) {
      toast({ title: "Error fetching staff attendance", description: attendanceError.message, variant: "destructive" });
      return [];
    }

    // Fetch profiles for staff names
    const userIds = [...new Set(attendanceData?.map(r => r.user_id) || [])];
    const { data: profilesData } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", userIds);

    // Map profiles to attendance records
    const profileMap = new Map(profilesData?.map(p => [p.id, p]) || []);
    const recordsWithProfiles: StaffAttendance[] = (attendanceData || []).map(record => ({
      ...record,
      profiles: profileMap.get(record.user_id) || { full_name: null },
    }));

    setAllStaffRecords(recordsWithProfiles);
    return recordsWithProfiles;
  };

  useEffect(() => {
    fetchRecords();
  }, [user]);

  const checkIn = async (method: string = "button") => {
    if (!user) return null;

    if (todayRecord?.check_in) {
      toast({ title: "Already checked in", description: "You have already checked in today", variant: "destructive" });
      return null;
    }

    const now = new Date().toISOString();

    if (todayRecord) {
      const { data, error } = await supabase
        .from("attendance")
        .update({ check_in: now, method })
        .eq("id", todayRecord.id)
        .select()
        .single();

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return null;
      }

      setTodayRecord(data);
      setRecords(records.map(r => r.id === data.id ? data : r));
      toast({ title: "Checked In", description: `Checked in at ${format(new Date(), "hh:mm a")}` });
      return data;
    } else {
      const { data, error } = await supabase
        .from("attendance")
        .insert({ user_id: user.id, check_in: now, method, date: today })
        .select()
        .single();

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
        return null;
      }

      setTodayRecord(data);
      setRecords([data, ...records]);
      toast({ title: "Checked In", description: `Checked in at ${format(new Date(), "hh:mm a")}` });
      return data;
    }
  };

  const checkOut = async (method: string = "button") => {
    if (!user || !todayRecord) return null;

    if (!todayRecord.check_in) {
      toast({ title: "Not checked in", description: "Please check in first", variant: "destructive" });
      return null;
    }

    if (todayRecord.check_out) {
      toast({ title: "Already checked out", description: "You have already checked out today", variant: "destructive" });
      return null;
    }

    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("attendance")
      .update({ check_out: now, method })
      .eq("id", todayRecord.id)
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return null;
    }

    setTodayRecord(data);
    setRecords(records.map(r => r.id === data.id ? data : r));
    toast({ title: "Checked Out", description: `Checked out at ${format(new Date(), "hh:mm a")}` });
    return data;
  };

  const getWeekStats = () => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekRecords = records.filter(r => new Date(r.date) >= weekAgo);
    const present = weekRecords.filter(r => r.check_in).length;
    return { present, absent: 7 - present };
  };

  return { 
    records, 
    todayRecord, 
    allStaffRecords,
    loading, 
    checkIn, 
    checkOut, 
    getWeekStats, 
    fetchAllStaffAttendance,
    refetch: fetchRecords 
  };
}
