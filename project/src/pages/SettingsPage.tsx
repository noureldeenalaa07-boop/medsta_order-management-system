import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import type { Staff, StaffPermission, ShippingMethod } from "../lib/types";
import { SECTION_LABELS, TAB_SECTIONS } from "../lib/types";
import { useAuth } from "../lib/auth";
import {
  Settings, UserPlus, Users, Truck, Shield, Trash2, Edit3,
  Check, X, Lock, Mail, Eye, Edit, Plus, Save,
} from "lucide-react";

export default function SettingsPage() {
  const { staff: currentUser, signOut } = useAuth();
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [permissions, setPermissions] = useState<StaffPermission[]>([]);
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [activeSection, setActiveSection] = useState<"staff" | "shipping" | "permissions">("staff");

  // Add staff form
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [addingStaff, setAddingStaff] = useState(false);
  const [staffError, setStaffError] = useState("");

  // Edit staff
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [editName, setEditName] = useState("");
  const [editPassword, setEditPassword] = useState("");

  // Permissions
  const [permStaffId, setPermStaffId] = useState<string>("");

  // Shipping
  const [newShipName, setNewShipName] = useState("");
  const [newShipColor, setNewShipColor] = useState("#6366f1");
  const [editShip, setEditShip] = useState<ShippingMethod | null>(null);
  const [editShipName, setEditShipName] = useState("");
  const [editShipColor, setEditShipColor] = useState("#6366f1");

  const isAdmin = currentUser?.role === "admin";

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    const [staffRes, permRes, shipRes] = await Promise.all([
      supabase.from("staff").select("*").order("created_at", { ascending: false }),
      supabase.from("staff_permissions").select("*"),
      supabase.from("shipping_methods").select("*").order("created_at", { ascending: false }),
    ]);
    setStaffList((staffRes.data as Staff[]) || []);
    setPermissions((permRes.data as StaffPermission[]) || []);
    setShippingMethods((shipRes.data as ShippingMethod[]) || []);
  }

  async function addStaff() {
    setStaffError("");
    setAddingStaff(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
      });
      if (error) throw error;
      if (data.user) {
        const { error: staffErr } = await supabase.from("staff").insert({
          id: data.user.id,
          email: newEmail,
          full_name: newName,
          role: "staff",
        });
        if (staffErr) throw staffErr;
      }
      setNewEmail("");
      setNewPassword("");
      setNewName("");
      await loadAll();
    } catch (err) {
      setStaffError(err instanceof Error ? err.message : "Error");
    } finally {
      setAddingStaff(false);
    }
  }

  async function updateStaffName() {
    if (!editingStaff) return;
    await supabase.from("staff").update({ full_name: editName }).eq("id", editingStaff.id);
    setEditingStaff(null);
    await loadAll();
  }

  async function updateStaffPassword() {
    if (!editingStaff || !editPassword) return;
    await supabase.auth.updateUser({ password: editPassword });
    setEditPassword("");
  }

  async function toggleStaffActive(staff: Staff) {
    await supabase.from("staff").update({ is_active: !staff.is_active }).eq("id", staff.id);
    await loadAll();
  }

  async function addShippingMethod() {
    if (!newShipName.trim()) return;
    await supabase.from("shipping_methods").insert({
      name: newShipName.trim(),
      color: newShipColor,
    });
    setNewShipName("");
    setNewShipColor("#6366f1");
    await loadAll();
  }

  async function updateShippingMethod() {
    if (!editShip) return;
    await supabase.from("shipping_methods").update({
      name: editShipName,
      color: editShipColor,
    }).eq("id", editShip.id);
    setEditShip(null);
    await loadAll();
  }

  async function deleteShippingMethod(id: string) {
    await supabase.from("shipping_methods").delete().eq("id", id);
    await loadAll();
  }

  async function togglePermission(staffId: string, section: string, field: "can_view" | "can_edit" | "can_add" | "can_delete") {
    const existing = permissions.find((p) => p.staff_id === staffId && p.section_name === section);
    if (existing) {
      await supabase
        .from("staff_permissions")
        .update({ [field]: !existing[field] })
        .eq("id", existing.id);
    } else {
      await supabase.from("staff_permissions").insert({
        staff_id: staffId,
        section_name: section,
        [field]: true,
      });
    }
    await loadAll();
  }

  const inputCls = "w-full bg-navy-800/50 border border-navy-600/50 rounded-lg px-3 py-2 text-sm text-white placeholder:text-navy-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all";

  const sections = [...TAB_SECTIONS, "dashboard", "settings"];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-primary-400" />
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      {/* Section tabs */}
      <div className="flex gap-2 p-1 bg-navy-800/50 rounded-xl w-fit">
        {[
          { key: "staff", label: "Staff", icon: Users },
          { key: "permissions", label: "Permissions", icon: Shield },
          { key: "shipping", label: "Shipping Methods", icon: Truck },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSection(tab.key as "staff" | "shipping" | "permissions")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeSection === tab.key ? "bg-primary-600 text-white" : "text-navy-300 hover:text-white"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Staff section */}
      {activeSection === "staff" && (
        <div className="space-y-4 animate-slide-up">
          {isAdmin && (
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary-400" /> Add New Staff Member
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-navy-400 mb-1">Full Name</label>
                  <input value={newName} onChange={(e) => setNewName(e.target.value)} className={inputCls} placeholder="Full name" />
                </div>
                <div>
                  <label className="block text-xs text-navy-400 mb-1">Email</label>
                  <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={inputCls} placeholder="email@company.com" />
                </div>
                <div>
                  <label className="block text-xs text-navy-400 mb-1">Password</label>
                  <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputCls} placeholder="••••••" />
                </div>
              </div>
              {staffError && <div className="text-danger-400 text-sm mt-2">{staffError}</div>}
              <button onClick={addStaff} disabled={addingStaff} className="btn-primary mt-3 text-sm">
                <Plus className="w-4 h-4 inline mr-1" />
                {addingStaff ? "Adding..." : "Add Staff"}
              </button>
            </div>
          )}

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Staff List</h3>
            <div className="space-y-2">
              {staffList.map((s) => (
                <div key={s.id} className="flex items-center justify-between bg-navy-800/30 rounded-lg px-4 py-3 hover:bg-navy-700/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-sm">
                      {s.full_name.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm text-white font-medium">{s.full_name}</div>
                      <div className="text-xs text-navy-400 flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {s.email}
                      </div>
                    </div>
                    <span className={`status-badge ${s.role === "admin" ? "bg-primary-500/15 text-primary-400" : "bg-navy-500/20 text-navy-300"}`}>
                      {s.role === "admin" ? "Admin" : "Staff"}
                    </span>
                    {!s.is_active && <span className="status-badge bg-danger-500/15 text-danger-400">Inactive</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingStaff(s);
                        setEditName(s.full_name);
                      }}
                      className="text-navy-300 hover:text-primary-400 transition-colors p-2 rounded-lg hover:bg-navy-700/30"
                      title="Edit"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {isAdmin && s.id !== currentUser?.id && (
                      <button
                        onClick={() => toggleStaffActive(s)}
                        className={`text-xs px-2 py-1 rounded-lg transition-colors ${
                          s.is_active ? "text-danger-400 hover:bg-danger-500/10" : "text-accent-400 hover:bg-accent-500/10"
                        }`}
                      >
                        {s.is_active ? "Deactivate" : "Activate"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Edit staff modal */}
          {editingStaff && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setEditingStaff(null)}>
              <div className="glass-card p-6 w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Edit Staff Member</h3>
                  <button onClick={() => setEditingStaff(null)} className="text-navy-400 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-navy-400 mb-1">Name</label>
                    <input value={editName} onChange={(e) => setEditName(e.target.value)} className={inputCls} />
                  </div>
                  <button onClick={updateStaffName} className="btn-primary text-sm w-full">
                    <Save className="w-4 h-4 inline mr-1" /> Save Name
                  </button>
                  {editingStaff.id === currentUser?.id && (
                    <div className="pt-3 border-t border-navy-700/50">
                      <label className="block text-xs text-navy-400 mb-1">Change Password</label>
                      <div className="flex gap-2">
                        <input value={editPassword} onChange={(e) => setEditPassword(e.target.value)} type="password" className={inputCls} placeholder="New password" />
                        <button onClick={updateStaffPassword} className="btn-secondary px-3">
                          <Lock className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Permissions section */}
      {activeSection === "permissions" && (
        <div className="space-y-4 animate-slide-up">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary-400" /> Manage Staff Permissions
            </h3>
            <div className="mb-4">
              <label className="block text-xs text-navy-400 mb-2">Select Staff Member</label>
              <select value={permStaffId} onChange={(e) => setPermStaffId(e.target.value)} className={inputCls}>
                <option value="">-- Select --</option>
                {staffList.filter((s) => s.role !== "admin").map((s) => (
                  <option key={s.id} value={s.id}>{s.full_name}</option>
                ))}
              </select>
            </div>
            {permStaffId && (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-navy-700/50">
                      <th className="px-3 py-2 text-xs text-navy-300">Section</th>
                      <th className="px-3 py-2 text-xs text-navy-300"><Eye className="w-3.5 h-3.5 inline" /> View</th>
                      <th className="px-3 py-2 text-xs text-navy-300"><Edit className="w-3.5 h-3.5 inline" /> Edit</th>
                      <th className="px-3 py-2 text-xs text-navy-300"><Plus className="w-3.5 h-3.5 inline" /> Add</th>
                      <th className="px-3 py-2 text-xs text-navy-300"><Trash2 className="w-3.5 h-3.5 inline" /> Delete</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sections.map((section) => {
                      const perm = permissions.find((p) => p.staff_id === permStaffId && p.section_name === section);
                      return (
                        <tr key={section} className="border-b border-navy-700/20">
                          <td className="px-3 py-2.5 text-sm text-white">{SECTION_LABELS[section]}</td>
                          {(["can_view", "can_edit", "can_add", "can_delete"] as const).map((field) => (
                            <td key={field} className="px-3 py-2.5 text-center">
                              <button
                                onClick={() => togglePermission(permStaffId, section, field)}
                                className={`w-6 h-6 rounded-md transition-all ${
                                  perm?.[field]
                                    ? "bg-accent-500/20 text-accent-400 border border-accent-500/30"
                                    : "bg-navy-800/30 text-navy-600 border border-navy-700/30"
                                }`}
                              >
                                {perm?.[field] ? <Check className="w-3.5 h-3.5 mx-auto" /> : <X className="w-3.5 h-3.5 mx-auto" />}
                              </button>
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Shipping section */}
      {activeSection === "shipping" && (
        <div className="space-y-4 animate-slide-up">
          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Truck className="w-4 h-4 text-primary-400" /> Add Shipping Method
            </h3>
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs text-navy-400 mb-1">Name</label>
                <input value={newShipName} onChange={(e) => setNewShipName(e.target.value)} className={inputCls} placeholder="e.g. Aramex" />
              </div>
              <div>
                <label className="block text-xs text-navy-400 mb-1">Color</label>
                <input type="color" value={newShipColor} onChange={(e) => setNewShipColor(e.target.value)} className="w-12 h-10 rounded-lg cursor-pointer bg-navy-800 border border-navy-600" />
              </div>
              <button onClick={addShippingMethod} className="btn-primary text-sm">
                <Plus className="w-4 h-4 inline mr-1" /> Add
              </button>
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Shipping Methods</h3>
            <div className="space-y-2">
              {shippingMethods.map((m) => (
                <div key={m.id} className="flex items-center justify-between bg-navy-800/30 rounded-lg px-4 py-3 hover:bg-navy-700/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full" style={{ backgroundColor: m.color }} />
                    <span className="text-sm text-white">{m.name}</span>
                    {!m.is_active && <span className="status-badge bg-danger-500/15 text-danger-400">Disabled</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setEditShip(m);
                        setEditShipName(m.name);
                        setEditShipColor(m.color);
                      }}
                      className="text-navy-300 hover:text-primary-400 transition-colors p-2 rounded-lg hover:bg-navy-700/30"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteShippingMethod(m.id)}
                      className="text-navy-300 hover:text-danger-400 transition-colors p-2 rounded-lg hover:bg-navy-700/30"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
              {shippingMethods.length === 0 && (
                <div className="text-center text-navy-400 text-sm py-4">No shipping methods yet</div>
              )}
            </div>
          </div>

          {editShip && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setEditShip(null)}>
              <div className="glass-card p-6 w-full max-w-md animate-scale-in" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Edit Shipping Method</h3>
                  <button onClick={() => setEditShip(null)} className="text-navy-400 hover:text-white"><X className="w-5 h-5" /></button>
                </div>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="block text-xs text-navy-400 mb-1">Name</label>
                    <input value={editShipName} onChange={(e) => setEditShipName(e.target.value)} className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-xs text-navy-400 mb-1">Color</label>
                    <input type="color" value={editShipColor} onChange={(e) => setEditShipColor(e.target.value)} className="w-12 h-10 rounded-lg cursor-pointer bg-navy-800 border border-navy-600" />
                  </div>
                </div>
                <button onClick={updateShippingMethod} className="btn-primary text-sm w-full mt-4">
                  <Save className="w-4 h-4 inline mr-1" /> Save
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
