"use client";

import { useEffect, useState } from "react";
import { Activity, ShieldAlert, Users, Brain, LogOut } from "lucide-react";
import { SessionProvider, useSession, signOut } from "next-auth/react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, BarChart, Bar, Legend } from 'recharts';

interface TelemetryLog {
  crisis: string;
  dynamics: string;
  lifestyle: string;
  time: string;
  gamertag: string;
  email: string;
  role: string;
  team: string;
  coach_id?: number; 
}

const formatBadge = (crisisString: string) => {
  const match = crisisString.match(/tier["':\s]*(\d)/i);
  const tier = match ? parseInt(match[1]) : 0;

  if (tier === 1) return { label: "Tier 1: Red Alert", style: "bg-red-950/50 text-red-400 border-red-900/50" };
  if (tier === 2) return { label: "Tier 2: Elevated", style: "bg-amber-950/50 text-amber-400 border-amber-900/50" };
  if (tier === 3) return { label: "Tier 3: Stable", style: "bg-emerald-950/50 text-emerald-400 border-emerald-900/50" };
  return { label: "Evaluating", style: "bg-slate-800 text-slate-400 border-slate-700" };
};

function DashboardContent() {
  const { data: session, status } = useSession();
  const [logs, setLogs] = useState<TelemetryLog[]>([]);
  const [wsStatus, setWsStatus] = useState("Connecting...");
  const [coachTeams, setCoachTeams] = useState<string[]>([]);
  const [activeTeam, setActiveTeam] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading" || !session) return;
    
    const coachId = (session.user as any).db_id;
    if (!coachId) return;

    Promise.all([
      fetch(`http://localhost:8000/api/telemetry?coach_id=${coachId}`).then(res => res.json()),
      fetch(`http://localhost:8000/api/org`).then(res => res.json())
    ])
    .then(([telemetryData, orgData]) => {
      setLogs(telemetryData.logs);
      const assignedTeams = orgData.teams
        .filter((t: any) => t.coach_id === parseInt(coachId))
        .map((t: any) => t.name);
        
      setCoachTeams(assignedTeams);
      if (assignedTeams.length > 0) setActiveTeam(assignedTeams[0]);
    })
    .catch(err => console.error("Failed to load dashboard data", err));

    const ws = new WebSocket("ws://localhost:8000/ws/telemetry");
    ws.onopen = () => setWsStatus("Live Tracking Active");
    ws.onclose = () => setWsStatus("Disconnected from Live Feed");
    
    ws.onmessage = (event) => {
      const newLog: TelemetryLog = JSON.parse(event.data);
      if (newLog.coach_id === parseInt(coachId)) {
         setLogs((prevLogs) => [newLog, ...prevLogs]);
      }
    };

    return () => ws.close();
  }, [session, status]); 

  // --- DATA FILTERING & AGGREGATION ---
  const filteredLogs = activeTeam ? logs.filter(log => log.team === activeTeam) : logs;

  const playerSummaries = Object.values(
    filteredLogs.reduce((acc, log) => {
      if (!acc[log.email]) acc[log.email] = { ...log, sessionCount: 1 };
      else acc[log.email].sessionCount += 1;
      return acc;
    }, {} as Record<string, TelemetryLog & { sessionCount: number }>)
  );

  // --- ANALYTICS VISUALIZATION DATA ---
  // 1. Time Series Data (Grouped by Date)
  const timeSeriesData = Object.values(
    filteredLogs.reduce((acc, log) => {
      const dateObj = new Date(log.time);
      const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      if (!acc[dateStr]) {
        acc[dateStr] = { date: dateStr, timestamp: dateObj.getTime(), Tier1: 0, Tier2: 0, Tier3: 0 };
      }
      
      // Smart Regex to extract the number from the AI's JSON output
      const match = log.crisis.match(/tier["':\s]*(\d)/i);
      const tierNum = match ? parseInt(match[1]) : 3; 
      
      if (tierNum === 1) acc[dateStr].Tier1 += 1;
      else if (tierNum === 2) acc[dateStr].Tier2 += 1;
      else acc[dateStr].Tier3 += 1;
      
      return acc;
    }, {} as Record<string, any>)
  ).sort((a: any, b: any) => a.timestamp - b.timestamp); // Sort left-to-right chronologically

  // 2. Friction Heatmap Data (Grouped by Player)
  const frictionData = playerSummaries.map(p => {
    const totalFlags = filteredLogs.filter(l => 
      l.email === p.email && 
      (l.dynamics.toLowerCase().includes("friction") || l.dynamics.toLowerCase().includes("toxicity") || l.dynamics.toLowerCase().includes("communication"))
    ).length;
    return { name: p.gamertag, Flags: totalFlags };
  });

  if (status === "loading") {
      return <div className="min-h-screen bg-slate-950 text-emerald-400 flex items-center justify-center animate-pulse">Loading Coach Portal...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-950 p-8 text-slate-200">
      <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Prism Overwatch Command</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400">Head Coach: {session?.user?.name || "Staff"}</span>
            <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-2 ${wsStatus.includes("Live") ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/50 animate-pulse" : "bg-red-950/30 text-red-400 border-red-900/50"}`}>
              <Activity size={12} />
              {wsStatus}
            </span>
          </div>
        </div>
        <button onClick={() => signOut({ callbackUrl: "/" })} className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-300 px-4 py-2 rounded-lg border border-slate-800 transition-colors">
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      {coachTeams.length > 0 ? (
        <div className="flex gap-6 mb-8 border-b border-slate-800">
          {coachTeams.map((team) => (
            <button
              key={team}
              onClick={() => setActiveTeam(team)}
              className={`pb-3 text-sm font-bold uppercase tracking-wider transition-colors border-b-2 ${
                activeTeam === team 
                  ? "border-indigo-500 text-indigo-400" 
                  : "border-transparent text-slate-500 hover:text-slate-300 hover:border-slate-700"
              }`}
            >
              {team} Roster
            </button>
          ))}
        </div>
      ) : (
        <div className="mb-8 p-4 bg-amber-950/30 border border-amber-900/50 rounded-lg text-amber-400 text-sm">
          No teams are currently assigned to your profile. Please contact the General Manager.
        </div>
      )}

      {/* Numerical Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg transition-all">
          <div className="flex items-center gap-3 text-red-400 mb-2">
            <ShieldAlert size={20} />
            <h2 className="font-semibold">Players in Tier 1 (Active)</h2>
          </div>
          <p className="text-3xl font-bold text-white">
            {playerSummaries.filter(p => formatBadge(p.crisis).label.includes("Tier 1")).length}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg transition-all">
          <div className="flex items-center gap-3 text-indigo-400 mb-2">
            <Users size={20} />
            <h2 className="font-semibold">Players with Friction Flags</h2>
          </div>
          <p className="text-3xl font-bold text-white">
            {playerSummaries.filter(p => p.dynamics.toLowerCase().includes("friction") || p.dynamics.toLowerCase().includes("toxicity") || p.dynamics.toLowerCase().includes("communication")).length}
          </p>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg transition-all">
          <div className="flex items-center gap-3 text-emerald-400 mb-2">
            <Brain size={20} />
            <h2 className="font-semibold">{activeTeam} Roster Size</h2>
          </div>
          <p className="text-3xl font-bold text-white">{playerSummaries.length}</p>
        </div>
      </div>

      {/* INTERACTIVE DATA VISUALIZATIONS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Trend Line Chart */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Team Stability Trend</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeSeriesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                  itemStyle={{ fontSize: '14px', fontWeight: 'bold' }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="Tier1" name="Red Alerts" stroke="#f87171" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Tier2" name="Elevated" stroke="#fbbf24" strokeWidth={3} />
                <Line type="monotone" dataKey="Tier3" name="Stable" stroke="#10b981" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Friction Bar Chart */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-lg">
          <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Friction Flags by Player</h3>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={frictionData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                <RechartsTooltip 
                  cursor={{ fill: '#1e293b' }}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px', color: '#f8fafc' }}
                />
                <Bar dataKey="Flags" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <h2 className="text-xl font-bold text-white mb-4">Current Roster Readiness</h2>
      <div className="space-y-4">
        {playerSummaries.map((player, idx) => {
          const badge = formatBadge(player.crisis);
          return (
            <div key={idx} className="bg-slate-900 border border-slate-800 p-6 rounded-xl shadow-sm flex flex-col md:flex-row gap-6">
              <div className="min-w-[200px]">
                <h3 className="font-bold text-lg text-indigo-400">{player.gamertag}</h3>
                <p className="text-xs text-slate-400 mb-1">{player.email}</p>
                <p className="text-xs text-slate-500 mb-2">{player.team} • {player.role}</p>
                <div className="flex flex-col gap-2 items-start mt-3">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${badge.style}`}>
                    {badge.label}
                    </span>
                    <span className="text-xs text-slate-500 bg-slate-950 px-2 py-1 rounded border border-slate-800">
                      {player.sessionCount} Sessions Logged
                    </span>
                </div>
              </div>
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/50">
                  <span className="text-xs font-bold text-indigo-500/80 uppercase tracking-wider block mb-2">Current Dynamics</span>
                  <p className="text-sm text-slate-300 leading-relaxed">{player.dynamics}</p>
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800/50">
                  <span className="text-xs font-bold text-emerald-500/80 uppercase tracking-wider block mb-2">Current Lifestyle</span>
                  <p className="text-sm text-slate-300 leading-relaxed">{player.lifestyle}</p>
                </div>
              </div>
            </div>
          );
        })}
        {playerSummaries.length === 0 && (
          <div className="text-center p-12 border border-slate-800 border-dashed rounded-xl text-slate-500">
            No active players found on the {activeTeam} roster.
          </div>
        )}
      </div>
    </div>
  );
}

export default function CoachDashboard() {
  return (
    <SessionProvider>
      <DashboardContent />
    </SessionProvider>
  );
}