"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Users, Plus, Search, Mail, MapPin,
    Phone, Edit, Trash2, X, Check, ArrowLeft,
    UserPlus
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppHeader } from "@/components/layout/app-header";
import { AppFooter } from "@/components/layout/app-footer";
import toast from "react-hot-toast";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface SavedClient {
    id: string;
    name: string;
    email: string | null;
    address: string | null;
    phone: string | null;
    created_at: string;
}

export default function ClientsPage() {
    const { user, token, loading: authLoading } = useAuth();
    const router = useRouter();
    const [clients, setClients] = useState<SavedClient[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    // Creation State
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newAddress, setNewAddress] = useState("");
    const [newPhone, setNewPhone] = useState("");
    const [isCreatingLoading, setIsCreatingLoading] = useState(false);

    // Editing State
    const [editingClient, setEditingClient] = useState<SavedClient | null>(null);
    const [editName, setEditName] = useState("");
    const [editEmail, setEditEmail] = useState("");
    const [editAddress, setEditAddress] = useState("");
    const [editPhone, setEditPhone] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (authLoading) return;
        if (!user || !token) { router.push("/login"); return; }
        fetchClients();
    }, [user, token, authLoading, router]);

    const fetchClients = async () => {
        try {
            const res = await fetch(`${API_URL}/api/clients/saved`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setClients(await res.json());
        } catch {
            toast.error("Failed to load clients");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this client?")) return;
        try {
            const res = await fetch(`${API_URL}/api/clients/saved/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                setClients(clients.filter(c => c.id !== id));
                toast.success("Client deleted");
            }
        } catch {
            toast.error("Failed to delete client");
        }
    };

    const startEdit = (client: SavedClient) => {
        setEditingClient(client);
        setEditName(client.name);
        setEditEmail(client.email || "");
        setEditAddress(client.address || "");
        setEditPhone(client.phone || "");
    };

    const handleUpdate = async () => {
        if (!editingClient || !editName.trim()) return;
        setIsSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/clients/saved/${editingClient.id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: editName,
                    email: editEmail || null,
                    address: editAddress || null,
                    phone: editPhone || null
                })
            });
            if (res.ok) {
                const updated = await res.json();
                setClients(clients.map(c => c.id === updated.id ? updated : c));
                setEditingClient(null);
                toast.success("Client updated");
            }
        } catch {
            toast.error("Update failed");
        } finally {
            setIsSaving(false);
        }
    };

    const handleCreate = async () => {
        if (!newName.trim()) { toast.error("Name is required"); return; }
        setIsCreatingLoading(true);
        try {
            const res = await fetch(`${API_URL}/api/clients/saved`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: newName,
                    email: newEmail || null,
                    address: newAddress || null,
                    phone: newPhone || null
                })
            });
            if (res.ok) {
                const created = await res.json();
                setClients([created, ...clients]);
                setIsCreating(false);
                setNewName("");
                setNewEmail("");
                setNewAddress("");
                setNewPhone("");
                toast.success("Client added successfully");
            } else {
                const err = await res.json();
                toast.error(err.detail || "Failed to create client");
            }
        } catch {
            toast.error("Network error");
        } finally {
            setIsCreatingLoading(false);
        }
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (authLoading || loading) {
        return <div className="min-h-screen flex items-center justify-center"><p className="text-[#8A8880] text-sm italic">Loading your network...</p></div>;
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#FAF9F6]">
            <AppHeader />

            <main className="max-w-4xl mx-auto px-5 py-10 flex-1 w-full">
                {isCreating && (
                    <Card className="mb-8 border-[#D4A017] bg-[#FFFBF0]/30 shadow-sm animate-in fade-in slide-in-from-top-2">
                        <CardContent className="p-6">
                            <h2 className="text-lg font-medium mb-4 flex items-center gap-2">
                                <UserPlus className="h-5 w-5 text-[#D4A017]" /> New Client Record
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A8880]">Full Name *</label>
                                    <Input
                                        placeholder="e.g. Acme Corp"
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className="h-9 text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A8880]">Email Address</label>
                                    <Input
                                        placeholder="client@example.com"
                                        type="email"
                                        value={newEmail}
                                        onChange={(e) => setNewEmail(e.target.value)}
                                        className="h-9 text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A8880]">Phone Number</label>
                                    <Input
                                        placeholder="+1 234 567 890"
                                        value={newPhone}
                                        onChange={(e) => setNewPhone(e.target.value)}
                                        className="h-9 text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-[#8A8880]">Postal Address</label>
                                    <Input
                                        placeholder="Street, City, Country"
                                        value={newAddress}
                                        onChange={(e) => setNewAddress(e.target.value)}
                                        className="h-9 text-sm"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs text-[#8A8880]"
                                    onClick={() => setIsCreating(false)}
                                >
                                    Dismiss
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-[#1A1A18] hover:bg-[#333] text-white px-6"
                                    onClick={handleCreate}
                                    disabled={isCreatingLoading}
                                >
                                    {isCreatingLoading ? "Saving..." : "Save to Address Book"}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-3xl font-light tracking-tight flex items-center gap-4" style={{ fontFamily: "var(--font-heading)" }}>
                            Saved Clients
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsCreating(!isCreating)}
                                className="text-xs h-8 border-[#E8E6E0] text-[#4A4A45] hover:bg-[#F5F3EE] font-sans font-normal"
                            >
                                {isCreating ? <X className="h-3.5 w-3.5 mr-1.5" /> : <Plus className="h-3.5 w-3.5 mr-1.5" />}
                                {isCreating ? "Cancel" : "Add Client"}
                            </Button>
                        </h1>
                        <p className="text-sm text-[#8A8880] mt-1">Manage your professional network and address book.</p>
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-[50%] -translate-y-[50%] h-4 w-4 text-[#8A8880]" />
                        <Input
                            placeholder="Find a client..."
                            className="pl-10 h-10 bg-white border-[#E8E6E0]"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {filteredClients.length === 0 ? (
                    <Card className="border-dashed bg-white/50">
                        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                            <Users className="h-12 w-12 text-[#E8E6E0] mb-4 opacity-50" />
                            <p className="text-[#4A4A45] font-medium">No clients found</p>
                            <p className="text-sm text-[#8A8880] mt-1 max-w-xs">
                                Create an invoice or quote to automatically save a new client to your book.
                            </p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {filteredClients.map((client) => (
                            <Card key={client.id} className="group hover:shadow-md transition-all border-[#E8E6E0] bg-white">
                                <CardContent className="p-5">
                                    {editingClient?.id === client.id ? (
                                        <div className="space-y-4">
                                            <Input
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                placeholder="Name"
                                                className="text-sm h-9"
                                            />
                                            <Input
                                                value={editEmail}
                                                onChange={(e) => setEditEmail(e.target.value)}
                                                placeholder="Email"
                                                className="text-sm h-9"
                                            />
                                            <Input
                                                value={editPhone}
                                                onChange={(e) => setEditPhone(e.target.value)}
                                                placeholder="Phone"
                                                className="text-sm h-9"
                                            />
                                            <Textarea
                                                value={editAddress}
                                                onChange={(e) => setEditAddress(e.target.value)}
                                                placeholder="Address"
                                                className="text-sm min-h-[80px]"
                                            />
                                            <div className="flex gap-2">
                                                <Button
                                                    size="sm"
                                                    className="flex-1 bg-[#D4A017] hover:bg-[#B8860B] text-white"
                                                    onClick={handleUpdate}
                                                    disabled={isSaving}
                                                >
                                                    {isSaving ? "Saving..." : "Save Changes"}
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => setEditingClient(null)}
                                                >
                                                    Cancel
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="w-10 h-10 rounded-full bg-[#F5F3EE] flex items-center justify-center text-[#D4A017] font-medium">
                                                    {client.name.charAt(0)}
                                                </div>
                                                <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-[#8A8880] hover:text-[#1A1A18]" onClick={() => startEdit(client)}>
                                                        <Edit className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600" onClick={() => handleDelete(client.id)}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <h3 className="text-base font-medium text-[#1A1A18]">{client.name}</h3>
                                            <div className="mt-3 space-y-1.5">
                                                {client.email && (
                                                    <div className="flex items-center text-xs text-[#8A8880]">
                                                        <Mail className="h-3 w-3 mr-2 shrink-0" />
                                                        <span className="truncate">{client.email}</span>
                                                    </div>
                                                )}
                                                {client.phone && (
                                                    <div className="flex items-center text-xs text-[#8A8880]">
                                                        <Phone className="h-3 w-3 mr-2 shrink-0" />
                                                        <span>{client.phone}</span>
                                                    </div>
                                                )}
                                                {client.address && (
                                                    <div className="flex items-start text-xs text-[#8A8880]">
                                                        <MapPin className="h-3 w-3 mr-2 mt-0.5 shrink-0" />
                                                        <span className="line-clamp-2">{client.address}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </main>
            <AppFooter maxWidth="max-w-4xl" />
        </div>
    );
}
