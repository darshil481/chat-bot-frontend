import React, { useEffect, useState } from "react";
import { ChatScreen } from "./ChatScreen";
import axios from "axios";

interface Session {
  sessionId: string;
  sessionName: string;
}

export const MultiSessionChat = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [currentSessionName, setCurrentSessionName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const { data } = await axios.post("http://localhost:4000/history/get-all-session");
        if (data?.data) {
          setSessions(data.data);
          setCurrentSessionId(data.data[0]?.sessionId || null);
          setCurrentSessionName(data.data[0]?.sessionName || null);
        }
      } catch (error) {
        console.error("Failed to fetch sessions", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, []);

  const getNextIncrementalId = (): string => {
    const ids = sessions
      .map((s) => parseInt(s.sessionId.replace("session-", ""), 10))
      .filter((n) => !isNaN(n));
    const nextId = Math.max(0, ...ids) + 1;
    return `session-${nextId}`;
  };

  const handleNewSession = () => {
    const name = prompt("Enter session name:");
    if (!name) return;

    const newSessionId = getNextIncrementalId();

    const newSession = {
      sessionId: newSessionId,
      sessionName: name,
    };

    // Add only to local state (not DB or Redis yet)
    setSessions((prev) => [newSession, ...prev]);
    setCurrentSessionId(newSessionId);
     setCurrentSessionName(name);
  };

  if (loading) return <div className="p-4">Loading sessions...</div>;

  return (
    <div className="flex h-screen max-w-7xl mx-auto">
      <div className="w-64 border-r p-4 flex flex-col">
        <h2 className="text-lg font-bold mb-4">Sessions</h2>
        <button
          onClick={handleNewSession}
          className="mb-4 w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-3 rounded"
        >
          + New Session
        </button>
        <ul className="flex flex-col gap-2 flex-grow overflow-y-auto">
          {sessions.map(({ sessionId, sessionName }) => (
            <li key={sessionId}>
              <button
                onClick={() => {setCurrentSessionId(sessionId);setCurrentSessionName(sessionName)}}
                className={`w-full text-left px-3 py-2 rounded ${
                  currentSessionId === sessionId
                    ? "bg-blue-600 text-white"
                    : "hover:bg-gray-200"
                }`}
              >
                {sessionName || sessionId}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex-1">
        {currentSessionId && <ChatScreen sessionId={currentSessionId} sessionName={currentSessionName} />}
      </div>
    </div>
  );
};
