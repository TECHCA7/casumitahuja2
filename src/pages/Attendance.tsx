import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, Hand, Clock, CheckCircle2, XCircle, Calendar, Loader2, Download, Users } from "lucide-react";
import { useAttendance, StaffAttendance } from "@/hooks/useAttendance";
import { useUserRole } from "@/hooks/useUserRole";
import { format, parseISO } from "date-fns";
import * as XLSX from "xlsx";

export default function Attendance() {
  const { todayRecord, records, allStaffRecords, loading, checkIn, checkOut, getWeekStats, fetchAllStaffAttendance } = useAttendance();
  const { isAdmin } = useUserRole();
  const [isMarking, setIsMarking] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [adminLoading, setAdminLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      setAdminLoading(true);
      fetchAllStaffAttendance(selectedMonth).finally(() => setAdminLoading(false));
    }
  }, [isAdmin, selectedMonth]);

  const handleMarkAttendance = async (method: "face" | "button") => {
    setIsMarking(true);
    
    if (!todayRecord?.check_in) {
      await checkIn(method);
    } else if (!todayRecord?.check_out) {
      await checkOut(method);
    }
    
    setIsMarking(false);
  };

  const getStatus = () => {
    if (!todayRecord?.check_in) return "not_marked";
    if (!todayRecord?.check_out) return "in";
    return "out";
  };

  const status = getStatus();
  const weekStats = getWeekStats();

  const getTodayRecords = () => {
    if (!todayRecord) return [];
    const entries = [];
    if (todayRecord.check_in) {
      entries.push({ time: todayRecord.check_in, type: "in", method: todayRecord.method });
    }
    if (todayRecord.check_out) {
      entries.push({ time: todayRecord.check_out, type: "out", method: todayRecord.method });
    }
    return entries;
  };

  const getMonthOptions = () => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        value: format(date, "yyyy-MM"),
        label: format(date, "MMMM yyyy"),
      });
    }
    return months;
  };

  const exportToExcel = () => {
    if (allStaffRecords.length === 0) return;

    // Group by staff member
    const staffMap = new Map<string, StaffAttendance[]>();
    allStaffRecords.forEach((record) => {
      const name = record.profiles?.full_name || "Unknown";
      if (!staffMap.has(name)) {
        staffMap.set(name, []);
      }
      staffMap.get(name)?.push(record);
    });

    // Create workbook with summary sheet
    const wb = XLSX.utils.book_new();

    // Summary sheet data
    const summaryData: any[][] = [
      ["SUMIT AHUJA & ASSOCIATES"],
      ["Chartered Accountants"],
      ["Staff Attendance Report"],
      [`Month: ${format(new Date(selectedMonth + "-01"), "MMMM yyyy")}`],
      [],
      ["Staff Name", "Days Present", "Days Absent", "Total Hours"],
    ];

    staffMap.forEach((records, name) => {
      const present = records.filter((r) => r.check_in).length;
      let totalHours = 0;
      records.forEach((r) => {
        if (r.check_in && r.check_out) {
          const diff = new Date(r.check_out).getTime() - new Date(r.check_in).getTime();
          totalHours += diff / (1000 * 60 * 60);
        }
      });
      summaryData.push([name, present, 30 - present, totalHours.toFixed(1)]);
    });

    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    summaryWs["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, summaryWs, "Summary");

    // Detailed sheet
    const detailData: any[][] = [
      ["SUMIT AHUJA & ASSOCIATES - Detailed Attendance"],
      [],
      ["Date", "Staff Name", "Check In", "Check Out", "Method", "Hours Worked"],
    ];

    allStaffRecords
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .forEach((record) => {
        let hours = "";
        if (record.check_in && record.check_out) {
          const diff = new Date(record.check_out).getTime() - new Date(record.check_in).getTime();
          hours = (diff / (1000 * 60 * 60)).toFixed(2);
        }
        detailData.push([
          format(new Date(record.date), "dd/MM/yyyy"),
          record.profiles?.full_name || "Unknown",
          record.check_in ? format(parseISO(record.check_in), "hh:mm a") : "-",
          record.check_out ? format(parseISO(record.check_out), "hh:mm a") : "-",
          record.method || "-",
          hours || "-",
        ]);
      });

    // CA Branding footer
    detailData.push([]);
    detailData.push([]);
    detailData.push(["As per records maintained by the firm"]);
    detailData.push([]);
    detailData.push(["For Sumit Ahuja & Associates"]);
    detailData.push(["Chartered Accountants"]);
    detailData.push(["Firm Regn. No. : 025395C"]);
    detailData.push([]);
    detailData.push(["CA Sumit Ahuja"]);
    detailData.push(["Partner"]);
    detailData.push(["M.No. 440143"]);
    detailData.push(["Place: Seoni"]);

    const detailWs = XLSX.utils.aoa_to_sheet(detailData);
    detailWs["!cols"] = [{ wch: 12 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, detailWs, "Detailed");

    XLSX.writeFile(wb, `Attendance_${selectedMonth}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Attendance</h1>
        <p className="text-muted-foreground mt-1">
          {isAdmin ? "View staff attendance and export reports" : "Mark your attendance using face recognition or button"}
        </p>
      </div>

      {isAdmin ? (
        // Admin View
        <Tabs defaultValue="my" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="my" className="flex items-center gap-2">
              <Hand className="w-4 h-4" />
              My Attendance
            </TabsTrigger>
            <TabsTrigger value="staff" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Staff Attendance
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my">
            <StaffAttendanceView
              status={status}
              currentTime={currentTime}
              todayRecord={todayRecord}
              weekStats={weekStats}
              getTodayRecords={getTodayRecords}
              handleMarkAttendance={handleMarkAttendance}
              isMarking={isMarking}
            />
          </TabsContent>

          <TabsContent value="staff">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle>Staff Attendance Report</CardTitle>
                    <CardDescription>View and export monthly attendance</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getMonthOptions().map((month) => (
                          <SelectItem key={month.value} value={month.value}>
                            {month.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={exportToExcel} disabled={allStaffRecords.length === 0}>
                      <Download className="w-4 h-4 mr-2" />
                      Export Excel
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {adminLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : allStaffRecords.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No attendance records for this month
                  </div>
                ) : (
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Staff Name</TableHead>
                          <TableHead>Check In</TableHead>
                          <TableHead>Check Out</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Hours</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allStaffRecords.map((record) => {
                          let hours = "-";
                          if (record.check_in && record.check_out) {
                            const diff = new Date(record.check_out).getTime() - new Date(record.check_in).getTime();
                            hours = (diff / (1000 * 60 * 60)).toFixed(2);
                          }
                          return (
                            <TableRow key={record.id}>
                              <TableCell>{format(new Date(record.date), "dd MMM yyyy")}</TableCell>
                              <TableCell className="font-medium">{record.profiles?.full_name || "Unknown"}</TableCell>
                              <TableCell>
                                {record.check_in ? format(parseISO(record.check_in), "hh:mm a") : "-"}
                              </TableCell>
                              <TableCell>
                                {record.check_out ? format(parseISO(record.check_out), "hh:mm a") : "-"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="capitalize">{record.method}</Badge>
                              </TableCell>
                              <TableCell>{hours}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        // Staff View
        <StaffAttendanceView
          status={status}
          currentTime={currentTime}
          todayRecord={todayRecord}
          weekStats={weekStats}
          getTodayRecords={getTodayRecords}
          handleMarkAttendance={handleMarkAttendance}
          isMarking={isMarking}
        />
      )}
    </div>
  );
}

// Extracted Staff Attendance View Component
function StaffAttendanceView({
  status,
  currentTime,
  todayRecord,
  weekStats,
  getTodayRecords,
  handleMarkAttendance,
  isMarking,
}: {
  status: string;
  currentTime: Date;
  todayRecord: any;
  weekStats: { present: number; absent: number };
  getTodayRecords: () => any[];
  handleMarkAttendance: (method: "face" | "button") => void;
  isMarking: boolean;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {/* Current Status */}
        <Card className="border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  status === "in" ? "bg-green-500/10 text-green-500" 
                    : status === "out" ? "bg-muted text-muted-foreground"
                    : "bg-yellow-500/10 text-yellow-500"
                }`}>
                  {status === "in" ? <CheckCircle2 className="w-8 h-8" />
                    : status === "out" ? <XCircle className="w-8 h-8" />
                    : <Clock className="w-8 h-8" />}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Status</p>
                  <p className="text-2xl font-bold">
                    {status === "in" ? "Checked In" : status === "out" ? "Checked Out" : "Not Marked"}
                  </p>
                  <p className="text-sm text-muted-foreground">{format(currentTime, "EEEE, MMMM d, yyyy")}</p>
                </div>
              </div>
              <div className="text-center sm:text-right">
                <p className="text-4xl font-bold text-primary">{format(currentTime, "hh:mm")}</p>
                <p className="text-sm text-muted-foreground">{format(currentTime, "a")}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance Methods */}
        <Tabs defaultValue="button" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="button" className="flex items-center gap-2">
              <Hand className="w-4 h-4" />Button
            </TabsTrigger>
            <TabsTrigger value="face" className="flex items-center gap-2">
              <Camera className="w-4 h-4" />Face
            </TabsTrigger>
          </TabsList>

          <TabsContent value="button" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Button Attendance</CardTitle>
                <CardDescription>Click the button below to mark your attendance</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  size="lg" 
                  className="w-full h-24 text-lg"
                  onClick={() => handleMarkAttendance("button")}
                  disabled={isMarking || status === "out"}
                >
                  {isMarking ? (
                    <><Loader2 className="w-6 h-6 mr-2 animate-spin" />Marking...</>
                  ) : status === "out" ? (
                    <><CheckCircle2 className="w-6 h-6 mr-2" />Completed for Today</>
                  ) : (
                    <><Hand className="w-6 h-6 mr-2" />{status === "in" ? "Mark Check Out" : "Mark Check In"}</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="face" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Face Attendance</CardTitle>
                <CardDescription>Use your camera to mark attendance with face recognition</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Camera className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p>Camera preview will appear here</p>
                    <p className="text-sm">Face recognition integration required</p>
                  </div>
                </div>
                <Button 
                  size="lg" 
                  className="w-full"
                  onClick={() => handleMarkAttendance("face")}
                  disabled={isMarking || status === "out"}
                >
                  {isMarking ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Processing...</>
                  ) : (
                    <><Camera className="w-5 h-5 mr-2" />Capture & Mark Attendance</>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5" />Today's Records
            </CardTitle>
          </CardHeader>
          <CardContent>
            {getTodayRecords().length > 0 ? (
              <div className="space-y-3">
                {getTodayRecords().map((record, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${record.type === "in" ? "bg-green-500" : "bg-muted-foreground"}`} />
                      <div>
                        <p className="font-medium text-sm">{record.type === "in" ? "Check In" : "Check Out"}</p>
                        <p className="text-xs text-muted-foreground">{format(parseISO(record.time), "hh:mm a")}</p>
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs capitalize">{record.method}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-sm">No attendance records for today</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-green-500/10 rounded-lg p-3">
                <p className="text-2xl font-bold text-green-500">{weekStats.present}</p>
                <p className="text-xs text-muted-foreground">Days Present</p>
              </div>
              <div className="bg-muted rounded-lg p-3">
                <p className="text-2xl font-bold">{weekStats.absent}</p>
                <p className="text-xs text-muted-foreground">Days Absent</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
