import { useState, useRef, useEffect } from "react";
import useStore from "../store/useStore";
import { MessageCircle, X, Send, Loader2, Sparkles, AlertCircle } from "lucide-react";
import "./AIChatbot.css";

const AIChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  
  const selectedAsteroid = useStore((state) => state.selectedAsteroid);
  const impactResults = useStore((state) => state.impactResults);
  const impactLocation = useStore((state) => state.impactLocation);
  const mode = useStore((state) => state.mode);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Generate context data for AI
  const getContextData = () => {
    const context = {
      mode,
      hasData: !!(selectedAsteroid || impactResults),
    };

    if (selectedAsteroid) {
      context.asteroid = {
        name: selectedAsteroid.name,
        diameter_min: selectedAsteroid.estimated_diameter?.meters?.estimated_diameter_min,
        diameter_max: selectedAsteroid.estimated_diameter?.meters?.estimated_diameter_max,
        is_hazardous: selectedAsteroid.is_potentially_hazardous,
        close_approach_date: selectedAsteroid.close_approach_data?.[0]?.close_approach_date,
        velocity: selectedAsteroid.close_approach_data?.[0]?.relative_velocity?.kilometers_per_second,
        miss_distance: selectedAsteroid.close_approach_data?.[0]?.miss_distance?.kilometers,
        absolute_magnitude: selectedAsteroid.absolute_magnitude_h,
      };
    }

    if (impactResults) {
      context.impact = {
        energy_megatons: impactResults.energy_megatons,
        crater_diameter_km: impactResults.crater_diameter_km,
        fireball_radius_km: impactResults.fireball_radius_km,
        blast_radius_km: impactResults.blast_radius_km,
        thermal_radius_km: impactResults.thermal_radius_km,
        seismic_magnitude: impactResults.seismic_magnitude,
        severity: impactResults.severity,
        description: impactResults.description,
      };
    }

    if (impactLocation) {
      context.location = {
        latitude: impactLocation.lat,
        longitude: impactLocation.lon,
      };
    }

    return context;
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    // Add user message
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const context = getContextData();
      
      // Call your backend API that will use OpenAI
      const response = await fetch(`${import.meta.env.VITE_API_URL || "https://api.readrizz.com"}/api/ai/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          context: context,
          history: messages.slice(-6), // Send last 6 messages for context
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();
      
      // Add AI response
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: data.response 
      }]);
    } catch (error) {
      console.error("AI Chat error:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Sorry, I encountered an error. Please try again." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const generateSummary = async () => {
    setMessages([{ 
      role: "assistant", 
      content: "Analyzing asteroid data..." 
    }]);
    setIsLoading(true);

    try {
      const context = getContextData();
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || "https://api.readrizz.com"}/api/ai/summary`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ context }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate summary");
      }

      const data = await response.json();
      
      setMessages([{ 
        role: "assistant", 
        content: data.summary 
      }]);
    } catch (error) {
      console.error("AI Summary error:", error);
      setMessages([{ 
        role: "assistant", 
        content: "Sorry, I couldn't generate a summary. Please try asking me a question instead." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpen = () => {
    setIsOpen(true);
    if (messages.length === 0 && (selectedAsteroid || impactResults)) {
      generateSummary();
    }
  };

  const context = getContextData();
  const hasData = context.hasData;

  if (!hasData) {
    return null; // Don't show button if no data available
  }

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <button
          className="ai-chat-button"
          onClick={handleOpen}
          title="Ask AI Assistant"
        >
          <Sparkles size={24} />
          <span className="ai-badge">AI</span>
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="ai-chat-window">
          {/* Header */}
          <div className="ai-chat-header">
            <div className="ai-header-content">
              <Sparkles size={20} className="ai-header-icon" />
              <div>
                <h3 className="ai-chat-title">AI Asteroid Analyst</h3>
                <p className="ai-chat-subtitle">
                  {selectedAsteroid ? `Analyzing ${selectedAsteroid.name}` : "Impact Analysis"}
                </p>
              </div>
            </div>
            <button
              className="ai-close-button"
              onClick={() => setIsOpen(false)}
            >
              <X size={20} />
            </button>
          </div>

          {/* Messages */}
          <div className="ai-chat-messages">
            {messages.length === 0 && !isLoading && (
              <div className="ai-welcome">
                <Sparkles size={48} className="ai-welcome-icon" />
                <h4>AI Assistant Ready</h4>
                <p>Ask me anything about the asteroid, impact effects, or mitigation strategies!</p>
                <div className="ai-suggestions">
                  <button onClick={() => setInput("What would be the impact of this asteroid?")}>
                    💥 Impact analysis
                  </button>
                  <button onClick={() => setInput("How dangerous is this asteroid?")}>
                    ⚠️ Threat assessment
                  </button>
                  <button onClick={() => setInput("What mitigation strategies would work best?")}>
                    🛡️ Deflection options
                  </button>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div key={idx} className={`ai-message ${msg.role}`}>
                {msg.role === "assistant" && (
                  <div className="ai-avatar">
                    <Sparkles size={16} />
                  </div>
                )}
                <div className="ai-message-content">
                  {msg.content}
                </div>
                {msg.role === "user" && (
                  <div className="user-avatar">You</div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="ai-message assistant">
                <div className="ai-avatar">
                  <Sparkles size={16} />
                </div>
                <div className="ai-message-content ai-typing">
                  <Loader2 size={16} className="ai-spinner" />
                  Analyzing...
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="ai-chat-input-container">
            <input
              type="text"
              className="ai-chat-input"
              placeholder="Ask about the asteroid or impact..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
            />
            <button
              className="ai-send-button"
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default AIChatbot;
