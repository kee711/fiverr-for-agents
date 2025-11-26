"use client";

import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { useEffect, useMemo, useState } from "react";
import { AgentCard } from "@/components/agent-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { categories, type Agent, type Category } from "@/lib/agents";
import { Loader2, Send, Sparkles, Star, UserRound, Wallet } from "lucide-react";

type ChatMessage = {
  id: string;
  from: "user" | "ai";
  text: string;
};

export default function ChatPage() {
  const [view, setView] = useState<"landing" | "chat">("landing");
  const [prompt, setPrompt] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>(
    categories[0]?.id ?? "ppt",
  );
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [agentModal, setAgentModal] = useState<Agent | null>(null);
  const [searchResults, setSearchResults] = useState<Agent[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [executing, setExecuting] = useState(false);
  const [lastQuery, setLastQuery] = useState("");

  const recommendedAgents = useMemo(() => {
    const filtered = searchResults.filter((agent) =>
      selectedCategory ? agent.category === selectedCategory : true,
    );
    const scoredAgents = filtered.length ? filtered : searchResults;

    const sorted = [...scoredAgents].sort((a, b) => {
      const aScore = a.fitness_score ?? a.score ?? a.similarity ?? 0;
      const bScore = b.fitness_score ?? b.score ?? b.similarity ?? 0;
      if (bScore === aScore) {
        const aPrice = a.price ?? 0;
        const bPrice = b.price ?? 0;
        return aPrice - bPrice;
      }
      return bScore - aScore;
    });

    return sorted.map((agent, index) => ({ ...agent, rank: agent.rank ?? index + 1 }));
  }, [searchResults, selectedCategory]);

  useEffect(() => {
    if (view === "chat" && !selectedAgentId && recommendedAgents[0]) {
      setSelectedAgentId(recommendedAgents[0].id);
    }
  }, [view, recommendedAgents, selectedAgentId]);

  const primaryAgent = recommendedAgents.find((agent) => agent.id === selectedAgentId);

  const handleSend = async () => {
    const text = prompt.trim();
    if (!text) return;

    const now = Date.now();
    const follow =
      view === "landing"
        ? "Searching for the best-fitting agents now."
        : "Refreshing the recommendations based on your latest note.";

    setMessages((prev) => [
      ...prev,
      { id: `user-${now}`, from: "user", text },
      {
        id: `ai-${now}-follow`,
        from: "ai",
        text: follow,
      },
    ]);

    setView("chat");
    setPrompt("");
    setLastQuery(text);

    await runSearch(text);
  };

  const runSearch = async (queryText: string) => {
    setSearching(true);
    setSearchError(null);

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: queryText,
          topK: 10,
          matchThreshold: 0.35,
          category: selectedCategory,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Search failed");
      }

      const payload = await response.json();
      if (!payload?.ok) {
        throw new Error(payload?.error ?? "Search failed");
      }

      if (payload?.mode === "chat") {
        const aiMessage = payload?.message ?? "I can help with that.";
        setSearchResults([]);
        setMessages((prev) => [
          ...prev,
          { id: `chat-${Date.now()}`, from: "ai", text: aiMessage },
        ]);
        return;
      }

      type RawAgent = Partial<Agent> & {
        id: string;
        name: string;
        similarity?: number;
        fitness_score?: number;
        rank?: number;
      };

      const rawResults: RawAgent[] = Array.isArray(payload?.results) ? payload.results : [];
      const results: Agent[] = rawResults.map((item) => ({
        id: item.id,
        name: item.name,
        author: item.author ?? "Unknown",
        description: item.description ?? "",
        price: item.price ?? 0,
        rating_avg: item.rating_avg ?? null,
        rating_count: item.rating_count ?? 0,
        category: item.category ?? selectedCategory,
        fitness_score: item.fitness_score ?? 0,
        similarity: item.similarity ?? 0,
        score: item.fitness_score ?? 0,
        rank: item.rank,
        pricing_model: item.pricing_model ?? "",
        url: item.url ?? "",
        test_score: item.test_score ?? null,
        rationale: item.rationale ?? "",
      }));

      setSearchResults(results);

      if (results[0]) {
        setSelectedAgentId(results[0].id);
        if (payload?.message) {
          setMessages((prev) => [
            ...prev,
            { id: `chat-${Date.now()}`, from: "ai", text: payload.message },
          ]);
        }
      } else if (payload?.message) {
        setMessages((prev) => [
          ...prev,
          { id: `chat-${Date.now()}`, from: "ai", text: payload.message },
        ]);
      }
    } catch (error) {
      console.error(error);
      setSearchResults([]);
      const message = error instanceof Error ? error.message : "Failed to search";
      setSearchError(message);
    } finally {
      setSearching(false);
    }
  };

  const executeAgent = async () => {
    if (!selectedAgentId) return;
    setExecuting(true);
    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agentId: selectedAgentId,
          query: lastQuery,
        }),
      });

      const payload = await response.json();
      const success = response.ok && payload?.ok;
      const text = success
        ? `Executing agent "${payload?.agent?.name ?? selectedAgentId}" with your latest request.`
        : `Failed to execute agent: ${payload?.error ?? "unknown error"}`;

      setMessages((prev) => [
        ...prev,
        {
          id: `exec-${Date.now()}`,
          from: "ai",
          text,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: `exec-${Date.now()}`,
          from: "ai",
          text: `Failed to execute agent: ${
            error instanceof Error ? error.message : "unknown error"
          }`,
        },
      ]);
    } finally {
      setExecuting(false);
    }
  };

  return (
    <main className="min-h-screen bg-white px-4 py-10 text-gray-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-10">
        <TopNav />

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
          // onSelectAgent={setSelectedAgentId}
          onOpenAgent={(agent) => setAgentModal(agent)}
          onConfirm={executeAgent}
          searching={searching}
          searchError={searchError}
          executing={executing}
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

function TopNav() {
  const navItems = [
    { label: "Home", href: "/" },
    { label: "Agents", href: "/agents" },
  ];

  return (
    <div className="flex justify-center gap-3">
      {navItems.map((item) => (
        <Button
          asChild
          key={item.href}
          className="rounded-full bg-[#4B6BFF] px-5 py-2 text-white shadow-md hover:bg-[#3d5ff5]"
          size="lg"
          variant="secondary"
        >
          <Link href={item.href}>{item.label}</Link>
        </Button>
      ))}
      <Button
        className="rounded-full bg-[#4B6BFF] px-5 py-2 text-white shadow-md hover:bg-[#3d5ff5]"
        size="lg"
        variant="secondary"
      >
        Connect Wallet
      </Button>
    </div>
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
  onSend: () => void | Promise<void>;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  recommendedAgents: Agent[];
  onOpenAgent: (agent: Agent) => void;
}) {
  return (
    <section className="flex flex-col items-center gap-10">
      <div className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Welcome!</h1>
      </div>

      <div className="flex w-full flex-col gap-4">
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
        {recommendedAgents.length ? (
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
        ) : (
          <p className="text-sm text-gray-500">Run a search to see agent results here.</p>
        )}
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
  // onSelectAgent,
  onOpenAgent,
  onConfirm,
  searching,
  searchError,
  executing,
}: {
  prompt: string;
  onPromptChange: (value: string) => void;
  onSend: () => void | Promise<void>;
  messages: ChatMessage[];
  selectedCategory: string;
  recommendedAgents: Agent[];
  selectedAgent: Agent | undefined;
  // onSelectAgent: (id: string) => void;
  onOpenAgent: (agent: Agent) => void;
  onConfirm: () => void;
  searching: boolean;
  searchError: string | null;
  executing: boolean;
}) {
  return (
    <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
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
            <div className="flex flex-col items-start gap-3">
              <AgentCard
                agent={selectedAgent}
                highlight
                note="However, you may select another agent from the right-hand section to work with."
                onOpen={() => onOpenAgent(selectedAgent)}
              />
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={onConfirm}
                  disabled={executing}
                  className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-black/90"
                >
                  {executing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Executing...
                    </>
                  ) : (
                    "Confirm & Execute (Enter on button)"
                  )}
                </Button>
                <span className="text-xs text-gray-500">
                  Selected agent card sits under the chat bubble. Press Enter on this button or click confirm to call /execute.
                </span>
              </div>
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
          <span className="flex items-center gap-2 text-xs text-gray-500">
            {searching ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              "Ranked by score & price"
            )}
          </span>
        </div>
        {searchError ? (
          <p className="mb-3 text-xs text-red-600">
            Search error: {searchError}
          </p>
        ) : null}
        {recommendedAgents.length ? (
          <div className="flex flex-col gap-4">
            {recommendedAgents.map((agent, index) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                compact
                rank={index + 1}
                active={selectedAgent?.id === agent.id}
                onOpen={() => onOpenAgent(agent)}
              />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No agents yet. Submit a prompt to search.
          </p>
        )}
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
  onSend: () => void | Promise<void>;
  placeholder: string;
  minimal?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex w-full items-center gap-3 rounded-3xl bg-gray-100 px-5",
        minimal ? "py-3" : "py-5 shadow-sm",
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
    <div className="flex gap-3 overflow-x-auto pb-1">
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
                : "bg-gray-200 text-gray-700 hover:bg-gray-300",
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
    from === "user" ? "ml-auto bg-gray-200 text-gray-800" : "mr-auto bg-gray-100";
  return (
    <div
      className={cn(
        "max-w-xl rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm",
        alignClass,
      )}
    >
      {typeof children === "string" ? (
        <div className="prose prose-sm max-w-none text-gray-800 prose-p:my-1 prose-li:my-0 prose-code:rounded prose-code:bg-gray-200 prose-code:px-1 prose-code:py-0.5">
          <ReactMarkdown>{children}</ReactMarkdown>
        </div>
      ) : (
        children
      )}
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
  const priceValue = agent.price ?? 0;
  const ratingValue = agent.rating_avg ?? agent.rating ?? 0;

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
                <span>{priceValue.toFixed(3)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4" />
                <span>{ratingValue.toFixed(1)}</span>
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
                    : "text-gray-600 hover:bg-gray-100",
                )}
              >
                {key === "about" ? "About" : key === "example" ? "Example" : "Reviews"}
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-gray-100 p-5">
            {tab === "about" && (
              <div className="space-y-2">
                <p className="text-base font-semibold text-gray-900">About this Agent</p>
                <p className="text-gray-800">{agent.description ?? "No description yet."}</p>
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
                        <p className="font-semibold text-gray-900">{example.title}</p>
                        <p className="mt-1 text-sm text-gray-700">{example.body}</p>
                      </div>
                    );
                  }

                  if (example.type === "image") {
                    return (
                      <div
                        key={example.title}
                        className="space-y-2 rounded-lg bg-white p-4 shadow-sm ring-1 ring-gray-200"
                      >
                        <p className="font-semibold text-gray-900">{example.title}</p>
                        <img
                          src={example.url}
                          alt={example.caption ?? example.title}
                          className="h-48 w-full rounded-lg object-cover"
                        />
                        {example.caption ? (
                          <p className="text-xs text-gray-600">{example.caption}</p>
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
                        <p className="font-semibold text-gray-900">{example.title}</p>
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
                  <p className="text-sm text-gray-600">No examples available yet.</p>
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
                  <p className="text-sm text-gray-600">No reviews yet. Be the first.</p>
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
