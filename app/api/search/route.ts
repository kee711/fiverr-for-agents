import OpenAI from "openai";
import { NextResponse } from "next/server";
import { embedText } from "@/lib/embedding";
import { createClient } from "@/lib/supabase/server";

const DEFAULT_TOP_K = 10;
const DEFAULT_MATCH_THRESHOLD = 0.35;
const DEFAULT_PRICE_ANCHOR = 200;
const MAX_TOP_K = 50;

type MatchRow = {
  agent_id: string;
  similarity: number;
};

type AgentRow = {
  id: string;
  name: string;
  author: string | null;
  description: string | null;
  category: string | null;
  url: string | null;
  pricing_model: string | null;
  price: number | null;
  rating_avg: number | null;
  rating_count: number;
  test_score: number | null;
};

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function calcFitnessScore(params: {
  similarity: number;
  ratingAvg: number | null;
  ratingCount: number;
  testScore: number | null;
  price: number | null;
  priceAnchor: number;
}) {
  const sim = clamp(params.similarity, 0, 1);
  const rating = params.ratingAvg ? params.ratingAvg / 5 : 0;
  const ratingPop = Math.log1p(params.ratingCount ?? 0) / Math.log(101);
  const test = params.testScore ? params.testScore / 100 : 0;
  const pricePenalty = Math.min(
    params.priceAnchor ? (params.price ?? 0) / params.priceAnchor : 0,
    2,
  );

  const raw =
    0.45 * sim +
    0.2 * rating +
    0.1 * ratingPop +
    0.2 * test -
    0.15 * pricePenalty;

  return Math.max(raw, 0);
}

function buildRationale(agent: AgentRow, similarity: number, fitness: number) {
  const parts: string[] = [];
  parts.push(`similarity ${similarity.toFixed(2)}`);
  if (agent.rating_avg != null) {
    parts.push(`rating ${agent.rating_avg.toFixed(2)} (${agent.rating_count} reviews)`);
  }
  if (agent.test_score != null) {
    parts.push(`test_score ${agent.test_score.toFixed(1)}`);
  }
  if (agent.price != null) {
    parts.push(`price ${agent.price}`);
  }
  parts.push(`fitness ${fitness.toFixed(3)}`);
  return parts.join(" | ");
}

const systemPrompt = `
You are an assistant that decides whether to search the agents database or simply reply directly.
- If the user asks to pick/find/recommend/compare an agent, or wants an agent to execute a task, you MUST call the tool "match_agents".
- If the user just asks a question you can answer directly without finding an agent, DO NOT call the tool.
- When you do not call a tool, reply briefly and practically.
`;

const fallbackPrompt = `
No suitable agent was found. Suggest quick, concrete steps the user can try without an agent, or how to reformulate the request.
`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const query = (body?.query ?? "").toString().trim();
    if (!query) {
      return NextResponse.json({ ok: false, error: "query is required" }, { status: 400 });
    }

    const topK = clamp(toNumber(body?.topK, DEFAULT_TOP_K), 1, MAX_TOP_K);
    const matchThreshold = clamp(
      toNumber(body?.matchThreshold, DEFAULT_MATCH_THRESHOLD),
      0,
      1,
    );
    const priceMax = body?.priceMax != null ? toNumber(body.priceMax, DEFAULT_PRICE_ANCHOR) : null;
    const category = body?.category ? String(body.category).trim() : null;
    const priceAnchor = priceMax ?? DEFAULT_PRICE_ANCHOR;

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ ok: false, error: "OPENAI_API_KEY is not set" }, { status: 500 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const toolCallDecision = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `User request: """${query}"""\nCategory hint: ${category ?? "none"}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "match_agents",
            description:
              "Search for the best agent to execute the user's request using semantic similarity and metadata filters.",
            parameters: {
              type: "object",
              properties: {
                topK: { type: "integer", minimum: 1, maximum: MAX_TOP_K, default: topK },
                matchThreshold: { type: "number", minimum: 0, maximum: 1, default: matchThreshold },
                category: { type: "string", nullable: true },
                priceMax: { type: "number", nullable: true },
              },
            },
          },
        },
      ],
      tool_choice: "auto",
    });

    const firstMessage = toolCallDecision.choices[0]?.message;
    const toolCalls = firstMessage?.tool_calls ?? [];

    type FunctionToolCall = Extract<
      (typeof toolCalls)[number],
      { type: "function"; function?: { arguments: string; name?: string } }
    >;
    const isFunctionToolCall = (call: (typeof toolCalls)[number]): call is FunctionToolCall => {
      if (call.type !== "function") return false;
      const fn = (call as { function?: { arguments?: unknown } }).function;
      return typeof fn?.arguments === "string";
    };

    // If the model decides no tool is needed, just return its response as chat mode.
    if (!toolCalls.length) {
      return NextResponse.json({
        ok: true,
        mode: "chat",
        message: firstMessage?.content ?? "I can help with that.",
        results: [],
      });
    }

    // Tool call path: perform embedding + match_agents RPC.
    const [supabase, queryEmbedding] = await Promise.all([
      createClient(),
      embedText(query),
    ]);

    const functionCall = toolCalls.find(isFunctionToolCall);
    const toolArgs = functionCall?.function?.arguments
      ? JSON.parse(functionCall.function.arguments)
      : {};

    const rpcTopK = clamp(toNumber(toolArgs?.topK, topK), 1, MAX_TOP_K);
    const rpcMatchThreshold = clamp(
      toNumber(toolArgs?.matchThreshold, matchThreshold),
      0,
      1,
    );
    const rpcCategory = toolArgs?.category ?? category;
    const rpcPriceMax =
      toolArgs?.priceMax != null ? toNumber(toolArgs.priceMax, priceAnchor) : priceMax;
    const rpcPriceAnchor = rpcPriceMax ?? priceAnchor;

    const { data: matches, error: matchError } = await supabase.rpc("match_agents", {
      query_embedding: queryEmbedding,
      match_threshold: rpcMatchThreshold,
      match_count: rpcTopK,
    });

    if (matchError) {
      return NextResponse.json(
        { ok: false, error: `match_agents failed: ${matchError.message}` },
        { status: 500 },
      );
    }

    const matchRows: MatchRow[] = matches ?? [];
    const matchedIds = matchRows.map((row) => row.agent_id);

    if (!matchedIds.length) {
      // No matches: ask GPT to give fallback suggestions.
      const fallback = await openai.chat.completions.create({
        model: "gpt-4.1",
        messages: [
          { role: "system", content: fallbackPrompt },
          { role: "user", content: query },
        ],
      });

      return NextResponse.json({
        ok: true,
        mode: "chat",
        message:
          fallback.choices[0]?.message?.content ??
          "No suitable agent found. Try rephrasing your request.",
        results: [],
      });
    }

    let agentQuery = supabase
      .from("agents")
      .select(
        "id, name, author, description, category, url, pricing_model, price, rating_avg, rating_count, test_score",
      )
      .in("id", matchedIds);

    if (rpcCategory) {
      agentQuery = agentQuery.eq("category", rpcCategory);
    }
    if (rpcPriceMax != null) {
      agentQuery = agentQuery.lte("price", rpcPriceMax);
    }

    const { data: agents, error: agentError } = await agentQuery;
    if (agentError) {
      return NextResponse.json(
        { ok: false, error: `agent fetch failed: ${agentError.message}` },
        { status: 500 },
      );
    }

    const matchMap = new Map<string, number>(
      matchRows.map((row) => [row.agent_id, row.similarity]),
    );

    const combined = (agents ?? []).map((agent: AgentRow) => {
      const similarity = matchMap.get(agent.id) ?? 0;
      const fitness_score = calcFitnessScore({
        similarity,
        ratingAvg: agent.rating_avg,
        ratingCount: agent.rating_count ?? 0,
        testScore: agent.test_score,
        price: agent.price,
        priceAnchor: rpcPriceAnchor,
      });

      return {
        ...agent,
        similarity,
        fitness_score,
      };
    });

    const sorted = combined
      .sort((a, b) => {
        if (b.fitness_score === a.fitness_score) {
          return (b.similarity ?? 0) - (a.similarity ?? 0);
        }
        return (b.fitness_score ?? 0) - (a.fitness_score ?? 0);
      })
      .map((agent, index) => ({
        ...agent,
        rank: index + 1,
        rationale: buildRationale(agent, agent.similarity ?? 0, agent.fitness_score ?? 0),
      }));

    const explanation = sorted
      .slice(0, 3)
      .map((agent) => `${agent.name}: ${agent.rationale}`)
      .join("\n");

    const AIexplanation = await openai.chat.completions.create({
      model: "gpt-4.1",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Tell the user why you recommended the following agent based on the numbers in ${explanation}`,
        },
      ],
  })
    
    const summaryMessage = `${AIexplanation.choices[0].message.content}`;
    
    return NextResponse.json({
      ok: true,
      mode: "agents",
      message: explanation ? (summaryMessage) : "Sorry, we couldn't find any agents that mathes your request",
      results: sorted,
    });

    
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { ok: false, error: "search failed" },
      { status: 500 },
    );
  }

}
