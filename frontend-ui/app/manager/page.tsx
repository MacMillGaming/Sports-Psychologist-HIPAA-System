"use client";

import { useEffect, useState } from "react";
import { Users, Shield, LogOut, UserPlus } from "lucide-react";
import { SessionProvider, useSession, signOut } from "next-auth/react";

interface OrgData {
  coaches: { id: number; name: string }[];
  teams: { id: number; name: string; coach_id: number | null }[];
  players: { id: number; gamertag: string; email: string; team_id: number | null }[];
}

function ManagerContent() {
  const { data: session } = useSession();
  const [org, setOrg] = useState<OrgData | null>(null);
  
  // State for the New Coach Form
  const [newCoachName, setNewCoachName] = useState("");
  const [newCoachUsername, setNewCoachUsername] = useState("");
  const [newCoachPassword, setNewCoachPassword] = useState("");
  const [provisionStatus, setProvisionStatus] = useState("");

  const fetchOrg = () => {
    fetch("http://localhost:8000/api/org")
      .then(res => res.json())
      .then(data => setOrg(data));
  };

  useEffect(() => { fetchOrg(); }, []);

  const handleAssignment = async (type: "team" | "player", entityId: number, targetId: number) => {
    await fetch("http://localhost:8000/api/org/assign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entity_type: type, entity_id: entityId, target_id: targetId })
    });
    fetchOrg(); 
  };

  const handleCreateCoach = async (e: React.FormEvent) => {
    e.preventDefault();
    setProvisionStatus("Provisioning...");

    const res = await fetch("http://localhost:8000/api/org/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newCoachName,
        username: newCoachUsername,
        password: newCoachPassword,
        role: "coach"
      })
    });

    if (res.ok) {
      setProvisionStatus("Success! Coach added.");
      setNewCoachName("");
      setNewCoachUsername("");
      setNewCoachPassword("");
      fetchOrg(); // Instantly update the dropdowns with the new coach
      setTimeout(() => setProvisionStatus(""), 3000);
    } else {
      setProvisionStatus("Error: Username might be taken.");
    }
  };

  if (!org) return <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Loading Data...</div>;

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-200">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Prism Organization Admin</h1>
          <p className="text-sm text-slate-400">General Manager: {session?.user?.name}</p>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/" })} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg border border-slate-800 transition-colors">
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMN 1: Roster Management */}
        <div className="lg:col-span-2 space-y-8">
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Shield className="text-indigo-400" /> Active Roster Management</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {org.teams.map(team => (
                <div key={team.id} className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
                  <div className="flex justify-between items-start mb-6">
                    <h3 className="text-xl font-bold text-indigo-400">{team.name}</h3>
                    <select 
                      className="bg-slate-950 border border-slate-700 text-sm rounded-lg px-3 py-2 text-white"
                      value={team.coach_id || ""}
                      onChange={(e) => handleAssignment("team", team.id, parseInt(e.target.value))}
                    >
                      <option value="">No Coach Assigned</option>
                      {org.coaches.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Assigned Players</h4>
                    {org.players.filter(p => p.team_id === team.id).map(player => (
                      <div key={player.id} className="flex justify-between items-center bg-slate-950 p-3 rounded border border-slate-800">
                        <span className="text-sm font-medium text-slate-300">{player.gamertag}</span>
                        <select 
                          className="bg-slate-900 border border-slate-700 text-xs rounded px-2 py-1 text-slate-400"
                          value={player.team_id || ""}
                          onChange={(e) => handleAssignment("player", player.id, parseInt(e.target.value))}
                        >
                          {org.teams.map(t => <option key={t.id} value={t.id}>Move to {t.name}</option>)}
                        </select>
                      </div>
                    ))}
                    {org.players.filter(p => p.team_id === team.id).length === 0 && (
                      <p className="text-sm text-slate-600 italic">No players assigned to this roster.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Player Directory */}
          <div>
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Users className="text-emerald-400" /> Player Directory</h2>
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
              <table className="w-full text-left text-sm text-slate-400">
                  <thead className="text-xs text-slate-500 uppercase bg-slate-950 border-b border-slate-800">
                      <tr>
                          <th className="px-4 py-3">Player Tag</th>
                          <th className="px-4 py-3">Auth Email</th>
                          <th className="px-4 py-3">Current Team</th>
                      </tr>
                  </thead>
                  <tbody>
                      {org.players.map(player => (
                          <tr key={player.id} className="border-b border-slate-800/50 hover:bg-slate-950/50">
                              <td className="px-4 py-4 font-medium text-slate-200">{player.gamertag}</td>
                              <td className="px-4 py-4 text-xs">{player.email}</td>
                              <td className="px-4 py-4">
                                <span className="bg-indigo-950/50 text-indigo-400 px-2 py-1 rounded text-xs border border-indigo-900/50">
                                  {org.teams.find(t => t.id === player.team_id)?.name || "Unassigned"}
                                </span>
                              </td>
                          </tr>
                      ))}
                  </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* COLUMN 2: Admin Controls */}
        <div>
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><UserPlus className="text-amber-400" /> Provision Staff</h2>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
            <p className="text-sm text-slate-400 mb-6">Create a new Head Coach account. They will instantly be available for roster assignment.</p>
            
            <form onSubmit={handleCreateCoach} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Full Name</label>
                <input 
                  type="text" 
                  required
                  value={newCoachName}
                  onChange={e => setNewCoachName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Jane Doe"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Login ID (Username)</label>
                <input 
                  type="text" 
                  required
                  value={newCoachUsername}
                  onChange={e => setNewCoachUsername(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. coach_jane"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Temporary Password</label>
                <input 
                  type="password" 
                  required
                  value={newCoachPassword}
                  onChange={e => setNewCoachPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                  placeholder="••••••••"
                />
              </div>
              
              <button 
                type="submit" 
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-4 rounded-lg transition-colors mt-2"
              >
                Create Coach Profile
              </button>
              
              {provisionStatus && (
                <p className={`text-sm text-center font-medium mt-4 ${provisionStatus.includes("Success") ? "text-emerald-400" : provisionStatus.includes("Error") ? "text-red-400" : "text-amber-400"}`}>
                  {provisionStatus}
                </p>
              )}
            </form>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function ManagerDashboard() {
  return (
    <SessionProvider>
      <ManagerContent />
    </SessionProvider>
  );
}