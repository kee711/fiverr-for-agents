"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AgentCard } from "@/components/agent-card";
import { Button } from "@/components/ui/button";
import { agents, categories, type Agent, type Category } from "@/lib/agents";
import { Sparkles } from "lucide-react";
import GlobalHeader from "@/components/GlobalHeader";

export default function AgentsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const filteredAgents = useMemo(() => {
    if (selectedCategory === "all") return agents;
    return agents.filter((agent) => agent.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <main className="min-h-screen bg-white px-4 py-10 flex flex-col items-center  text-gray-900">
      <GlobalHeader />
      <div className="mx-auto flex max-w-6xl flex-col gap-8 mt-12">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl font-semibold">Agents</h1>
            <p className="text-sm text-gray-600">
              Browse all vetted agents. Filter by category to jump to what you
              need.
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
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAgents.map((agent, index) => (
              <AgentCard key={agent.id} agent={agent} rank={index + 1} />
            ))}
          </div>
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
