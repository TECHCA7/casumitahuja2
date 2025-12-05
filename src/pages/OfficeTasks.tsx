import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Calendar, User, Trash2, Edit, CheckCircle } from "lucide-react";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  created_by: string;
  priority: string;
  status: string;
  due_date: string | null;
  client_id: string | null;
  created_at: string;
}

interface StaffMember {
  id: string;
  full_name: string | null;
}

export default function OfficeTasks() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    assigned_to: "",
    priority: "medium",
    due_date: "",
  });

  useEffect(() => {
    fetchTasks();
    fetchStaffMembers();
  }, []);

  const fetchTasks = async () => {
    const { data, error } = await supabase
      .from("office_tasks")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error fetching tasks", variant: "destructive" });
    } else {
      setTasks(data || []);
    }
    setLoading(false);
  };

  const fetchStaffMembers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name");

    if (!error && data) {
      setStaffMembers(data);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    if (editingTask) {
      if (!isAdmin) {
        toast({ title: "Only admin can update tasks", variant: "destructive" });
        return;
      }
      const { error } = await supabase
        .from("office_tasks")
        .update({
          title: formData.title,
          description: formData.description || null,
          assigned_to: formData.assigned_to || null,
          priority: formData.priority,
          due_date: formData.due_date || null,
        })
        .eq("id", editingTask.id);

      if (error) {
        toast({ title: "Error updating task", variant: "destructive" });
      } else {
        toast({ title: "Task updated successfully" });
        fetchTasks();
      }
    } else {
      const { error } = await supabase.from("office_tasks").insert({
        title: formData.title,
        description: formData.description || null,
        assigned_to: formData.assigned_to || null,
        created_by: user?.id,
        priority: formData.priority,
        due_date: formData.due_date || null,
      });

      if (error) {
        toast({ title: "Error creating task", variant: "destructive" });
      } else {
        toast({ title: "Task created successfully" });
        fetchTasks();
      }
    }

    resetForm();
    setIsDialogOpen(false);
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toast({ title: "Only admin can delete tasks", variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("office_tasks").delete().eq("id", id);
    if (error) {
      toast({ title: "Error deleting task", variant: "destructive" });
    } else {
      toast({ title: "Task deleted" });
      fetchTasks();
    }
  };

  const toggleStatus = async (task: Task) => {
    if (!isAdmin) {
      toast({ title: "Only admin can update task status", variant: "destructive" });
      return;
    }
    const newStatus = task.status === "completed" ? "pending" : "completed";
    const { error } = await supabase
      .from("office_tasks")
      .update({ status: newStatus })
      .eq("id", task.id);
    
    if (!error) {
      fetchTasks();
    }
  };

  const resetForm = () => {
    setFormData({ title: "", description: "", assigned_to: "", priority: "medium", due_date: "" });
    setEditingTask(null);
  };

  const openEditDialog = (task: Task) => {
    if (!isAdmin) {
      toast({ title: "Only admin can edit tasks", variant: "destructive" });
      return;
    }
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      assigned_to: task.assigned_to || "",
      priority: task.priority,
      due_date: task.due_date || "",
    });
    setIsDialogOpen(true);
  };

  const filteredTasks = tasks.filter((task) => {
    if (filter === "all") return true;
    if (filter === "my") return task.assigned_to === user?.id;
    return task.status === filter;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent": return "bg-red-500";
      case "high": return "bg-orange-500";
      case "medium": return "bg-yellow-500";
      case "low": return "bg-green-500";
      default: return "bg-gray-500";
    }
  };

  const getStaffName = (id: string | null) => {
    if (!id) return "Unassigned";
    const staff = staffMembers.find((s) => s.id === id);
    return staff?.full_name || "Unknown";
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Office Tasks</h1>
          <p className="text-muted-foreground mt-1">Manage and assign work to staff members</p>
        </div>

        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="my">My Tasks</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTask ? "Edit Task" : "Create New Task"}</DialogTitle>
                <DialogDescription>Fill in the details for the task</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Task title"
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Task description"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Assign To</Label>
                    <Select value={formData.assigned_to} onValueChange={(v) => setFormData({ ...formData, assigned_to: v })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select staff" />
                      </SelectTrigger>
                      <SelectContent>
                        {staffMembers.map((staff) => (
                          <SelectItem key={staff.id} value={staff.id}>
                            {staff.full_name || "Unnamed"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Priority</Label>
                    <Select value={formData.priority} onValueChange={(v) => setFormData({ ...formData, priority: v })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                  />
                </div>
                <Button onClick={handleSubmit} className="w-full">
                  {editingTask ? "Update Task" : "Create Task"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading tasks...</div>
      ) : filteredTasks.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No tasks found. Create your first task!
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredTasks.map((task) => (
            <Card key={task.id} className={task.status === "completed" ? "opacity-60" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <button onClick={() => toggleStatus(task)} disabled={!isAdmin}>
                      <CheckCircle
                        className={`w-6 h-6 ${task.status === "completed" ? "text-green-500 fill-green-500" : "text-muted-foreground"}`}
                      />
                    </button>
                    <div>
                      <CardTitle className={`text-lg ${task.status === "completed" ? "line-through" : ""}`}>
                        {task.title}
                      </CardTitle>
                      {task.description && (
                        <CardDescription className="mt-1">{task.description}</CardDescription>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={`${getPriorityColor(task.priority)} text-white`}>
                      {task.priority}
                    </Badge>
                    {isAdmin && (
                      <>
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(task)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(task.id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {getStaffName(task.assigned_to)}
                  </div>
                  {task.due_date && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {format(new Date(task.due_date), "MMM dd, yyyy")}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
