import { useAuth } from "@/hooks/useAuth";
import { useAttendance } from "@/hooks/useAttendance";
import { useInvoices } from "@/hooks/useInvoices";
import { useClients } from "@/hooks/useClients";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  UserCheck, FileText, Calculator, Receipt, FileSpreadsheet, FileType, ScanText, MessageSquareReply, ClipboardList, ArrowRight, Users, Clock, TrendingUp, Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";

const modules = [
  { title: "Attendance", description: "Mark and track attendance with face or button", icon: UserCheck, path: "/attendance", color: "bg-blue-500/10 text-blue-600" },
  { title: "Office Tasks", description: "Manage and track office tasks", icon: ClipboardList, path: "/office-tasks", color: "bg-green-500/10 text-green-600" },
  { title: "Client Documents", description: "View ITR and computation PDFs", icon: FileText, path: "/documents", color: "bg-emerald-500/10 text-emerald-600" },
  { title: "Tax Calculator", description: "Calculate income tax (Old/New regime)", icon: Calculator, path: "/tax-calculator", color: "bg-purple-500/10 text-purple-600" },
  { title: "Billing & Invoicing", description: "Generate and manage invoices", icon: Receipt, path: "/billing", color: "bg-amber-500/10 text-amber-600" },
  { title: "Project Report / CMA", description: "Generate CMA reports for loans", icon: FileSpreadsheet, path: "/project-report", color: "bg-cyan-500/10 text-cyan-600" },
  { title: "PDF Tools", description: "Merge, split, convert PDFs", icon: FileType, path: "/pdf-tools", color: "bg-rose-500/10 text-rose-600" },
  { title: "Document OCR", description: "Extract text from documents", icon: ScanText, path: "/ocr", color: "bg-indigo-500/10 text-indigo-600" },
  { title: "Notice Reply", description: "Generate notice reply drafts", icon: MessageSquareReply, path: "/notice-reply", color: "bg-orange-500/10 text-orange-600" },
];

export default function Dashboard() {
  const { user } = useAuth();
  const { todayRecord, loading: attendanceLoading } = useAttendance();
  const { invoices, getPendingCount, getMonthlyRevenue, loading: invoicesLoading } = useInvoices();
  const { clients, loading: clientsLoading } = useClients();

  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User";
  const loading = attendanceLoading || invoicesLoading || clientsLoading;

  const stats = [
    { 
      label: "Total Clients", 
      value: clients.length.toString(), 
      icon: Users, 
      trend: `${clients.length} active` 
    },
    { 
      label: "Pending Invoices", 
      value: getPendingCount().toString(), 
      icon: Clock, 
      trend: `${invoices.length} total` 
    },
    { 
      label: "This Month Revenue", 
      value: `₹${(getMonthlyRevenue() / 1000).toFixed(1)}K`, 
      icon: TrendingUp, 
      trend: "from paid invoices" 
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Welcome, {displayName}!</h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">Your office management overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <Card key={i} className="card-hover">
              <CardContent className="p-6 flex items-center justify-center min-h-[120px]">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ))
        ) : (
          stats.map((stat, index) => (
            <Card key={index} className="card-hover">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1">{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{stat.trend}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <stat.icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Today's Status */}
      {!loading && (
        <Card className="border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today's Attendance</p>
                <p className="text-xl font-semibold mt-1">
                  {!todayRecord?.check_in ? "Not marked" : todayRecord?.check_out ? "Completed" : "Checked In"}
                </p>
              </div>
              <Link to="/attendance">
                <button className="text-primary hover:underline text-sm flex items-center gap-1">
                  View Details <ArrowRight className="w-4 h-4" />
                </button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Module Cards */}
      <div>
        <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Tools & Modules</h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {modules.map((module, index) => (
            <Link key={module.path} to={module.path} className="group" style={{ animationDelay: `${index * 50}ms` }}>
              <Card className="h-full card-hover border-border/50 overflow-hidden">
                <CardHeader className="p-3 sm:p-6 pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl ${module.color} flex items-center justify-center`}>
                      <module.icon className="w-4 h-4 sm:w-6 sm:h-6" />
                    </div>
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                  </div>
                  <CardTitle className="text-sm sm:text-lg mt-2 sm:mt-4 leading-tight">{module.title}</CardTitle>
                  <CardDescription className="text-xs sm:text-sm hidden sm:block">{module.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
