"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  ShieldCheck, 
  UserPlus, 
  Trash2, 
  RefreshCw, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Mail, 
  Building2, 
  Briefcase, 
  GraduationCap, 
  Lock,
  Layers
} from "lucide-react";
import { DEPARTMENTS } from "@/components/onboarding/OnboardingForm";

export interface AuthorizedStaffItem {
  _id: string;
  email: string;
  role: "Faculty / Teacher" | "Head of Dept (HOD)" | string;
  name?: string;
  department?: string;
  createdAt?: string;
  updatedAt?: string;
}

export function StaffAccessManagement() {
  const [staffList, setStaffList] = useState<AuthorizedStaffItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revokingEmail, setRevokingEmail] = useState<string | null>(null);

  // Form State
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"Faculty / Teacher" | "Head of Dept (HOD)">("Faculty / Teacher");
  const [department, setDepartment] = useState("Computer Science & Engineering (CSE)");
  const [name, setName] = useState("");

  // Feedback State
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Search Filter
  const [searchQuery, setSearchQuery] = useState("");

  const fetchStaffList = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/admin/staff");
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to fetch staff whitelist.");
      }
      setStaffList(data.staff || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error loading authorized staff.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStaffList();
  }, []);

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMessage("Please enter a valid official staff email address.");
      return;
    }

    if (!name.trim()) {
      setErrorMessage("Full Official Name is required to properly identify the staff member.");
      return;
    }

    if (!department.trim()) {
      setErrorMessage("Please select an Academic Department for the staff member.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          role,
          name: name.trim(),
          department: department.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to whitelist staff member.");
      }

      setSuccessMessage(`Successfully whitelisted ${cleanEmail} as ${role}.`);
      setEmail("");
      setName("");
      await fetchStaffList();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error whitelisting staff member.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevokeStaff = async (staffEmail: string) => {
    if (!window.confirm(`Are you sure you want to revoke access for ${staffEmail}? They will immediately lose their authorized role.`)) {
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setRevokingEmail(staffEmail);

    try {
      const res = await fetch(`/api/admin/staff?email=${encodeURIComponent(staffEmail)}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to revoke staff access.");
      }

      setSuccessMessage(`Access revoked for ${staffEmail}.`);
      setStaffList((prev) => prev.filter((s) => s.email.toLowerCase() !== staffEmail.toLowerCase()));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error revoking staff access.";
      setErrorMessage(msg);
    } finally {
      setRevokingEmail(null);
    }
  };

  const filteredStaff = useMemo(() => {
    if (!searchQuery.trim()) return staffList;
    const q = searchQuery.toLowerCase().trim();
    return staffList.filter(
      (s) =>
        s.email.toLowerCase().includes(q) ||
        (s.role && s.role.toLowerCase().includes(q)) ||
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.department && s.department.toLowerCase().includes(q))
    );
  }, [staffList, searchQuery]);

  const hodCount = useMemo(() => {
    return staffList.filter((s) => s.role && s.role.toLowerCase().includes("hod")).length;
  }, [staffList]);

  const facultyCount = useMemo(() => {
    return staffList.filter((s) => s.role && (s.role.toLowerCase().includes("faculty") || s.role.toLowerCase().includes("teacher"))).length;
  }, [staffList]);

  return (
    <div className="w-full rounded-3xl glass-card border border-sky-300/80 dark:border-sky-500/30 p-6 sm:p-8 space-y-6 text-slate-900 dark:text-white shadow-xl dark:shadow-2xl relative overflow-hidden animate-fade-in">
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-sky-500/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-white/10 pb-6 relative z-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-800 border border-sky-300 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-400/30 mb-2 shadow-sm">
            <Lock className="w-3.5 h-3.5" />
            <span>Zero-Trust Institutional Whitelist</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Staff Access Management</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-xl">
            Authorize faculty and department heads into the official MongoDB whitelist. The onboarding gate strictly queries this collection to lock role permissions.
          </p>
        </div>

        {/* Stats Chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200 dark:bg-slate-900/80 dark:border-white/10 text-center">
            <span className="block text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold">Total Whitelisted</span>
            <span className="text-base font-extrabold text-slate-900 dark:text-white font-mono">{staffList.length}</span>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-purple-50 border border-purple-200 dark:bg-purple-950/40 dark:border-purple-500/30 text-center">
            <span className="block text-[10px] text-purple-700 dark:text-purple-300 uppercase tracking-wider font-bold">Authorized HODs</span>
            <span className="text-base font-extrabold text-purple-700 dark:text-purple-300 font-mono">{hodCount}</span>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-emerald-50 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-500/30 text-center">
            <span className="block text-[10px] text-emerald-700 dark:text-emerald-300 uppercase tracking-wider font-bold">Faculty / Teachers</span>
            <span className="text-base font-extrabold text-emerald-700 dark:text-emerald-300 font-mono">{facultyCount}</span>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 dark:bg-rose-500/15 dark:border-rose-500/40 dark:text-rose-200 text-xs sm:text-sm flex items-center gap-2.5 animate-fade-in">
          <AlertCircle className="w-5 h-5 text-rose-500 dark:text-rose-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-500/15 dark:border-emerald-500/40 dark:text-emerald-200 text-xs sm:text-sm flex items-center gap-2.5 animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Authorize Staff Form */}
      <form onSubmit={handleAddStaff} className="p-5 sm:p-6 rounded-2xl bg-slate-50 border border-slate-200 dark:bg-slate-950/70 dark:border-sky-500/20 space-y-4 relative z-10 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider">
          <UserPlus className="w-4 h-4 text-sky-600 dark:text-sky-400" />
          <span>Authorize New Staff Member</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs sm:text-sm">
          {/* Authorized Email */}
          <div className="lg:col-span-1">
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Authorized Email *</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. aditya@college.edu"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 dark:bg-slate-900 dark:border-white/10 dark:text-white dark:placeholder-slate-500 text-xs font-mono shadow-sm"
            />
          </div>

          {/* Role Dropdown strictly for Faculty / Teacher and Head of Dept (HOD) */}
          <div className="lg:col-span-1">
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs flex items-center gap-1.5">
              <Briefcase className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Institutional Role *</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "Faculty / Teacher" | "Head of Dept (HOD)")}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-amber-800 dark:text-amber-300 font-bold focus:outline-none focus:border-purple-500 dark:bg-slate-900 dark:border-white/10 text-xs cursor-pointer shadow-sm"
            >
              <option value="Faculty / Teacher" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                Faculty / Teacher
              </option>
              <option value="Head of Dept (HOD)" className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                Head of Dept (HOD)
              </option>
            </select>
          </div>

          {/* Full Official Name */}
          <div className="lg:col-span-1">
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Full Official Name *</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Aditya Sen"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 dark:bg-slate-900 dark:border-white/10 dark:text-white dark:placeholder-slate-500 text-xs shadow-sm"
            />
          </div>

          {/* Department */}
          <div className="lg:col-span-1">
            <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1 text-xs flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              <span>Academic Department *</span>
            </label>
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-sky-500 dark:bg-slate-900 dark:border-white/10 dark:text-white text-xs cursor-pointer shadow-sm"
            >
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept} className="bg-white text-slate-900 dark:bg-slate-900 dark:text-white">
                  {dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting || !email.trim() || !name.trim() || !department.trim()}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-blue-500 shadow-[0_0_20px_rgba(56,189,248,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authorizing in MongoDB...</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Authorize Staff Member</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Real-time Staff Table Section */}
      <div className="space-y-4 relative z-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Current Authorized Whitelist</span>
            </h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 dark:bg-sky-500/20 dark:text-sky-300 font-mono">
              {filteredStaff.length} Records
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search email, role, dept..."
                className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-slate-300 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-sky-500 dark:bg-slate-900/90 dark:border-white/10 dark:text-white dark:placeholder-slate-500 shadow-sm"
              />
            </div>

            {/* Refresh Button */}
            <button
              onClick={fetchStaffList}
              disabled={isLoading}
              title="Refresh Staff List"
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 hover:text-slate-900 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-white/10 dark:text-slate-300 dark:hover:text-white transition-all cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-sky-600 dark:text-sky-400" : ""}`} />
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white dark:bg-slate-950/80 shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900/90 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-white/10 font-mono">
                <tr>
                  <th className="p-3.5">Authorized Email</th>
                  <th className="p-3.5">Assigned Role</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Staff Name</th>
                  <th className="p-3.5">Whitelisted Date</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400">
                      <Loader2 className="w-6 h-6 animate-spin text-sky-600 dark:text-sky-400 mx-auto mb-2" />
                      <span>Querying authorizedstaffs MongoDB collection...</span>
                    </td>
                  </tr>
                ) : filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400">
                      <ShieldCheck className="w-8 h-8 text-slate-400 dark:text-slate-600 mx-auto mb-2" />
                      {searchQuery ? "No staff match your search criteria." : "No staff members currently in the whitelist."}
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((staff) => {
                    const isHod = staff.role && staff.role.toLowerCase().includes("hod");
                    const isRevoking = revokingEmail === staff.email;

                    return (
                      <tr key={staff._id || staff.email} className="hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                        <td className="p-3.5">
                          <div className="font-mono text-slate-900 dark:text-white font-semibold flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                            <span>{staff.email}</span>
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                              isHod
                                ? "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-500/20 dark:text-purple-300 dark:border-purple-500/30"
                                : "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30"
                            }`}
                          >
                            {staff.role}
                          </span>
                        </td>
                        <td className="p-3.5 text-slate-600 dark:text-slate-300 max-w-[200px] truncate">
                          {staff.department || "All Departments"}
                        </td>
                        <td className="p-3.5 text-slate-900 dark:text-white font-medium">
                          {staff.name || <span className="text-slate-400 dark:text-slate-500 italic">Self-Enrolling</span>}
                        </td>
                        <td className="p-3.5 text-slate-500 dark:text-slate-400 text-[11px] font-mono">
                          {staff.createdAt ? new Date(staff.createdAt).toLocaleDateString() : "Active"}
                        </td>
                        <td className="p-3.5 text-right">
                          <button
                            onClick={() => handleRevokeStaff(staff.email)}
                            disabled={isRevoking}
                            className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:hover:bg-rose-500/30 dark:text-rose-300 dark:border-rose-500/30 dark:hover:border-rose-400 text-xs font-semibold inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isRevoking ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                            )}
                            <span>Revoke Access</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

