"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AgentCard } from "@/components/agent-card";
import { Button } from "@/components/ui/button";
import { categories, type Agent, type Category } from "@/lib/agents";
import { createClient } from "@/lib/supabase/client";
import { Sparkles } from "lucide-react";

export default function AgentsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAgents = async () => {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("agents")
          .select(
            "id, name, author, description, category, price, rating_avg, rating_count, test_score, pricing_model, url",
          );

        if (error) throw new Error(error.message);

        const sorted =
          data?.sort((a, b) => {
            const aRating = (a.rating_avg ?? 0) + (a.rating_count ?? 0) * 0.001;
            const bRating = (b.rating_avg ?? 0) + (b.rating_count ?? 0) * 0.001;
            if (bRating === aRating) {
              return (a.price ?? 0) - (b.price ?? 0);
            }
            return bRating - aRating;
          }) ?? [];

        setAgents(
          sorted.map((agent, index) => ({
            ...agent,
            rank: index + 1,
            rating: agent.rating_avg ?? undefined,
          })),
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load agents";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadAgents();
  }, []);

  const filteredAgents = useMemo(() => {
    if (selectedCategory === "all") return agents;
    return agents.filter((agent) => agent.category === selectedCategory);
  }, [agents, selectedCategory]);

  return (
    <main className="min-h-screen bg-white px-4 py-10 text-gray-900">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <TopNav />

        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold">Agents</h1>
            <p className="text-sm text-gray-600">
              Browse all vetted agents. Filter by category to jump to what you need.
            </p>
          </div>
          <Button
            asChild
            className="rounded-full bg-black px-5 py-2 text-white hover:bg-black/85"
            size="lg"
          >
            <Link href="/register">Register</Link>
          </Button>
        </header>

        <CategoryFilters
          selected={selectedCategory}
          onSelect={setSelectedCategory}
          categories={[{ id: "all", label: "All" }, ...categories]}
        />

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <Sparkles className="h-4 w-4" />
            <span>{filteredAgents.length} agents</span>
          </div>
          {error ? (
            <p className="text-sm text-red-600">Failed to load agents: {error}</p>
          ) : loading ? (
            <p className="text-sm text-gray-500">Loading agents...</p>
          ) : filteredAgents.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAgents.map((agent, index) => (
                <AgentCard key={agent.id} agent={agent} rank={index + 1} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No agents found.</p>
          )}
        </section>
      </div>
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

function CategoryFilters({
  selected,
  onSelect,
  categories,
}: {
  selected: string;
  onSelect: (value: string) => void;
  categories: Category[];
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {categories.map((category) => {
        const isSelected = category.id === selected;
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect(category.id)}
            className={`min-w-[120px] rounded-full px-4 py-2 text-sm font-semibold shadow-sm transition ${
              isSelected
                ? "bg-gray-900 text-white"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            {category.label}
          </button>
        );
      })}
    </div>
  );
}
