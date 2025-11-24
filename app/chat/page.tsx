"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AgentCard } from "@/components/agent-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { agents, categories, type Agent, type Category } from "@/lib/agents";
import { Send, Sparkles, Star, UserRound, Wallet } from "lucide-react";
import { useSignOut } from "@coinbase/cdp-hooks";
import GlobalHeader from "@/components/GlobalHeader";

type ChatMessage = {
  id: string;
  from: "user" | "ai";
  text: string;
};

export default function ChatPage() {
  const [view, setView] = useState<"landing" | "chat">("landing");
  const [prompt, setPrompt] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(
    categories[0]?.id ?? "ppt"
  );
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasInitialResponse, setHasInitialResponse] = useState(false);
  const [agentModal, setAgentModal] = useState<Agent | null>(null);

  const recommendedAgents = useMemo(() => {
    const filtered = agents.filter(
      (agent) => agent.category === selectedCategory
    );
    const list = filtered.length ? filtered : agents;
    return [...list].sort((a, b) => {
      if (b.score === a.score) {
        return a.price - b.price;
      }
      return b.score - a.score;
    });
  }, [selectedCategory]);

  useEffect(() => {
    if (view === "chat" && !selectedAgentId && recommendedAgents[0]) {
      setSelectedAgentId(recommendedAgents[0].id);
    }
  }, [view, recommendedAgents, selectedAgentId]);

  const primaryAgent =
    recommendedAgents.find((agent) => agent.id === selectedAgentId) ??
    recommendedAgents[0] ??
    agents[0];

  const handleSend = () => {
    const text = prompt.trim();
    if (!text) return;

    const now = Date.now();
    const baseAgent = primaryAgent ?? recommendedAgents[0];
    const intro =
      "Understood. I'll recommend a suitable agent based on vetted runs for similar tasks.";
    const follow =
      baseAgent && view === "landing"
        ? `The most suitable agent right now is ${baseAgent.name}. You can also pick another from the right-hand Recommended List.`
        : "Updating the recommendation list based on your latest note.";

    setMessages((prev) => [
      ...prev,
      { id: `user-${now}`, from: "user", text },
      {
        id: `ai-${now}-intro`,
        from: "ai",
        text: !hasInitialResponse ? intro : "Got it. Let me adjust the match.",
      },
      {
        id: `ai-${now}-follow`,
        from: "ai",
        text: follow,
      },
    ]);

    setHasInitialResponse(true);
    setView("chat");
    setPrompt("");

    if (!selectedAgentId && baseAgent) {
      setSelectedAgentId(baseAgent.id);
    }
  };

  return (
    <main className="min-h-screen bg-white px-4 py-10 flex flex-col items-center text-gray-900">
      <GlobalHeader />
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-16">
        {view === "landing" ? (
          <LandingView
            prompt={prompt}
            onPromptChange={setPrompt}
            onSend={handleSend}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            recommendedAgents={recommendedAgents}
            onOpenAgent={(agent) => setAgentModal(agent)}
          />
        ) : (
          <ChatView
            prompt={prompt}
            onPromptChange={setPrompt}
            onSend={handleSend}
            messages={messages}
            selectedCategory={selectedCategory}
            recommendedAgents={recommendedAgents}
            selectedAgent={primaryAgent}
            onSelectAgent={setSelectedAgentId}
            onOpenAgent={(agent) => setAgentModal(agent)}
          />
        )}
      </div>

      {agentModal ? (
        <AgentModal
          agent={agentModal}
          onClose={() => setAgentModal(null)}
          onUseAgent={() => {
            setSelectedAgentId(agentModal.id);
            setAgentModal(null);
            setView("chat");
          }}
        />
      ) : null}
    </main>
  );
}

function LandingView({
  prompt,
  onPromptChange,
  onSend,
  selectedCategory,
  onCategoryChange,
  recommendedAgents,
  onOpenAgent,
}: {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSend: () => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  recommendedAgents: Agent[];
  onOpenAgent: (agent: Agent) => void;
}) {
  return (
    <section className="flex flex-col items-center gap-10 mt-52">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome!</h1>
      </div>

      <div className="flex w-full flex-col gap-4 items-center">
        <PromptComposer
          prompt={prompt}
          onPromptChange={onPromptChange}
          onSend={onSend}
          placeholder="Frame your request and let AI shortlist the right agent..."
        />

        <CategoryScroller
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={onCategoryChange}
        />
      </div>

      <div className="w-full space-y-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-gray-700" />
          <h2 className="text-xl font-semibold">PPT Agents</h2>
          <span className="text-sm text-gray-500">
            Vetted by AI with recorded runs and pricing signals.
          </span>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {recommendedAgents.slice(0, 4).map((agent, index) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              rank={index + 1}
              onOpen={() => onOpenAgent(agent)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function ChatView({
  prompt,
  onPromptChange,
  onSend,
  messages,
  selectedCategory,
  recommendedAgents,
  selectedAgent,
  onSelectAgent,
  onOpenAgent,
}: {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSend: () => void;
  messages: ChatMessage[];
  selectedCategory: string;
  recommendedAgents: Agent[];
  selectedAgent: Agent | undefined;
  onSelectAgent: (id: string) => void;
  onOpenAgent: (agent: Agent) => void;
}) {
  return (
    <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] mt-12">
      <div className="flex flex-col gap-6">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.12em] text-gray-500">
              {selectedCategory} request
            </p>
            <h2 className="text-2xl font-semibold">Request PPT</h2>
          </div>
          <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
            AI compares verified runs, then ranks for you
          </span>
        </header>

        <div className="flex flex-col gap-4">
          {messages.map((message) => (
            <ChatBubble key={message.id} from={message.from}>
              {message.text}
            </ChatBubble>
          ))}

          {selectedAgent && (
            <div className="flex justify-start">
              <AgentCard
                agent={selectedAgent}
                highlight
                note="However, you may select another agent from the right-hand section to work with."
                onOpen={() => onOpenAgent(selectedAgent)}
              />
            </div>
          )}
        </div>

        <PromptComposer
          prompt={prompt}
          onPromptChange={onPromptChange}
          onSend={onSend}
          placeholder="Add more details or ask to keep going..."
          minimal
        />
      </div>

      <aside className="rounded-3xl bg-gray-50 p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold">Recommended List</h3>
          <span className="text-xs text-gray-500">Ranked by score & price</span>
        </div>
        <div className="flex flex-col gap-4">
          {recommendedAgents.map((agent, index) => (
            <AgentCard
              key={agent.id}
              agent={agent}
              compact
              rank={index + 1}
              active={selectedAgent?.id === agent.id}
              onSelect={() => onSelectAgent(agent.id)}
              onOpen={() => onOpenAgent(agent)}
            />
          ))}
        </div>
      </aside>
    </section>
  );
}

function PromptComposer({
  prompt,
  onPromptChange,
  onSend,
  placeholder,
  minimal,
}: {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSend: () => void;
  placeholder: string;
  minimal?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex w-full items-center gap-3 rounded-3xl bg-gray-100 px-5",
        minimal ? "py-3" : "py-5 shadow-sm"
      )}
    >
      <input
        value={prompt}
        onChange={(e) => onPromptChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-base outline-none placeholder:text-gray-400"
      />
      <button
        type="button"
        onClick={onSend}
        className="flex h-11 w-11 items-center justify-center rounded-full bg-black text-white transition hover:bg-black/80"
      >
        <Send className="h-5 w-5" />
      </button>
    </div>
  );
}

function CategoryScroller({
  categories,
  selectedCategory,
  onCategoryChange,
}: {
  categories: Category[];
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
}) {
  return (
    <div className="flex gap-3 overflow-x-auto bg-blue-300 w-fit">
      {categories.map((category) => {
        const isSelected = category.id === selectedCategory;
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onCategoryChange(category.id)}
            className={cn(
              "min-w-[150px] rounded-xl px-4 py-3 text-left text-sm font-semibold shadow-sm transition",
              isSelected
                ? "bg-gray-400 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            )}
          >
            {category.label}
          </button>
        );
      })}
    </div>
  );
}

function ChatBubble({
  children,
  from,
}: {
  children: React.ReactNode;
  from: "user" | "ai";
}) {
  const alignClass =
    from === "user"
      ? "ml-auto bg-gray-200 text-gray-800"
      : "mr-auto bg-gray-100";
  return (
    <div
      className={cn(
        "max-w-xl rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm",
        alignClass
      )}
    >
      {children}
    </div>
  );
}

function AgentModal({
  agent,
  onClose,
  onUseAgent,
}: {
  agent: Agent;
  onClose: () => void;
  onUseAgent: () => void;
}) {
  const [tab, setTab] = useState<"about" | "example" | "reviews">("about");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-10">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl bg-[#f7f7f7] p-6 shadow-2xl">
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-600 shadow"
        >
          Close
        </button>

        <div className="flex flex-col gap-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-2xl font-semibold">{agent.name}</h3>
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                <UserRound className="h-4 w-4" />
                <span>{agent.author}</span>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm font-semibold text-gray-800">
              <div className="flex items-center gap-1">
                <Wallet className="h-4 w-4" />
                <span>{agent.price.toFixed(3)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4" />
                <span>{agent.rating.toFixed(1)}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            {(["about", "example", "reviews"] as const).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  tab === key
                    ? "bg-gray-200 text-gray-900 shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                {key === "about"
                  ? "About"
                  : key === "example"
                  ? "Example"
                  : "Reviews"}
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-gray-100 p-5">
            {tab === "about" && (
              <div className="space-y-2">
                <p className="text-base font-semibold text-gray-900">
                  About this Agent
                </p>
                <p className="text-gray-800">{agent.description}</p>
              </div>
            )}

            {tab === "example" && (
              <div className="space-y-4">
                {(agent.examples ?? []).map((example) => {
                  if (example.type === "text") {
                    return (
                      <div
                        key={example.title}
                        className="rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200"
                      >
                        <p className="font-semibold text-gray-900">
                          {example.title}
                        </p>
                        <p className="mt-1 text-sm text-gray-700">
                          {example.body}
                        </p>
                      </div>
                    );
                  }

                  if (example.type === "image") {
                    return (
                      <div
                        key={example.title}
                        className="space-y-2 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200"
                      >
                        <p className="font-semibold text-gray-900">
                          {example.title}
                        </p>
                        <img
                          src={example.url}
                          alt={example.caption ?? example.title}
                          className="h-48 w-full rounded-lg object-cover"
                        />
                        {example.caption ? (
                          <p className="text-xs text-gray-600">
                            {example.caption}
                          </p>
                        ) : null}
                      </div>
                    );
                  }

                  if (example.type === "code") {
                    return (
                      <div
                        key={example.title}
                        className="space-y-2 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200"
                      >
                        <p className="font-semibold text-gray-900">
                          {example.title}
                        </p>
                        <pre className="overflow-auto rounded-lg bg-gray-900 p-3 text-xs text-gray-100">
                          <code>{example.code}</code>
                        </pre>
                        <p className="text-xs text-gray-600 uppercase tracking-wide">
                          {example.language}
                        </p>
                      </div>
                    );
                  }

                  return null;
                })}

                {!(agent.examples ?? []).length ? (
                  <p className="text-sm text-gray-600">
                    No examples available yet.
                  </p>
                ) : null}
              </div>
            )}

            {tab === "reviews" && (
              <div className="space-y-3">
                {(agent.reviews ?? []).map((review) => (
                  <div
                    key={review.id}
                    className="flex items-start gap-3 rounded-lg bg-white p-3 shadow-sm ring-1 ring-gray-200"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-sm font-semibold text-gray-700">
                      {review.user.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                        {review.user}
                        <span className="flex items-center gap-1 text-xs text-gray-700">
                          <Star className="h-4 w-4 text-amber-500" />
                          {review.rating.toFixed(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{review.comment}</p>
                    </div>
                  </div>
                ))}

                {!(agent.reviews ?? []).length ? (
                  <p className="text-sm text-gray-600">
                    No reviews yet. Be the first.
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={onUseAgent}
              className="rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-black/90"
            >
              Use this agent
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
