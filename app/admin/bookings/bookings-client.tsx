"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Filter,
  Calendar,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Booking, Service, Client } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { createAuditLog } from "@/lib/audit-log-client";
import { moveBookingWorkflowToStage } from "@/lib/business-logic-client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface StaffOption {
  id: string;
  full_name: string | null;
  email: string | null;
  studio_role: string | null;
}

interface ExtendedClient extends Client {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  profile?: {
    full_name: string | null;
    email: string | null;
    phone?: string | null;
  };
}

interface ExtendedBooking extends Booking {
  booking_reference?: string | null;
  booking_source?: "online" | "walk_in";
  deposit_percentage?: number | null;
  deposit_required_amount?: number | null;
  deposit_paid_amount?: number | null;
  deposit_payment_method?: string | null;
  deposit_status?: "required" | "partial" | "paid" | "waived";
  service?: Service;
  client?: ExtendedClient;
  staff?: { full_name: string | null };
}

interface BookingsClientProps {
  initialBookings: ExtendedBooking[];
  services: Service[];
  clients: ExtendedClient[];
  staff: StaffOption[];
}

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-500",
  confirmed: "bg-green-500/10 text-green-500",
  in_progress: "bg-blue-500/10 text-blue-500",
  completed: "bg-primary/10 text-primary",
  cancelled: "bg-destructive/10 text-destructive",
};

const depositColors: Record<string, string> = {
  required: "bg-amber-500/10 text-amber-600",
  partial: "bg-blue-500/10 text-blue-600",
  paid: "bg-green-500/10 text-green-600",
  waived: "bg-muted text-muted-foreground",
};

function getClientName(client?: ExtendedClient | null) {
  return (
    client?.full_name ||
    client?.profile?.full_name ||
    client?.email ||
    client?.profile?.email ||
    "Unknown Client"
  );
}

function getClientEmail(client?: ExtendedClient | null) {
  return client?.email || client?.profile?.email || "";
}

function addMinutes(time: string, minutes: number) {
  const [hours, mins] = time.split(":").map(Number);
  const date = new Date(2000, 0, 1, hours || 0, mins || 0);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toTimeString().slice(0, 5);
}

export function BookingsClient({
  initialBookings,
  services,
  clients,
  staff,
}: BookingsClientProps) {
  const router = useRouter();
  const [bookings, setBookings] = useState(initialBookings);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [clientMode, setClientMode] = useState<"existing" | "new">("new");
  const [selectedBooking, setSelectedBooking] =
    useState<ExtendedBooking | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editBooking, setEditBooking] = useState({
    service_id: "",
    staff_id: "",
    booking_date: "",
    start_time: "",
    end_time: "",
    location: "",
    status: "pending",
    notes: "",
    deposit_percentage: "50",
    deposit_paid_amount: "0",
    deposit_payment_method: "",
  });

  const [newBooking, setNewBooking] = useState({
    existing_client_id: "",
    full_name: "",
    email: "",
    phone: "",
    service_id: "",
    staff_id: "",
    booking_date: "",
    start_time: "",
    location: "Studio",
    notes: "",
    deposit_percentage: "50",
    deposit_paid_amount: "",
    deposit_payment_method: "cash",
    transaction_id: "",
  });

  const filteredBookings = bookings.filter((booking) => {
    const matchesSearch =
      getClientName(booking.client)
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      booking.service?.name
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      booking.booking_reference
        ?.toLowerCase()
        .includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const selectedService = services.find(
    (service) => service.id === newBooking.service_id,
  );
  const totalAmount = Number(selectedService?.base_price || 0);
  const depositRequired = Number(
    ((totalAmount * Number(newBooking.deposit_percentage || 50)) / 100).toFixed(
      2,
    ),
  );

  const resetForm = () => {
    setClientMode("new");
    setNewBooking({
      existing_client_id: "",
      full_name: "",
      email: "",
      phone: "",
      service_id: "",
      staff_id: "",
      booking_date: "",
      start_time: "",
      location: "Studio",
      notes: "",
      deposit_percentage: "50",
      deposit_paid_amount: "",
      deposit_payment_method: "cash",
      transaction_id: "",
    });
  };

  const handleCreateBooking = async () => {
    if (
      !newBooking.service_id ||
      !newBooking.booking_date ||
      !newBooking.start_time
    ) {
      toast.error("Please select service, date and time");
      return;
    }
    if (clientMode === "existing" && !newBooking.existing_client_id) {
      toast.error("Please select an existing client");
      return;
    }
    if (
      clientMode === "new" &&
      (!newBooking.full_name || (!newBooking.email && !newBooking.phone))
    ) {
      toast.error("Please enter client name and email or phone");
      return;
    }

    setIsLoading(true);

    try {
      let existingClient = clients.find(
        (client) => client.id === newBooking.existing_client_id,
      );
      const endTime = addMinutes(
        newBooking.start_time,
        Number(selectedService?.duration_minutes || 60),
      );

      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_source: "walk_in",
          service_id: newBooking.service_id,
          booking_date: newBooking.booking_date,
          start_time: newBooking.start_time,
          end_time: endTime,
          staff_id: newBooking.staff_id || null,
          full_name:
            clientMode === "existing"
              ? getClientName(existingClient)
              : newBooking.full_name,
          email:
            clientMode === "existing"
              ? getClientEmail(existingClient)
              : newBooking.email,
          phone:
            clientMode === "existing"
              ? existingClient?.phone || existingClient?.profile?.phone || ""
              : newBooking.phone,
          location: newBooking.location || "Studio",
          notes: newBooking.notes,
          deposit_percentage: Number(newBooking.deposit_percentage),
          deposit_paid_amount: Number(newBooking.deposit_paid_amount || 0),
          deposit_payment_method: newBooking.deposit_payment_method,
          transaction_id: newBooking.transaction_id || null,
        }),
      });

      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Failed to create booking");

      const enrichedBooking = {
        ...result.booking,
        service: selectedService,
        client: result.client,
        staff:
          staff.find((member) => member.id === newBooking.staff_id) || null,
      };

      setBookings([enrichedBooking, ...bookings]);
      setIsCreateOpen(false);
      resetForm();
      toast.success("Walk-in booking created successfully");
      router.refresh();
    } catch (error) {
      console.error("Create walk-in booking error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create booking",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const openViewBooking = (booking: ExtendedBooking) => {
    setSelectedBooking(booking);
    setViewOpen(true);
  };

  const openEditBooking = (booking: ExtendedBooking) => {
    setSelectedBooking(booking);
    setEditBooking({
      service_id: booking.service_id || "",
      staff_id: booking.staff_id || "",
      booking_date: booking.booking_date || "",
      start_time: booking.start_time?.slice(0, 5) || "",
      end_time: booking.end_time?.slice(0, 5) || "",
      location: booking.location || "Studio",
      status: booking.status || "pending",
      notes: booking.notes || "",
      deposit_percentage: String(booking.deposit_percentage || 50),
      deposit_paid_amount: String(booking.deposit_paid_amount || 0),
      deposit_payment_method: booking.deposit_payment_method || "",
    });
    setEditOpen(true);
  };

  const handleUpdateBooking = async () => {
    if (!selectedBooking) return;
    if (
      !editBooking.service_id ||
      !editBooking.booking_date ||
      !editBooking.start_time
    ) {
      toast.error("Please select package, date and time");
      return;
    }

    const supabase = createClient();
    const service = services.find((item) => item.id === editBooking.service_id);
    const totalAmount = Number(
      service?.base_price || selectedBooking.total_amount || 0,
    );
    const depositRequired = Number(
      (
        (totalAmount * Number(editBooking.deposit_percentage || 50)) /
        100
      ).toFixed(2),
    );
    const depositPaid = Number(editBooking.deposit_paid_amount || 0);
    const depositStatus =
      depositPaid <= 0
        ? "required"
        : depositPaid >= depositRequired
          ? "paid"
          : "partial";
    const endTime =
      editBooking.end_time ||
      addMinutes(
        editBooking.start_time,
        Number(service?.duration_minutes || 60),
      );

    setIsLoading(true);
    const { error } = await supabase
      .from("bookings")
      .update({
        service_id: editBooking.service_id,
        staff_id: editBooking.staff_id || null,
        booking_date: editBooking.booking_date,
        start_time: editBooking.start_time,
        end_time: endTime,
        location: editBooking.location || null,
        status: editBooking.status,
        notes: editBooking.notes || null,
        total_amount: totalAmount,
        deposit_percentage: Number(editBooking.deposit_percentage || 50),
        deposit_required_amount: depositRequired,
        deposit_paid_amount: depositPaid,
        deposit_payment_method: editBooking.deposit_payment_method || null,
        deposit_status: depositStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedBooking.id);

    setIsLoading(false);

    if (error) {
      console.error(error);
      toast.error(error.message || "Failed to update booking");
      return;
    }

    const updatedBooking: ExtendedBooking = {
      ...selectedBooking,
      service_id: editBooking.service_id,
      staff_id: editBooking.staff_id || null,
      booking_date: editBooking.booking_date,
      start_time: editBooking.start_time,
      end_time: endTime,
      location: editBooking.location,
      status: editBooking.status as Booking["status"],
      notes: editBooking.notes,
      total_amount: totalAmount,
      deposit_percentage: Number(editBooking.deposit_percentage || 50),
      deposit_required_amount: depositRequired,
      deposit_paid_amount: depositPaid,
      deposit_payment_method: editBooking.deposit_payment_method,
      deposit_status: depositStatus as ExtendedBooking["deposit_status"],
      service,
      staff: staff.find((member) => member.id === editBooking.staff_id) || null,
    };

    setBookings(
      bookings.map((booking) =>
        booking.id === selectedBooking.id ? updatedBooking : booking,
      ),
    );
    setSelectedBooking(updatedBooking);
    setEditOpen(false);
    await createAuditLog({
      action: "update_booking",
      resource_type: "booking",
      resource_id: selectedBooking.id,
      old_data: selectedBooking,
      new_data: updatedBooking,
    });
    toast.success("Booking updated");
    router.refresh();
  };

  const handleUpdateStatus = async (bookingId: string, newStatus: string) => {
    const supabase = createClient();
    const oldBooking = bookings.find((booking) => booking.id === bookingId);

    const { error } = await supabase
      .from("bookings")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", bookingId);

    if (error) {
      toast.error("Failed to update status");
      return;
    }

    try {
      if (newStatus === "confirmed")
        await moveBookingWorkflowToStage(
          bookingId,
          "Shoot Scheduled",
          "Booking confirmed",
        );
      if (newStatus === "in_progress")
        await moveBookingWorkflowToStage(
          bookingId,
          "Shoot Scheduled",
          "Booking is now in progress",
        );
      if (newStatus === "completed")
        await moveBookingWorkflowToStage(
          bookingId,
          "Job Closed",
          "Booking completed",
        );

      await createAuditLog({
        action: "status_change",
        resource_type: "booking",
        resource_id: bookingId,
        old_data: oldBooking ? { status: oldBooking.status } : null,
        new_data: { status: newStatus },
      });
    } catch (businessError) {
      console.error("Booking status automation failed:", businessError);
    }

    setBookings(
      bookings.map((booking) =>
        booking.id === bookingId
          ? { ...booking, status: newStatus as Booking["status"] }
          : booking,
      ),
    );
    toast.success("Status updated");
    router.refresh();
  };

  const handleDeleteBooking = async (bookingId: string) => {
    const supabase = createClient();
    const oldBooking = bookings.find((booking) => booking.id === bookingId);

    const { error } = await supabase
      .from("bookings")
      .delete()
      .eq("id", bookingId);
    if (error) {
      toast.error("Failed to delete booking");
      return;
    }

    await createAuditLog({
      action: "delete",
      resource_type: "booking",
      resource_id: bookingId,
      old_data: oldBooking || null,
    });
    setBookings(bookings.filter((booking) => booking.id !== bookingId));
    toast.success("Booking deleted");
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Bookings</h1>
          <p className="text-muted-foreground mt-1">
            Manage online bookings and front desk walk-in bookings.
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="w-4 h-4" /> New Walk-In Booking
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Walk-In Booking</DialogTitle>
              <DialogDescription>
                Use this for front desk bookings where staff enters the client,
                photographer and deposit details.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-4">
              <div className="space-y-2">
                <Label>Client Type</Label>
                <Select
                  value={clientMode}
                  onValueChange={(value) =>
                    setClientMode(value as "existing" | "new")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New Client</SelectItem>
                    <SelectItem value="existing">Existing Client</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {clientMode === "existing" ? (
                <div className="space-y-2">
                  <Label>Existing Client *</Label>
                  <Select
                    value={newBooking.existing_client_id}
                    onValueChange={(value) =>
                      setNewBooking({
                        ...newBooking,
                        existing_client_id: value,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {getClientName(client)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2 md:col-span-1">
                    <Label>Full Name *</Label>
                    <Input
                      value={newBooking.full_name}
                      onChange={(e) =>
                        setNewBooking({
                          ...newBooking,
                          full_name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input
                      value={newBooking.phone}
                      onChange={(e) =>
                        setNewBooking({ ...newBooking, phone: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newBooking.email}
                      onChange={(e) =>
                        setNewBooking({ ...newBooking, email: e.target.value })
                      }
                    />
                  </div>
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Package *</Label>
                  <Select
                    value={newBooking.service_id}
                    onValueChange={(value) =>
                      setNewBooking({ ...newBooking, service_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select package" />
                    </SelectTrigger>
                    <SelectContent>
                      {services.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} - ${service.base_price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Photographer</Label>
                  <Select
                    value={newBooking.staff_id}
                    onValueChange={(value) =>
                      setNewBooking({ ...newBooking, staff_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Assign photographer" />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.full_name || member.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={newBooking.booking_date}
                    onChange={(e) =>
                      setNewBooking({
                        ...newBooking,
                        booking_date: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Start Time *</Label>
                  <Input
                    type="time"
                    value={newBooking.start_time}
                    onChange={(e) =>
                      setNewBooking({
                        ...newBooking,
                        start_time: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input
                    value={newBooking.location}
                    onChange={(e) =>
                      setNewBooking({ ...newBooking, location: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="rounded-lg border p-4 space-y-4">
                <div className="flex items-center gap-2 font-medium">
                  <DollarSign className="w-4 h-4" /> Deposit & Payment
                </div>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label>Deposit %</Label>
                    <Select
                      value={newBooking.deposit_percentage}
                      onValueChange={(value) =>
                        setNewBooking({
                          ...newBooking,
                          deposit_percentage: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="30">30%</SelectItem>
                        <SelectItem value="50">50%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Required</Label>
                    <Input
                      value={`$${depositRequired.toLocaleString()}`}
                      readOnly
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Paid Now</Label>
                    <Input
                      type="number"
                      min="0"
                      value={newBooking.deposit_paid_amount}
                      onChange={(e) =>
                        setNewBooking({
                          ...newBooking,
                          deposit_paid_amount: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Method</Label>
                    <Select
                      value={newBooking.deposit_payment_method}
                      onValueChange={(value) =>
                        setNewBooking({
                          ...newBooking,
                          deposit_payment_method: value,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="vult_mastercard">
                          Vult Mastercard
                        </SelectItem>
                        <SelectItem value="orange_money">
                          Orange Money
                        </SelectItem>
                        <SelectItem value="afrimoney">Afrimoney</SelectItem>
                        <SelectItem value="bank_transfer">
                          Bank Transfer
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Transaction Reference</Label>
                  <Input
                    placeholder="Receipt/reference number"
                    value={newBooking.transaction_id}
                    onChange={(e) =>
                      setNewBooking({
                        ...newBooking,
                        transaction_id: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={newBooking.notes}
                  onChange={(e) =>
                    setNewBooking({ ...newBooking, notes: e.target.value })
                  }
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateBooking} disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Walk-In Booking"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by client, package or reference..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" /> All Bookings (
            {filteredBookings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">No bookings found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Deposit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {getClientName(booking.client)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {getClientEmail(booking.client) ||
                              booking.booking_reference}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{booking.service?.name || "N/A"}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {new Date(
                              booking.booking_date,
                            ).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {booking.start_time?.slice(0, 5)} •{" "}
                            {booking.staff?.full_name || "Unassigned"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="capitalize text-xs px-2 py-1 rounded bg-muted">
                          {(booking.booking_source || "online").replace(
                            "_",
                            " ",
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <span
                            className={`px-2 py-1 rounded text-xs font-medium capitalize ${depositColors[booking.deposit_status || "required"]}`}
                          >
                            {booking.deposit_status || "required"}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            $
                            {Number(
                              booking.deposit_paid_amount || 0,
                            ).toLocaleString()}{" "}
                            / $
                            {Number(
                              booking.deposit_required_amount || 0,
                            ).toLocaleString()}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium capitalize ${statusColors[booking.status] || statusColors.pending}`}
                        >
                          {booking.status.replace("_", " ")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openViewBooking(booking)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openEditBooking(booking)}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Booking
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleUpdateStatus(booking.id, "confirmed")
                              }
                              disabled={booking.status === "confirmed"}
                            >
                              Confirm
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                handleUpdateStatus(booking.id, "completed")
                              }
                              disabled={booking.status === "completed"}
                            >
                              Mark Complete
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteBooking(booking.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              {selectedBooking?.booking_reference || selectedBooking?.id}
            </DialogDescription>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-5">
              <div className="grid md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Client</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p className="font-medium">
                      {getClientName(selectedBooking.client)}
                    </p>
                    <p className="text-muted-foreground">
                      {getClientEmail(selectedBooking.client) || "No email"}
                    </p>
                    <p className="text-muted-foreground">
                      {selectedBooking.client?.phone ||
                        selectedBooking.client?.profile?.phone ||
                        ""}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Session</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>{selectedBooking.service?.name || "N/A"}</p>
                    <p>
                      {new Date(
                        selectedBooking.booking_date,
                      ).toLocaleDateString()}{" "}
                      at {selectedBooking.start_time?.slice(0, 5)}
                    </p>
                    <p className="text-muted-foreground">
                      {selectedBooking.location || "Studio"}
                    </p>
                  </CardContent>
                </Card>
              </div>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <Label>Status</Label>
                  <p className="capitalize">
                    {selectedBooking.status.replace("_", " ")}
                  </p>
                </div>
                <div>
                  <Label>Source</Label>
                  <p className="capitalize">
                    {(selectedBooking.booking_source || "online").replace(
                      "_",
                      " ",
                    )}
                  </p>
                </div>
                <div>
                  <Label>Photographer</Label>
                  <p>{selectedBooking.staff?.full_name || "Unassigned"}</p>
                </div>
                <div>
                  <Label>Total Amount</Label>
                  <p>
                    $
                    {Number(selectedBooking.total_amount || 0).toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label>Deposit Required</Label>
                  <p>
                    $
                    {Number(
                      selectedBooking.deposit_required_amount || 0,
                    ).toLocaleString()}
                  </p>
                </div>
                <div>
                  <Label>Deposit Paid</Label>
                  <p>
                    $
                    {Number(
                      selectedBooking.deposit_paid_amount || 0,
                    ).toLocaleString()}
                  </p>
                </div>
                <div className="md:col-span-3">
                  <Label>Notes</Label>
                  <p>{selectedBooking.notes || "No notes"}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              Close
            </Button>
            {selectedBooking && (
              <Button
                onClick={() => {
                  setViewOpen(false);
                  openEditBooking(selectedBooking);
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Booking
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
            <DialogDescription>
              Update booking details, photographer, status and deposit
              information.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Package</Label>
                <Select
                  value={editBooking.service_id}
                  onValueChange={(value) =>
                    setEditBooking({ ...editBooking, service_id: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select package" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map((service) => (
                      <SelectItem key={service.id} value={service.id}>
                        {service.name} - ${service.base_price}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Photographer</Label>
                <Select
                  value={editBooking.staff_id || "unassigned"}
                  onValueChange={(value) =>
                    setEditBooking({
                      ...editBooking,
                      staff_id: value === "unassigned" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Assign photographer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {staff.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.full_name || member.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={editBooking.booking_date}
                  onChange={(e) =>
                    setEditBooking({
                      ...editBooking,
                      booking_date: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Start</Label>
                <Input
                  type="time"
                  value={editBooking.start_time}
                  onChange={(e) =>
                    setEditBooking({
                      ...editBooking,
                      start_time: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>End</Label>
                <Input
                  type="time"
                  value={editBooking.end_time}
                  onChange={(e) =>
                    setEditBooking({ ...editBooking, end_time: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editBooking.status}
                  onValueChange={(value) =>
                    setEditBooking({ ...editBooking, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input
                value={editBooking.location}
                onChange={(e) =>
                  setEditBooking({ ...editBooking, location: e.target.value })
                }
              />
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Deposit %</Label>
                <Select
                  value={editBooking.deposit_percentage}
                  onValueChange={(value) =>
                    setEditBooking({
                      ...editBooking,
                      deposit_percentage: value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30%</SelectItem>
                    <SelectItem value="50">50%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Deposit Paid</Label>
                <Input
                  type="number"
                  value={editBooking.deposit_paid_amount}
                  onChange={(e) =>
                    setEditBooking({
                      ...editBooking,
                      deposit_paid_amount: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <Select
                  value={editBooking.deposit_payment_method || "none"}
                  onValueChange={(value) =>
                    setEditBooking({
                      ...editBooking,
                      deposit_payment_method: value === "none" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="vult_mastercard">
                      Vult Mastercard
                    </SelectItem>
                    <SelectItem value="orange_money">Orange Money</SelectItem>
                    <SelectItem value="afrimoney">Afrimoney</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editBooking.notes}
                onChange={(e) =>
                  setEditBooking({ ...editBooking, notes: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateBooking} disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
