"use client";

import { useState, useEffect } from "react";
import { Send, Activity, Loader2, LogIn, LogOut } from "lucide-react";
import { SessionProvider, useSession, signIn, signOut } from "next-auth/react";

function ChatApp() {
  const { data: session, status } = useSession();
  const [serverStatus, setServerStatus] = useState("Checking connection...");
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: "system", content: "Session started. Dr. Prism is ready." }
  ]);

  // Check if the Python Backend is running
  useEffect(() => {
    fetch("http://localhost:8000/api/health")
      .then((res) => res.json())
      .then((data) => setServerStatus("Connected: " + data.message))
      .catch(() => setServerStatus("Disconnected: Make sure FastAPI is running!"));
  }, []);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage = inputValue;
    setInputValue("");
    setMessages((prev) => [...prev, { role: "player", content: userMessage }]);
    setIsLoading(true);

    try {
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // THE BRIDGE: Pass the authenticated Google identity to Python
        body: JSON.stringify({ 
          message: userMessage, 
          history: "", 
          email: session?.user?.email || "unknown@prism.ai",
          name: session?.user?.name || "Unknown Player"
        }), 
      });

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "system", content: data.reply }]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "system", content: "Error: Could not reach the server." }]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- THE LOGIN GATE ---
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-emerald-400 animate-pulse">
        Loading identity...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <h1 className="text-4xl font-bold text-white mb-2">Prism AI</h1>
        <p className="text-slate-500 mb-8">Clinical Sports Psychology Module</p>
        <button 
          onClick={() => signIn("google")}
          className="flex items-center gap-2 bg-white text-slate-900 px-6 py-3 rounded-lg font-semibold hover:bg-slate-200 transition-colors shadow-lg"
        >
          <LogIn size={20} />
          Sign in with Google
        </button>
      </div>
    );
  }

  // --- THE CHAT INTERFACE ---
  return (
    <main className="flex min-h-screen flex-col items-center bg-slate-950 text-slate-300 font-sans p-4">
      {/* Header */}
      <div className="w-full max-w-3xl flex justify-between items-center py-6 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Prism AI</h1>
          <p className="text-sm text-slate-500">
            Authenticated as: <span className="text-indigo-400 font-medium">{session.user?.name || "Player"}</span>
          </p>
        </div>
        <div className="flex gap-4 items-center">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${serverStatus.includes("Connected") ? "bg-emerald-950/30 text-emerald-400 border-emerald-900/50" : "bg-red-950/30 text-red-400 border-red-900/50"}`}>
            <Activity size={14} />
            {serverStatus}
          </div>
          <button 
            onClick={() => signOut()} 
            className="text-slate-500 hover:text-white transition-colors" 
            title="Sign Out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 w-full max-w-3xl flex flex-col justify-start py-8 gap-4 overflow-y-auto">
        {messages.map((msg, idx) => (
          <div key={idx} className={`p-4 rounded-xl shadow-sm border ${msg.role === 'player' ? 'bg-indigo-950/20 border-indigo-900/30 ml-8' : 'bg-slate-900 border-slate-800 mr-8'}`}>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">
              <span className={`font-bold block mb-1 ${msg.role === 'player' ? 'text-indigo-400' : 'text-emerald-400'}`}>
                {msg.role === 'player' ? 'You' : 'Dr. Prism'}
              </span> 
              {msg.content}
            </p>
          </div>
        ))}
        {isLoading && (
          <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl mr-8 flex items-center gap-3 w-fit">
            <Loader2 className="animate-spin text-emerald-400" size={16} />
            <p className="text-sm text-slate-400">Dr. Prism is synthesizing...</p>
          </div>
        )}
      </div>

      {/* Input Section */}
      <div className="w-full max-w-3xl relative mt-4">
        <input 
          type="text" 
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type your message..." 
          className="w-full bg-slate-900 border border-slate-700 rounded-xl py-4 pl-4 pr-12 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm"
        />
        <button 
          onClick={handleSendMessage}
          disabled={isLoading}
          className="absolute right-2 top-2 bottom-2 aspect-square flex items-center justify-center bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-lg transition-colors"
        >
          <Send size={18} />
        </button>
      </div>
    </main>
  );
}

// Wrapping the app to provide the NextAuth Session Context
export default function ChatInterface() {
  return (
    <SessionProvider>
      <ChatApp />
    </SessionProvider>
  );
}