"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Search,
  Users,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Mail,
  Phone,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { createClient } from "@/lib/supabase/client";
import { createAuditLog } from "@/lib/audit-log-client";
import { adminDbMutation } from "@/lib/admin-api-client";
import { toast } from "sonner";
import type { Client, Profile } from "@/lib/types";

interface ExtendedClient extends Client {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  profile?: Profile | null;
}

interface ClientsClientProps {
  initialClients: ExtendedClient[];
}

type ClientForm = {
  full_name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  preferred_contact: string;
  notes: string;
};

const emptyForm: ClientForm = {
  full_name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  preferred_contact: "phone",
  notes: "",
};

function getClientName(client?: ExtendedClient | null) {
  return (
    client?.full_name ||
    client?.profile?.full_name ||
    client?.email ||
    client?.profile?.email ||
    "Unnamed Client"
  );
}

function getClientEmail(client?: ExtendedClient | null) {
  return client?.email || client?.profile?.email || "";
}

function getClientPhone(client?: ExtendedClient | null) {
  return client?.phone || client?.profile?.phone || "";
}

function toForm(client: ExtendedClient): ClientForm {
  return {
    full_name:
      getClientName(client) === "Unnamed Client" ? "" : getClientName(client),
    email: getClientEmail(client),
    phone: getClientPhone(client),
    address: client.address || "",
    city: client.city || "",
    preferred_contact: client.preferred_contact || "phone",
    notes: client.notes || "",
  };
}

export function ClientsClient({ initialClients }: ClientsClientProps) {
  const supabase = createClient();
  const [clients, setClients] = useState<ExtendedClient[]>(
    initialClients || [],
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<ExtendedClient | null>(
    null,
  );
  const [viewOpen, setViewOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ClientForm>(emptyForm);

  const filteredClients = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return clients.filter(
      (client) =>
        getClientName(client).toLowerCase().includes(q) ||
        getClientEmail(client).toLowerCase().includes(q) ||
        getClientPhone(client).toLowerCase().includes(q) ||
        (client.city || "").toLowerCase().includes(q),
    );
  }, [clients, searchQuery]);

  function openView(client: ExtendedClient) {
    setSelectedClient(client);
    setViewOpen(true);
  }

  function openEdit(client: ExtendedClient) {
    setSelectedClient(client);
    setForm(toForm(client));
    setEditOpen(true);
  }

  function openAdd() {
    setSelectedClient(null);
    setForm(emptyForm);
    setAddOpen(true);
  }

  async function handleAddClient() {
    if (!form.full_name || (!form.email && !form.phone)) {
      toast.error("Enter client name and email or phone");
      return;
    }

    setSaving(true);
    let data: ExtendedClient
    try {
      data = await adminDbMutation<ExtendedClient>({
        table: "clients",
        action: "insert",
        payload: {
          full_name: form.full_name,
          email: form.email || null,
          phone: form.phone || null,
          address: form.address || null,
          city: form.city || null,
          preferred_contact: form.preferred_contact || null,
          notes: form.notes || null,
        },
      })
    } catch (error) {
      setSaving(false);
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to add client");
      return;
    }

    setSaving(false);

    setClients([data as ExtendedClient, ...clients]);
    setAddOpen(false);
    await createAuditLog({
      action: "create_client",
      resource_type: "client",
      resource_id: data.id,
      new_data: data,
    });
    toast.success("Client added");
  }

  async function handleUpdateClient() {
    if (!selectedClient) return;
    if (!form.full_name || (!form.email && !form.phone)) {
      toast.error("Enter client name and email or phone");
      return;
    }

    setSaving(true);
    let data: ExtendedClient
    try {
      data = await adminDbMutation<ExtendedClient>({
        table: "clients",
        action: "update",
        id: selectedClient.id,
        payload: {
          full_name: form.full_name,
          email: form.email || null,
          phone: form.phone || null,
          address: form.address || null,
          city: form.city || null,
          preferred_contact: form.preferred_contact || null,
          notes: form.notes || null,
        },
      })
    } catch (error) {
      setSaving(false);
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to update client");
      return;
    }

    setSaving(false);

    setClients(
      clients.map((client) =>
        client.id === selectedClient.id ? (data as ExtendedClient) : client,
      ),
    );
    setSelectedClient(data as ExtendedClient);
    setEditOpen(false);
    await createAuditLog({
      action: "update_client",
      resource_type: "client",
      resource_id: data.id,
      old_data: selectedClient,
      new_data: data,
    });
    toast.success("Client updated");
  }

  async function handleDeleteClient(client: ExtendedClient) {
    if (
      !confirm(
        `Delete ${getClientName(client)}? This may fail if the client has bookings.`,
      )
    )
      return;

    try {
      await adminDbMutation({
        table: "clients",
        action: "delete",
        id: client.id,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to delete client");
      return;
    }

    setClients(clients.filter((item) => item.id !== client.id));
    await createAuditLog({
      action: "delete_client",
      resource_type: "client",
      resource_id: client.id,
      old_data: client,
    });
    toast.success("Client deleted");
  }

  const ClientFormFields = (
    <div className="space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Full Name *</Label>
          <Input
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Phone</Label>
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>City</Label>
          <Input
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Address</Label>
        <Input
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <Label>Preferred Contact</Label>
        <Select
          value={form.preferred_contact}
          onValueChange={(value) =>
            setForm({ ...form, preferred_contact: value })
          }
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="phone">Phone</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="text">Text</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label>Notes</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl font-bold">Clients</h1>
          <p className="text-muted-foreground mt-1">
            Manage your client database and contact information.
          </p>
        </div>
        <Button className="gap-2" onClick={openAdd}>
          <Plus className="w-4 h-4" />
          Add Client
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone or city..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            All Clients ({filteredClients.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredClients.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No clients found
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Preferred Contact</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>
                              {getClientName(client).charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {getClientName(client)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {getClientEmail(client) || "No email"}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1 text-sm">
                          <p className="flex items-center gap-2">
                            <Mail className="w-4 h-4" />
                            {getClientEmail(client) || "N/A"}
                          </p>
                          <p className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="w-4 h-4" />
                            {getClientPhone(client) || "N/A"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {client.city || client.address || "N/A"}
                      </TableCell>
                      <TableCell className="capitalize">
                        {client.preferred_contact || "phone"}
                      </TableCell>
                      <TableCell>
                        {new Date(client.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openView(client)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Profile
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(client)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Client
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() =>
                                (window.location.href = `mailto:${getClientEmail(client)}`)
                              }
                              disabled={!getClientEmail(client)}
                            >
                              <Mail className="w-4 h-4 mr-2" />
                              Send Email
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDeleteClient(client)}
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Client</DialogTitle>
            <DialogDescription>
              Create a walk-in or manual client profile.
            </DialogDescription>
          </DialogHeader>
          {ClientFormFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddClient} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Save Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
            <DialogDescription>
              Update client details and contact information.
            </DialogDescription>
          </DialogHeader>
          {ClientFormFields}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateClient} disabled={saving}>
              <Save className="w-4 h-4 mr-2" />
              {saving ? "Saving..." : "Update Client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Client Profile</DialogTitle>
            <DialogDescription>Full client details</DialogDescription>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14">
                  <AvatarFallback>
                    {getClientName(selectedClient).charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">
                    {getClientName(selectedClient)}
                  </h3>
                  <p className="text-muted-foreground">
                    {getClientEmail(selectedClient) || "No email"}
                  </p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <Label>Phone</Label>
                  <p>{getClientPhone(selectedClient) || "N/A"}</p>
                </div>
                <div>
                  <Label>Preferred Contact</Label>
                  <p className="capitalize">
                    {selectedClient.preferred_contact || "phone"}
                  </p>
                </div>
                <div>
                  <Label>City</Label>
                  <p>{selectedClient.city || "N/A"}</p>
                </div>
                <div>
                  <Label>Joined</Label>
                  <p>
                    {new Date(selectedClient.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <Label>Address</Label>
                  <p>{selectedClient.address || "N/A"}</p>
                </div>
                <div className="md:col-span-2">
                  <Label>Notes</Label>
                  <p>{selectedClient.notes || "No notes"}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              Close
            </Button>
            {selectedClient && (
              <Button
                onClick={() => {
                  setViewOpen(false);
                  openEdit(selectedClient);
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
