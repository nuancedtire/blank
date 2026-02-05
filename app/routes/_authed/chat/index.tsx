import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";

type MessageRole = "user" | "assistant";

interface SourceCitation {
  title: string;
  url?: string;
  snippet?: string;
}

interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  sources?: SourceCitation[];
  isRefusal?: boolean;
}

// Mock initial messages
const initialMessages: ChatMessage[] = [
  {
    id: "1",
    role: "assistant",
    content:
      "Hello! I'm your ED Guidelines Assistant. I can help you find clinical guidelines, protocols, drug dosages, and answer questions about emergency medicine. What would you like to know?",
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
  },
];

export const Route = createFileRoute("/_authed/chat/")({
  component: ChatPage,
});

function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);

    // Simulate AI response (placeholder)
    setTimeout(() => {
      const responseMessage = generateMockResponse(userMessage.content);
      setMessages((prev) => [...prev, responseMessage]);
      setIsLoading(false);
    }, 1000 + Math.random() * 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b bg-white">
        <h1 className="text-lg font-semibold text-gray-900">AI Assistant</h1>
        <p className="text-xs text-gray-500">
          Search guidelines, protocols, and clinical information
        </p>
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </AnimatePresence>

        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-2 text-gray-500"
          >
            <div className="flex space-x-1">
              <motion.div
                className="w-2 h-2 bg-gray-400 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
              />
              <motion.div
                className="w-2 h-2 bg-gray-400 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
              />
              <motion.div
                className="w-2 h-2 bg-gray-400 rounded-full"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
              />
            </div>
            <span className="text-sm">AI is thinking...</span>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-4 py-3 border-t bg-white">
        <div className="flex items-center space-x-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about guidelines, protocols, dosages..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            size="icon"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </Button>
        </div>
        <p className="mt-2 text-xs text-gray-400 text-center">
          AI responses are for reference only. Always verify clinical decisions
          with official sources.
        </p>
      </div>
    </div>
  );
}

interface MessageBubbleProps {
  message: ChatMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";
  const isRefusal = message.isRefusal;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[85%] ${
          isUser ? "order-2" : "order-1"
        }`}
      >
        {/* Message Content */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className={`rounded-2xl px-4 py-3 ${
            isUser
              ? "bg-blue-600 text-white rounded-br-md"
              : isRefusal
              ? "bg-red-50 text-red-900 border border-red-200 rounded-bl-md"
              : "bg-white text-gray-900 shadow-sm border border-gray-100 rounded-bl-md"
          }`}
        >
          {/* Refusal Icon */}
          {isRefusal && (
            <div className="flex items-center mb-2 text-red-600">
              <svg
                className="h-4 w-4 mr-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <span className="text-xs font-medium">Cannot Provide Response</span>
            </div>
          )}

          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        </motion.div>

        {/* Source Citations */}
        {message.sources && message.sources.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-2"
          >
            <p className="text-xs text-gray-500 mb-1 ml-1">Sources:</p>
            <div className="space-y-1">
              {message.sources.map((source, index) => (
                <Card key={index} className="bg-gray-50">
                  <CardContent className="py-2 px-3">
                    <div className="flex items-start">
                      <svg
                        className="h-3 w-3 text-blue-500 mt-0.5 mr-2 flex-shrink-0"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                      <div className="flex-1 min-w-0">
                        {source.url ? (
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs font-medium text-blue-600 hover:underline"
                          >
                            {source.title}
                          </a>
                        ) : (
                          <span className="text-xs font-medium text-gray-700">
                            {source.title}
                          </span>
                        )}
                        {source.snippet && (
                          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                            {source.snippet}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Timestamp */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={`text-xs text-gray-400 mt-1 ${
            isUser ? "text-right mr-1" : "ml-1"
          }`}
        >
          {formatTime(message.timestamp)}
        </motion.p>
      </div>
    </motion.div>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// Mock response generator (placeholder for actual AI integration)
function generateMockResponse(userInput: string): ChatMessage {
  const lowerInput = userInput.toLowerCase();

  // Check for topics that should trigger refusal
  if (
    lowerInput.includes("prescribe") ||
    lowerInput.includes("diagnose me") ||
    lowerInput.includes("should i take")
  ) {
    return {
      id: Date.now().toString(),
      role: "assistant",
      content:
        "I cannot provide specific medical advice, prescriptions, or personal diagnoses. Please consult with a qualified healthcare provider for individual medical decisions. I can help you find general clinical guidelines and protocols instead.",
      timestamp: new Date(),
      isRefusal: true,
    };
  }

  // Mock responses with sources
  if (lowerInput.includes("stemi") || lowerInput.includes("heart attack")) {
    return {
      id: Date.now().toString(),
      role: "assistant",
      content:
        "For STEMI (ST-Elevation Myocardial Infarction), the key time targets are:\n\n- Door-to-ECG: < 10 minutes\n- Door-to-balloon (PCI): < 90 minutes\n- Door-to-needle (fibrinolysis): < 30 minutes\n\nImmediate interventions include:\n1. Aspirin 325mg (chewed)\n2. Heparin bolus\n3. P2Y12 inhibitor loading\n4. Consider nitroglycerin for ongoing chest pain",
      timestamp: new Date(),
      sources: [
        {
          title: "AHA/ACC STEMI Guidelines 2023",
          url: "https://example.com/stemi-guidelines",
          snippet: "Updated recommendations for management of ST-elevation myocardial infarction...",
        },
        {
          title: "ED STEMI Protocol v2.1",
          snippet: "Department-specific protocol for cardiac catheterization activation...",
        },
      ],
    };
  }

  if (lowerInput.includes("sepsis")) {
    return {
      id: Date.now().toString(),
      role: "assistant",
      content:
        "The Sepsis Bundle (Hour-1 Bundle) includes:\n\n1. Measure lactate level\n2. Obtain blood cultures before antibiotics\n3. Administer broad-spectrum antibiotics\n4. Begin rapid administration of 30ml/kg crystalloid for hypotension or lactate >= 4\n5. Apply vasopressors if hypotensive during or after fluid resuscitation (target MAP >= 65mmHg)",
      timestamp: new Date(),
      sources: [
        {
          title: "Surviving Sepsis Campaign 2021",
          url: "https://example.com/sepsis-guidelines",
          snippet: "International guidelines for management of sepsis and septic shock...",
        },
      ],
    };
  }

  // Default response
  return {
    id: Date.now().toString(),
    role: "assistant",
    content: `I found some information about "${userInput}". This is a placeholder response - in the full implementation, this would query the guidelines database and provide relevant clinical information with source citations.`,
    timestamp: new Date(),
    sources: [
      {
        title: "General Clinical Guidelines",
        snippet: "Placeholder source for demonstration purposes...",
      },
    ],
  };
}
