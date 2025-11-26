"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categories } from "@/lib/agents";
import { CheckCircle2, Loader2, Play, Sparkles } from "lucide-react";

type TestResult = {
  id: string;
  testedAt: string;
  score: number;
  notes: string;
};

export default function RegisterPage() {
  const [form, setForm] = useState({
    name: "",
    author: "",
    address: "",
    description: "",
    url: "",
    pricingModel: "",
    price: "",
    category: categories[0]?.id ?? "ppt",
  });
  const [testStatus, setTestStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [registerStatus, setRegisterStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleChange = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleTest = async () => {
    setTestStatus("loading");
    setRegisterStatus("idle");
    setMessage(null);
    try {
      const res = await fetch("/api/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Test failed");
      setTestResult(data.result);
      setTestStatus("success");
      setMessage("Test completed. Review result and finish registration.");
    } catch (err) {
      console.error(err);
      setTestStatus("error");
      setMessage("Test failed. Please adjust and retry.");
    }
  };

  const handleRegister = async () => {
    if (testStatus !== "success") return;
    setRegisterStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, testResult }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Register failed");
      setRegisterStatus("success");
      setMessage("Agent registered successfully.");
      window.location.href = "/agents";
    } catch (err) {
      console.error(err);
      setRegisterStatus("error");
      setMessage("Registration failed. Please retry.");
    }
  };

  const allFilled =
    form.name.trim() &&
    form.category.trim() &&
    form.description.trim() &&
    form.url.trim() &&
    form.author.trim() &&
    form.address.trim() &&
    form.pricingModel.trim() &&
    form.price.trim();

  const disabledDone =
    !allFilled || testStatus !== "success" || registerStatus === "loading";

  return (
    <main className="h-full overflow-auto bg-white px-4 py-10 text-gray-900">
      <div className="mx-auto flex max-w-4xl flex-col gap-10 pb-10">
        <header className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold">Register Agent</h1>
            <p className="text-sm text-gray-600">
              Run AI validation before adding your agent.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-400">
            <Sparkles className="h-4 w-4" />
            AI-powered validation
          </div>
        </header>

        <section className="grid gap-6 rounded-3xl bg-gray-50 p-6 shadow-sm">
          <div className="space-y-1">
            <p className="text-xl font-semibold">Registration</p>
            <p className="text-sm font-semibold text-gray-700">Basic</p>
          </div>
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Name
                </label>
                <Input
                  placeholder="Agent name"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Creator Name
                </label>
                <Input
                  placeholder="Alice"
                  value={form.author}
                  onChange={(e) => handleChange("author", e.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-col space-y-1">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Category
                </label>
                <select
                  value={form.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                  className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-800 outline-none focus:border-gray-500"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  placeholder="Describe what this agent does best"
                  value={form.description}
                  onChange={(e) => handleChange("description", e.target.value)}
                  className="min-h-[120px] rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-gray-500"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Endpoint URL
                </label>
                <Input
                  placeholder="https://api.example.com/agent"
                  value={form.url}
                  onChange={(e) => handleChange("url", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Creator Address
                </label>
                <Input
                  placeholder="0x..."
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                />
              </div>
            </div>

            <p className="text-sm font-semibold text-gray-700">X402 Pricing</p>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Pricing Model
                </label>
                <Input
                  placeholder="per_run / subscription"
                  value={form.pricingModel}
                  onChange={(e) => handleChange("pricingModel", e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">
                  Default Price
                </label>
                <Input
                  placeholder="0.001"
                  value={form.price}
                  onChange={(e) => handleChange("price", e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-gray-800">
                Validation
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleTest}
                  disabled={testStatus === "loading"}
                  className="rounded-full bg-gray-900 px-5 text-white hover:bg-gray-800"
                >
                  {testStatus === "loading" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Start Test
                    </>
                  )}
                </Button>
                <Button
                  onClick={handleRegister}
                  disabled={disabledDone}
                  className="rounded-full bg-white px-5 text-gray-900 ring-1 ring-gray-300 hover:bg-gray-100 disabled:opacity-50"
                >
                  {registerStatus === "loading" ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Done"
                  )}
                </Button>
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 p-4 text-sm text-gray-800">
              {testStatus === "success" && testResult ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    Test passed at{" "}
                    {new Date(testResult.testedAt).toLocaleTimeString()}
                  </div>
                  <p>Score: {testResult.score.toFixed(1)}</p>
                  <p>{testResult.notes}</p>
                </div>
              ) : (
                <p className="text-gray-600">
                  Click Start Test to validate the agent automatically.
                </p>
              )}
            </div>

            {message ? (
              <p
                className={`text-sm ${
                  registerStatus === "error" || testStatus === "error"
                    ? "text-red-600"
                    : "text-gray-800"
                }`}
              >
                {message}
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
