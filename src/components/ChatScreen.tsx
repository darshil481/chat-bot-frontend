import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";

const socket: Socket = io("http://localhost:4000", { autoConnect: false });

interface ChatMessage {
  query: string;
  answer?: string;
  isStored: boolean;
  createdAt: Date;
}

export const ChatScreen = ({
  sessionId,
  sessionName,
}: {
  sessionId: string;
  sessionName?: string | null;
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [firstMessageSent, setFirstMessageSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const { data } = await axios.post(
          "http://localhost:4000/history/get-seesion-history",
          {
            sessionId,
          }
        );

        if (data?.data) {
          const parsed = data.data.map((msg: ChatMessage) => ({
            ...msg,
            createdAt: new Date(msg.createdAt),
          }));
          setMessages(parsed);
          setFirstMessageSent(true);
        } else {
          setMessages([]);
          setFirstMessageSent(false);
        }
      } catch (error) {
        console.error("Failed to fetch chat history", error);
        setMessages([]);
        setFirstMessageSent(false);
      }
    };

    fetchHistory();
  }, [sessionId]);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }

    socket.emit("chat:join", sessionId);

    const handleMessage = ({ message }: { message: ChatMessage }) => {
      setMessages((prev) => [...prev, message]);
      setLoading(false); // stop loading when message received
    };

    const handleClear = () => {
      setMessages([]);
    };

    socket.on("chat:message", handleMessage);
    socket.on("chat:cleared", handleClear);

    return () => {
      socket.emit("chat:leave", sessionId);
      socket.off("chat:message", handleMessage);
      socket.off("chat:cleared", handleClear);
    };
  }, [sessionId]);

  const sendMessage = () => {
    if (!input.trim()) return;

    setLoading(true);
    socket.emit("chat:message", {
      sessionId,
      query: input.trim(),
      sessionName: !firstMessageSent ? sessionName : undefined,
    });

    setInput("");
    if (!firstMessageSent) setFirstMessageSent(true);
  };

  const clearChat = () => {
    socket.emit("chat:clear", sessionId);
  };

  const endSession = () => {
    if (!sessionName) return;

    toast.promise(
      new Promise<void>((resolve, reject) => {
        socket.emit("chat:end", sessionId, sessionName, (response: any) => {
          if (response?.success) {
            setMessages((prevMessages) =>
              prevMessages.map((msg) => ({ ...msg, isStored: true }))
            );
            resolve();
          } else reject();
        });
      }),
      {
        loading: "Saving session...",
        success: "Session saved and ended successfully!",
        error: "Failed to save session.",
      }
    );
  };

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const formatTime = (date: Date) => {
    return `${date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  return (
    <>
      <Toaster position="top-right" />
      <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
        <div className="flex justify-between items-center pb-4 border-b">
          <h1 className="text-xl font-semibold">Chat with Bot</h1>
          <div className="space-x-2">
            <button
              onClick={clearChat}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Reset Session
            </button>
            <button
              onClick={endSession}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Save & End
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto mt-4 space-y-4 px-2">
          {messages.map((msg, idx) => (
            <div key={idx} className="space-y-1">
              <div className="bg-blue-100 p-3 rounded-lg w-fit self-start">
                <div>
                  <strong>User:</strong> {msg.query}
                </div>
                <div className="text-xs text-gray-500 italic mt-1">
                  {formatTime(new Date(msg.createdAt))}
                </div>
              </div>
              {msg.answer && (
                <div className="bg-gray-200 p-3 rounded-lg w-fit self-start">
                  <div>
                    <strong>Bot:</strong> {msg.answer}
                  </div>
                  <div className="text-xs text-gray-500 italic mt-1 flex items-center gap-2">
                    {formatTime(new Date(msg.createdAt))}
                    <span className="text-gray-400">
                      {msg.isStored ? "Stored" : "Pending"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
          {loading && (
            <div className="text-gray-500 italic text-center mt-2">
              Bot is typing...
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <div className="border-t pt-4 flex items-center gap-2">
          <input
            type="text"
            className="flex-1 p-2 border rounded"
            placeholder="Ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={loading}
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
};
