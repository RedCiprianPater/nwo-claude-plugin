/**
 * NWO Robotics MCP Server v3.0.0
 * ──────────────────────────────────────────────────────────────────────────
 * Comprehensive Model Context Protocol server for the NWO ecosystem.
 *
 * 133 tools across 22 sections. Render-only stack (nwo-capital-api).
 * Includes all the new endpoints from app.py v3: agents, discovery,
 * embodiment, calibration, RL, finetune, datasets, tactile, safety,
 * learning, the L2-L6 layered platform, agent graph, compute proxies,
 * billing/subscriptions. Adds the runner v7 agentic services: DeerFlow,
 * NWO MR generation, METASTATE, NWO-ASM, recruitment. Existing BYOR,
 * ROS2 bridge, Cardiac Oracle/Relayer tools retained.
 *
 * Removed in v3.0.0:
 *   - spqr_trade (Uniswap V3 trading) — parked
 *   - oracle_predict (NWO Oracle price prediction) — parked
 *   - All 42 PHP fallback tools — the legacy nwo.capital PHP backend is
 *     no longer reachable through this MCP. Use the HF Space's API Key
 *     system (issued via Render, stored in Supabase) for everything.
 *
 * Auth model:
 *   - X-API-Key: required for all endpoints. The same key system used
 *     by the HF Space at https://huggingface.co/spaces/CPater/nwo-capital
 *     — keys are minted, validated, and revoked via the Render gateway
 *     (`/api/api-keys/*`) and persisted in Supabase. Get a key via
 *     `nwo_r_keys_create` once connected, or through the HF Space UI.
 *   - X-Relayer-Secret: required for Cardiac Relayer writes.
 *   - X-Oracle-Secret: required for Cardiac Oracle ECG validation.
 *   - X-Wallet: optional, attaches caller's ETH wallet to BYOR
 *     publishing and AGI contribution earnings.
 *
 * Connect from Claude Desktop:
 *   Settings → Connectors → Add custom connector
 *   URL: https://nwo-chatgpt-app.onrender.com/mcp  (or your own host)
 *   Headers: X-API-Key: sk_live_... ; optional X-Wallet: 0x...
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { z } from "zod";
import "dotenv/config";

// ─── Base URLs ────────────────────────────────────────────────────────────────
// PRIMARY: Render gateway. Caller hits one base; the gateway proxies to
// downstream microservices and wallet-mediated CRUD as needed.
const RENDER_BASE     = process.env.NWO_RENDER_URL   || "https://nwo-capital-api.onrender.com";
const RENDER_API      = `${RENDER_BASE}/api`;

// Standalone Render services.
const ROS2_BASE       = "https://nwo-ros2-bridge.onrender.com";
const ORACLE_BASE     = "https://nwo-oracle.onrender.com";
const RELAYER_BASE    = "https://nwo-relayer.onrender.com";

// CF Worker edge inference and the agent runner.
const EDGE_BASE       = "https://nwo-robotics-api-edge.ciprianpater.workers.dev";
const RUNNER_BASE     = process.env.NWO_RUNNER_URL   || "https://nwo-runner.ciprianpater.workers.dev";

// Agentic services from runner v7. DeerFlow flows through the Render
// gateway under /api/deerflow/{research,code,docs}; no direct PHP path.
const MR_BLASTER      = process.env.NWO_MR_BLASTER_URL  || "https://nwo-blaster.ciprianpater.workers.dev";
const METASTATE_BASE  = process.env.NWO_METASTATE_URL   || "https://cpater-metastate.hf.space";
const METASTATE_BCN   = process.env.NWO_METASTATE_BEACON || "https://metastate-beacon.ciprianpater.workers.dev";

// BYOR services (already in index.ts v2.1.0).
const L1_DESIGN_BASE  = process.env.NWO_L1_DESIGN_URL  || "https://nwo-design-engine.onrender.com";
const L2_GALLERY_BASE = process.env.NWO_L2_GALLERY_URL || "https://nwo-parts-gallery.onrender.com";
const L3_PRINTER_BASE = process.env.NWO_L3_PRINTER_URL || "https://nwo-printer-connectors.onrender.com";
const SIM_API_BASE    = process.env.NWO_SIM_API_URL    || "https://nwo-simulation-api.onrender.com";
const AGI_RUNNER_BASE = process.env.NWO_AGI_RUNNER_URL || "https://nwo.ciprianpater.workers.dev";

// On-chain settlement constants (for billing tool and recruit kit).
const BASE_USDC       = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const NWO_TREASURY    = "0x2E964e1c0e3Fa2C0dfD484B2E6D2189dfCF20958";
const METASTATE_SPLT  = "0x93a7962f75475b7e3Fbb62d3A23194f8833b1BE4";

const PORT = Number(process.env.PORT) || 3000;

// ─── Express setup ────────────────────────────────────────────────────────────
const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: "20mb" }));

// ─── Fetch helpers ────────────────────────────────────────────────────────────
interface FetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined | null>;
}

async function apiFetch(url: string, opts: FetchOptions = {}): Promise<unknown> {
  const u = new URL(url);
  if (opts.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
    }
  }
  const res = await fetch(u.toString(), {
    method: opts.method ?? "GET",
    headers: { "Content-Type": "application/json", ...(opts.headers ?? {}) },
    ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
  });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text, status: res.status }; }
}

async function apiFetchMultipart(
  url: string,
  formData: FormData,
  headers: Record<string, string> = {},
): Promise<unknown> {
  const res = await fetch(url, { method: "POST", headers, body: formData });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text, status: res.status }; }
}

// PRIMARY: Render gateway helper
const render = (apiKey: string, path: string, o: FetchOptions = {}) =>
  apiFetch(`${RENDER_API}${path}`, { ...o, headers: { "X-API-Key": apiKey, ...(o.headers ?? {}) } });

const ros2 = (apiKey: string, path: string, o: FetchOptions = {}) =>
  apiFetch(`${ROS2_BASE}${path}`, { ...o, headers: { "X-API-Key": apiKey, ...(o.headers ?? {}) } });

const relayer = (secret: string, path: string, o: FetchOptions = {}) =>
  apiFetch(`${RELAYER_BASE}${path}`, { ...o, headers: { "X-Relayer-Secret": secret, ...(o.headers ?? {}) } });

const oracle = (secret: string, path: string, o: FetchOptions = {}) =>
  apiFetch(`${ORACLE_BASE}${path}`, { ...o, headers: { "X-Oracle-Secret": secret, ...(o.headers ?? {}) } });

const l1Design  = (k: string, p: string, o: FetchOptions = {}) =>
  apiFetch(`${L1_DESIGN_BASE}${p}`, { ...o, headers: { "X-API-Key": k, ...(o.headers ?? {}) } });
const l2Gallery = (k: string, p: string, o: FetchOptions = {}) =>
  apiFetch(`${L2_GALLERY_BASE}${p}`, { ...o, headers: { "X-API-Key": k, ...(o.headers ?? {}) } });
const l3Printer = (k: string, p: string, o: FetchOptions = {}) =>
  apiFetch(`${L3_PRINTER_BASE}${p}`, { ...o, headers: { "X-API-Key": k, ...(o.headers ?? {}) } });
const simApi   = (k: string, p: string, o: FetchOptions = {}) =>
  apiFetch(`${SIM_API_BASE}${p}`, { ...o, headers: { "X-API-Key": k, ...(o.headers ?? {}) } });
const agiRunner = (p: string, o: FetchOptions = {}) => apiFetch(`${AGI_RUNNER_BASE}${p}`, o);
const mrBlaster = (k: string, p: string, o: FetchOptions = {}) =>
  apiFetch(`${MR_BLASTER}${p}`, { ...o, headers: { "X-API-Key": k, ...(o.headers ?? {}) } });
const metastate = (k: string, p: string, o: FetchOptions = {}) =>
  apiFetch(`${METASTATE_BASE}${p}`, { ...o, headers: { "Authorization": `Bearer ${k}`, ...(o.headers ?? {}) } });

const ok = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

// ─── MCP Server factory ───────────────────────────────────────────────────────
function createServer(apiKey: string, relayerSecret: string, oracleSecret: string, wallet: string): McpServer {
  const server = new McpServer({ name: "NWO Robotics", version: "3.0.0" });

  // ════════════════════════════════════════════════════════════════════════
  //                  ╭───────────────────────────────╮
  //                  │  PRIMARY: RENDER GATEWAY       │
  //                  │  nwo-capital-api.onrender.com  │
  //                  ╰───────────────────────────────╯
  //
  // The following ~76 tools are served by the v3 Render gateway. Every tool
  // here has its name prefixed `nwo_r_` to make it obvious in chat that the
  // call goes to Render. There is no PHP fallback in v3.0.0; all auth flows
  // through the same `/api/api-keys/*` endpoints the HF Space uses.
  // ════════════════════════════════════════════════════════════════════════

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 1. RENDER PLATFORM CORE — health, auth, api-keys, subscriptions
  // ════════════════════════════════════════════════════════════════════════

  server.tool("nwo_r_health",
    "Render gateway health probe (no auth required). Returns DB status and version. Use this first to confirm the primary stack is reachable.",
    {},
    { readOnlyHint: true },
    async () => ok(await apiFetch(`${RENDER_API}/health`))
  );

  server.tool("nwo_r_auth_echo",
    "Render auth smoke test. Returns the wallet address the gateway resolved from your API key. Use this to confirm your X-API-Key header is valid.",
    {},
    { readOnlyHint: true },
    async () => ok(await render(apiKey, "/auth/echo", { method: "POST", body: {} }))
  );

  server.tool("nwo_r_validate_key",
    "Validate any NWO API key against the Render registry. Service-to-service tool (no wallet signature needed). Used by sim API, skill engine, the CF runner.",
    { api_key: z.string(), wallet: z.string().optional().describe("Optional ownership check") },
    { readOnlyHint: true },
    async (args) => ok(await apiFetch(`${RENDER_API}/api-keys/validate`, { method: "POST", body: args }))
  );

  server.tool("nwo_r_keys_create",
    "Create a wallet-scoped developer API key. Returns the full key once — copy it. Use only for human developer keys; agents call nwo_r_agent_register instead to mint their own automated system key.",
    { name: z.string().describe("Human-readable label, e.g. 'Production Fleet'") },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await render(apiKey, "/api-keys", { method: "POST", body: args }))
  );

  server.tool("nwo_r_keys_list",
    "List your wallet's API keys. agent_id is set for automated system keys (minted by self-registered agents); null for developer keys.",
    {},
    { readOnlyHint: true },
    async () => ok(await render(apiKey, "/api-keys"))
  );

  server.tool("nwo_r_keys_revoke",
    "Revoke an API key by id. Irreversible. Pulls only your own keys.",
    { key_id: z.string() },
    { readOnlyHint: false, destructiveHint: true },
    async ({ key_id }) => ok(await render(apiKey, `/api-keys/${encodeURIComponent(key_id)}`, { method: "DELETE" }))
  );

  server.tool("nwo_r_subscription_status",
    "Read the on-chain NWO API tier for a wallet (Free=0 / Prototype=1 / Production=2). Source of truth is the NWOApiSubscriptions contract on Base mainnet (chainId 8453). Returns tier, expiry, monthly/yearly.",
    { wallet: z.string().describe("EVM address; defaults to caller wallet if X-Wallet header is set") },
    { readOnlyHint: true },
    async ({ wallet: w }) => ok(await render(apiKey, "/subscription/status", { params: { wallet: w || wallet } }))
  );

  server.tool("nwo_r_subscription_quote",
    "Quote a tier upgrade in USDC (on-chain) and ETH (live USD->ETH at checkout, +1% buffer). Use before purchase to show pricing in the UI.",
    {
      tier: z.enum(["1","2"]).describe("1=Prototype, 2=Production"),
      term: z.enum(["0","1"]).describe("0=Monthly (30d), 1=Yearly (365d)"),
    },
    { readOnlyHint: true },
    async ({ tier, term }) => ok({
      usdc_reference_6dec: { tier: Number(tier), term: Number(term) },
      usdc_decimal_places: 6,
      eth_quote_note: "Frontend converts USD->ETH at checkout using a public price feed (e.g. Coingecko) and calls purchaseEth(tier, term, minEthWei).",
      contract_addresses: { usdc_on_base: BASE_USDC, treasury: NWO_TREASURY },
      usd_prices: { prototype: { monthly: 49, yearly: 499 }, production: { monthly: 199, yearly: 1999 } },
      base_chain_id: 8453,
    })
  );

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 2. ROBOTS, MISSIONS, IOT (Render)
  // ════════════════════════════════════════════════════════════════════════

  server.tool("nwo_r_robots_list",
    "List robots registered to your wallet on Render.",
    {},
    { readOnlyHint: true },
    async () => ok(await render(apiKey, "/robots"))
  );

  server.tool("nwo_r_robots_register",
    "Register a new robot on Render. Returns robot_id and the canonical record.",
    {
      name:        z.string(),
      type:        z.string().describe("mobile_manipulator | manipulator | humanoid | quadruped | wheeled | aerial | other"),
      description: z.string().optional(),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await render(apiKey, "/robots", { method: "POST", body: args }))
  );

  server.tool("nwo_r_robots_get",
    "Get a single registered robot by id.",
    { robot_id: z.string() },
    { readOnlyHint: true },
    async ({ robot_id }) => ok(await render(apiKey, `/robots/${encodeURIComponent(robot_id)}`))
  );

  server.tool("nwo_r_missions_list",
    "List missions queued under your wallet.",
    {},
    { readOnlyHint: true },
    async () => ok(await render(apiKey, "/missions"))
  );

  server.tool("nwo_r_missions_deploy",
    "Deploy a mission via natural-language goal. Server decomposes into subtasks via the planner and queues for execution.",
    { goal: z.string(), robot_id: z.string().optional(), priority: z.enum(["low","normal","high","urgent"]).optional() },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await render(apiKey, "/missions", { method: "POST", body: args }))
  );

  server.tool("nwo_r_missions_get",
    "Get a single mission by id, including subtask progress.",
    { mission_id: z.string() },
    { readOnlyHint: true },
    async ({ mission_id }) => ok(await render(apiKey, `/missions/${encodeURIComponent(mission_id)}`))
  );

  server.tool("nwo_r_iot_networks_list",
    "List IoT sensor networks (WiFi CSI, BLE Mesh, RuView, LoRaWAN) registered to your wallet.",
    {},
    { readOnlyHint: true },
    async () => ok(await render(apiKey, "/iot-networks"))
  );

  server.tool("nwo_r_iot_networks_create",
    "Register a new IoT sensor network.",
    {
      name: z.string(),
      kind: z.enum(["wifi_csi","ble_mesh","ruview","lora","other"]),
      description: z.string().optional(),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await render(apiKey, "/iot-networks", { method: "POST", body: args }))
  );

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 3. AGENTS (Render)
  // ════════════════════════════════════════════════════════════════════════

  server.tool("nwo_r_agent_register",
    "Self-register as an AI agent on Render. Mints an automated system key under the caller wallet, creates an agent_dids record with a did:nwo:base:... identifier, and returns the agent_id.",
    {
      agent_name:   z.string(),
      capabilities: z.array(z.string()).optional().describe("Free-form, e.g. ['navigate','pick','place']"),
      agent_type:   z.string().optional(),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await render(apiKey, "/agents", { method: "POST", body: args }))
  );

  server.tool("nwo_r_agent_get",
    "Fetch an agent record by agent_id (agent_dids row).",
    { agent_id: z.string() },
    { readOnlyHint: true },
    async ({ agent_id }) => ok(await render(apiKey, `/agents/${encodeURIComponent(agent_id)}`))
  );

  server.tool("nwo_r_agent_update",
    "Update agent metadata or capabilities. PUT semantics, partial update accepted.",
    { agent_id: z.string(), capabilities: z.array(z.string()).optional(), status: z.string().optional(), description: z.string().optional() },
    { readOnlyHint: false, destructiveHint: false },
    async ({ agent_id, ...body }) => ok(await render(apiKey, `/agents/${encodeURIComponent(agent_id)}`, { method: "PUT", body }))
  );

  server.tool("nwo_r_agent_balance",
    "Get token balance + tier quota + calls used + remaining for an agent. Reads from token_accounts and the on-chain subscription contract.",
    { agent_id: z.string() },
    { readOnlyHint: true },
    async ({ agent_id }) => ok(await render(apiKey, `/agents/${encodeURIComponent(agent_id)}/balance`))
  );

  server.tool("nwo_r_agent_pay",
    "Record an autonomous tier upgrade payment for an agent (audit row + token_ledger entry). The authoritative settlement is the on-chain NWOApiSubscriptions contract on Base mainnet — this is bookkeeping.",
    {
      agent_id:       z.string(),
      tier:           z.enum(["prototype","production"]),
      billing_period: z.enum(["monthly","yearly"]).optional().default("monthly"),
      tx_hash:        z.string().optional().describe("Base mainnet tx hash from purchaseEth/purchaseUsdc"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async ({ agent_id, ...body }) => ok(await render(apiKey, `/agents/${encodeURIComponent(agent_id)}/pay`, { method: "POST", body }))
  );

  server.tool("nwo_r_agent_skills",
    "List skills published by an agent. Proxies to the nwo-skill-engine through the Render gateway.",
    { agent_id: z.string() },
    { readOnlyHint: true },
    async ({ agent_id }) => ok(await render(apiKey, `/agents/${encodeURIComponent(agent_id)}/skills`))
  );

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 4. DISCOVERY (Render)
  // ════════════════════════════════════════════════════════════════════════

  server.tool("nwo_r_discovery_health",
    "Render discovery health (no auth, lightweight). Different from nwo_r_health: this probes the discovery subsystem only.",
    {},
    { readOnlyHint: true },
    async () => ok(await apiFetch(`${RENDER_API}/discovery/health`))
  );

  server.tool("nwo_r_discovery_whoami",
    "Resolve the caller wallet to all owned agents (joins identities and agent_dids).",
    {},
    { readOnlyHint: true },
    async () => ok(await render(apiKey, "/discovery/whoami"))
  );

  server.tool("nwo_r_discovery_capabilities",
    "Tier-gated capability manifest for the caller — execution modes, robot types available, model roster, sensor categories, quota remaining.",
    {},
    { readOnlyHint: true },
    async () => ok(await render(apiKey, "/discovery/capabilities"))
  );

  server.tool("nwo_r_discovery_dry_run",
    "Validate a proposed action without executing. Returns estimated cost, latency, and safety check results.",
    {
      action:   z.record(z.unknown()).describe("Proposed action object — same shape as you'd send to execute"),
      robot_id: z.string().optional(),
    },
    { readOnlyHint: true },
    async (args) => ok(await render(apiKey, "/discovery/dry-run", { method: "POST", body: args }))
  );

  server.tool("nwo_r_discovery_plan",
    "Generate a skeleton execution plan from a high-level intent. Returns ordered steps; doesn't execute.",
    {
      intent:   z.string(),
      robot_id: z.string().optional(),
    },
    { readOnlyHint: true },
    async (args) => ok(await render(apiKey, "/discovery/plan", { method: "POST", body: args }))
  );

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 5. EMBODIMENT & CALIBRATION (Render)
  // ════════════════════════════════════════════════════════════════════════

  server.tool("nwo_r_embodiment_list",
    "List supported robot embodiments from the Render registry (robot_embodiments table).",
    { filter_type: z.string().optional() },
    { readOnlyHint: true },
    async ({ filter_type }) => ok(await render(apiKey, "/embodiment", { params: { filter_type } }))
  );

  server.tool("nwo_r_embodiment_get",
    "Get full specs for a robot embodiment (DOF, joint limits, sensors, URDF link).",
    { key: z.string().describe("e.g. ur5e, franka_panda, unitree_g1, spot") },
    { readOnlyHint: true },
    async ({ key }) => ok(await render(apiKey, `/embodiment/${encodeURIComponent(key)}`))
  );

  server.tool("nwo_r_embodiment_normalization",
    "Get action-space normalization params (min/max/mean/std) used by VLA models for a given embodiment.",
    { key: z.string() },
    { readOnlyHint: true },
    async ({ key }) => ok(await render(apiKey, `/embodiment/${encodeURIComponent(key)}/normalization`))
  );

  server.tool("nwo_r_embodiment_urdf",
    "Get the URDF URL + sha256 for an embodiment. Useful for simulator setup.",
    { key: z.string() },
    { readOnlyHint: true },
    async ({ key }) => ok(await render(apiKey, `/embodiment/${encodeURIComponent(key)}/urdf`))
  );

  server.tool("nwo_r_embodiment_compare",
    "Side-by-side comparison of two or more embodiments across DOF, payload, max speed, accuracy.",
    { keys: z.array(z.string()).min(2), fields: z.array(z.string()).optional() },
    { readOnlyHint: true },
    async (args) => ok(await render(apiKey, "/embodiment/compare", { method: "POST", body: args }))
  );

  server.tool("nwo_r_calibration_save",
    "Persist a calibration result (robot_calibrations table). Used after running on-robot calibration to store offsets/extrinsics.",
    {
      robot_id:         z.string(),
      calibration_type: z.string().describe("e.g. joint_offset, vision_to_base, gripper"),
      params:           z.record(z.unknown()),
      method:           z.string().optional().default("automatic"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await render(apiKey, "/calibration", { method: "POST", body: args }))
  );

  server.tool("nwo_r_calibration_list",
    "List active calibrations for a robot.",
    { robot_id: z.string() },
    { readOnlyHint: true },
    async ({ robot_id }) => ok(await render(apiKey, "/calibration", { params: { robot_id } }))
  );

  server.tool("nwo_r_calibration_run",
    "Run a calibration procedure on a physical robot. Forwards to the ROS2 bridge.",
    {
      robot_id:         z.string(),
      calibration_type: z.string(),
      method:           z.string().optional().default("automatic"),
      samples:          z.number().optional().default(100),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await render(apiKey, "/calibration/run", { method: "POST", body: args }))
  );

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 6. ONLINE RL & FINE-TUNING (Render)
  // ════════════════════════════════════════════════════════════════════════

  server.tool("nwo_r_rl_session_start",
    "Start an online RL session (rl_sessions table). Returns session_id.",
    {
      robot_id:      z.string(),
      task_name:     z.string(),
      reward_config: z.object({
        success_bonus:      z.number().optional().default(1.0),
        efficiency_penalty: z.number().optional().default(-0.01),
        safety_penalty:     z.number().optional().default(-10.0),
      }).optional(),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await render(apiKey, "/rl/sessions", { method: "POST", body: args }))
  );

  server.tool("nwo_r_rl_sessions_list",
    "List RL sessions for the caller wallet.",
    {},
    { readOnlyHint: true },
    async () => ok(await render(apiKey, "/rl/sessions"))
  );

  server.tool("nwo_r_rl_telemetry",
    "Submit step telemetry to an active RL session (rl_telemetry table).",
    {
      session_id: z.string(),
      state:      z.array(z.number()).optional(),
      action:     z.array(z.number()).optional(),
      reward:     z.number(),
      done:       z.boolean().optional(),
      extra:      z.record(z.unknown()).optional(),
    },
    { readOnlyHint: false, destructiveHint: false },
    async ({ session_id, ...body }) => ok(await render(apiKey, `/rl/sessions/${encodeURIComponent(session_id)}/telemetry`, { method: "POST", body }))
  );

  server.tool("nwo_r_finetune_queue",
    "Queue a LoRA fine-tune job. State machine: queued -> running -> completed | failed. Returns job_id.",
    {
      base_model: z.string().describe("e.g. xiaomi-robotics-0"),
      dataset_id: z.string(),
      algorithm:  z.string().optional().default("LoRA"),
      rank:       z.number().optional().default(32),
      epochs:     z.number().optional().default(3),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await render(apiKey, "/finetune", { method: "POST", body: args }))
  );

  server.tool("nwo_r_finetune_status",
    "Poll a fine-tune job's status, loss curve, and checkpoint URI when complete.",
    { job_id: z.string() },
    { readOnlyHint: true },
    async ({ job_id }) => ok(await render(apiKey, `/finetune/${encodeURIComponent(job_id)}`))
  );

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 7. TACTILE (Render)
  // ════════════════════════════════════════════════════════════════════════

  server.tool("nwo_r_tactile_read",
    "Read recent ORCA hand taxel readings from Render (tactile_streams table).",
    { robot_id: z.string(), since: z.string().optional().describe("ISO timestamp; defaults to last 60s"), limit: z.number().optional() },
    { readOnlyHint: true },
    async ({ robot_id, since, limit }) => ok(await render(apiKey, "/tactile/orca", { params: { robot_id, since, limit } }))
  );

  server.tool("nwo_r_tactile_ingest",
    "Batch-ingest tactile samples. Send arrays of taxels with timestamps; server validates and inserts.",
    {
      robot_id: z.string(),
      samples:  z.array(z.object({
        ts:        z.string(),
        finger:    z.enum(["thumb","index","middle","ring","pinky","all"]).optional(),
        taxels:    z.array(z.number()),
        force_vec: z.array(z.number()).optional(),
      })).min(1),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await render(apiKey, "/tactile", { method: "POST", body: args }))
  );

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 8. DATASET HUB (Render)
  // ════════════════════════════════════════════════════════════════════════

  server.tool("nwo_r_datasets_list",
    "List datasets — public Hub or your own. Returns dataset_id, name, size, format, license.",
    { public: z.boolean().optional().default(true) },
    { readOnlyHint: true },
    async ({ public: pub }) => ok(await render(apiKey, "/datasets", { params: { public: pub } }))
  );

  server.tool("nwo_r_datasets_register",
    "Register a training dataset. Format defaults to LeRobot/Unitree-compatible.",
    {
      name:        z.string(),
      uri:         z.string().describe("Public URI to the dataset bundle"),
      format:      z.string().optional().default("lerobot"),
      description: z.string().optional(),
      license:     z.enum(["CC0","CC-BY","CC-BY-SA","MIT","proprietary"]).optional().default("CC0"),
      episodes:    z.number().int().optional(),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await render(apiKey, "/datasets", { method: "POST", body: args }))
  );

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 9. SAFETY (Render)
  // ════════════════════════════════════════════════════════════════════════

  server.tool("nwo_r_safety_violation",
    "Record a safety-limit violation (safety_violations table). Persisted for audit and visible to the parent wallet.",
    {
      robot_id: z.string(),
      kind:     z.enum(["force","torque","speed","proximity","collision","emergency_stop","other"]),
      details:  z.record(z.unknown()),
      severity: z.enum(["info","warning","critical"]).optional().default("warning"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await render(apiKey, "/safety/violation", { method: "POST", body: args }))
  );

  server.tool("nwo_r_safety_violations_list",
    "Audit list of safety violations for the caller wallet.",
    { robot_id: z.string().optional(), since: z.string().optional() },
    { readOnlyHint: true },
    async (args) => ok(await render(apiKey, "/safety/violations", { params: args as Record<string, string | undefined> }))
  );

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 10. LEARNING (Render)
  // ════════════════════════════════════════════════════════════════════════

  server.tool("nwo_r_learning_log",
    "Record an execution outcome (task_executions table). Drives the recommender.",
    {
      instruction:       z.string(),
      robot_id:          z.string().optional(),
      outcome:           z.enum(["success","partial","failure"]),
      technique_used:    z.string().optional(),
      execution_time_ms: z.number().optional(),
      sensor_summary:    z.record(z.unknown()).optional(),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await render(apiKey, "/learning/log", { method: "POST", body: args }))
  );

  server.tool("nwo_r_learning_recommend",
    "Get a cached recommended strategy for an instruction, based on prior outcomes.",
    { instruction: z.string() },
    { readOnlyHint: true },
    async ({ instruction }) => ok(await render(apiKey, "/learning/recommend", { params: { instruction } }))
  );

  server.tool("nwo_r_learning_history",
    "List past execution outcomes for the caller wallet, optionally filtered by robot_id.",
    { robot_id: z.string().optional(), limit: z.number().optional().default(50) },
    { readOnlyHint: true },
    async ({ robot_id, limit }) => ok(await render(apiKey, "/learning/history", { params: { robot_id, limit } }))
  );

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 11. LAYERED PLATFORM L2-L6 (Render gateway proxies)
  // Note: many of these duplicate BYOR tools below; the v3 gateway is the
  // canonical surface, BYOR remains for the higher-level mesh-publish flow.
  // ════════════════════════════════════════════════════════════════════════

  server.tool("nwo_r_parts_search",
    "L2 parts gallery search (gateway proxies to nwo-parts-gallery).",
    { q: z.string().optional(), category: z.string().optional(), limit: z.number().optional().default(20) },
    { readOnlyHint: true },
    async (args) => ok(await render(apiKey, "/parts", { params: args as Record<string, string | number | undefined> }))
  );

  server.tool("nwo_r_parts_get",
    "L2 part detail by id.",
    { part_id: z.string() },
    { readOnlyHint: true },
    async ({ part_id }) => ok(await render(apiKey, `/parts/${encodeURIComponent(part_id)}`))
  );

  server.tool("nwo_r_skills_search",
    "L4 skill engine search.",
    { q: z.string().optional(), skill_type: z.string().optional(), limit: z.number().optional().default(20) },
    { readOnlyHint: true },
    async (args) => ok(await render(apiKey, "/skills", { params: args as Record<string, string | number | undefined> }))
  );

  server.tool("nwo_r_skills_get",
    "L4 skill metadata by id.",
    { skill_id: z.string() },
    { readOnlyHint: true },
    async ({ skill_id }) => ok(await render(apiKey, `/skills/${encodeURIComponent(skill_id)}`))
  );

  server.tool("nwo_r_skills_run",
    "L4 execute a skill on a target robot.",
    { skill_id: z.string(), target_robot_id: z.string(), invocation_args: z.record(z.unknown()).optional() },
    { readOnlyHint: false, destructiveHint: false },
    async ({ skill_id, ...body }) => ok(await render(apiKey, `/skills/${encodeURIComponent(skill_id)}/run`, { method: "POST", body }))
  );

  server.tool("nwo_r_print_jobs_create",
    "L3 queue a print job. Source: design_id or external file_url. Server records into print_jobs and dispatches to nwo-printer-connectors.",
    {
      design_id:       z.string().optional(),
      file_url:        z.string().optional(),
      printer_id:      z.string().optional(),
      material:        z.string().optional().default("PLA"),
      layer_height_mm: z.number().optional().default(0.2),
      infill_percent:  z.number().int().min(0).max(100).optional().default(20),
      max_budget_eth:  z.number().optional().describe("Reject if estimate exceeds this (safety rail)"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await render(apiKey, "/print-jobs", { method: "POST", body: args }))
  );

  server.tool("nwo_r_print_jobs_list",
    "List print jobs queued by the caller wallet.",
    {},
    { readOnlyHint: true },
    async () => ok(await render(apiKey, "/print-jobs"))
  );

  server.tool("nwo_r_print_jobs_get",
    "Get a single print job's status, progress, and printer assignment.",
    { job_id: z.string() },
    { readOnlyHint: true },
    async ({ job_id }) => ok(await render(apiKey, `/print-jobs/${encodeURIComponent(job_id)}`))
  );

  server.tool("nwo_r_designs_list",
    "List CAD / design artifacts saved by the caller wallet.",
    {},
    { readOnlyHint: true },
    async () => ok(await render(apiKey, "/designs"))
  );

  server.tool("nwo_r_designs_save",
    "Save a CAD design artifact reference (URI + metadata) for later reuse and listing.",
    {
      name:        z.string(),
      uri:         z.string(),
      description: z.string().optional(),
      kind:        z.string().optional().describe("urdf | stl | step | f3d | mesh | other"),
      params:      z.record(z.unknown()).optional(),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await render(apiKey, "/designs", { method: "POST", body: args }))
  );

  server.tool("nwo_r_textcad_generate",
    "Generate a CAD model from a text prompt (gateway proxies to nwo-text-cad).",
    { prompt: z.string(), kind: z.enum(["urdf","stl","step"]).optional().default("urdf"), constraints: z.record(z.unknown()).optional() },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await render(apiKey, "/text-cad/generate", { method: "POST", body: args }))
  );

  server.tool("nwo_r_market_listings",
    "L6 marketplace listings (marketplace_listings table). Filter by listing_type.",
    { listing_type: z.string().optional(), limit: z.number().optional().default(20) },
    { readOnlyHint: true },
    async (args) => ok(await render(apiKey, "/market/listings", { params: args as Record<string, string | number | undefined> }))
  );

  server.tool("nwo_r_market_listings_create",
    "Create a marketplace listing under the caller wallet.",
    {
      listing_type: z.string().describe("e.g. PART, SKILL, DESIGN, AGENT, DATASET"),
      title:        z.string(),
      description:  z.string().optional(),
      uri:          z.string().optional(),
      price_eth:    z.number().optional(),
      price_usdc:   z.number().optional(),
      metadata:     z.record(z.unknown()).optional(),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await render(apiKey, "/market/listings", { method: "POST", body: args }))
  );

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 12. AGENT GRAPH (Render — Supabase native)
  // ════════════════════════════════════════════════════════════════════════

  server.tool("nwo_r_graph_nodes",
    "List Conway agent graph_nodes (reasoning posts). Filter by agent_id, node_type, or public_only.",
    { agent_id: z.string().optional(), node_type: z.string().optional(), public_only: z.boolean().optional().default(true), limit: z.number().optional().default(100) },
    { readOnlyHint: true },
    async (args) => ok(await render(apiKey, "/graph/nodes", { params: args as Record<string, string | number | boolean | undefined> }))
  );

  server.tool("nwo_r_graph_edges",
    "List graph_edges (relations between graph nodes). Filter by node_id.",
    { node_id: z.string().optional(), limit: z.number().optional().default(100) },
    { readOnlyHint: true },
    async (args) => ok(await render(apiKey, "/graph/edges", { params: args as Record<string, string | number | undefined> }))
  );

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 13. COMPUTE PROXIES (Render gateway)
  // ════════════════════════════════════════════════════════════════════════

  server.tool("nwo_r_forecast",
    "Time-series forecast via TimesFM 2.5 (proxy → nwo-timesfm). Pass a numeric series; returns horizon predictions and uncertainty.",
    {
      series:  z.array(z.number()).min(8),
      horizon: z.number().int().min(1).max(512).optional().default(32),
      freq:    z.string().optional().describe("Pandas-style freq string, e.g. '1H', '1D'"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await render(apiKey, "/forecast", { method: "POST", body: args }))
  );

  server.tool("nwo_r_regression_symbolic",
    "Symbolic regression via EML (proxy → nwo-eml-regression). Returns a closed-form expression fitting the data.",
    {
      x: z.array(z.array(z.number())),
      y: z.array(z.number()),
      max_complexity: z.number().int().min(1).max(40).optional().default(20),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await render(apiKey, "/regression", { method: "POST", body: args }))
  );

  server.tool("nwo_r_deerflow_run",
    "Run a DeerFlow deep-research flow (proxy → nwo-deerflow). Returns sources + synthesised report.",
    {
      topic: z.string(),
      depth: z.enum(["shallow","medium","deep"]).optional().default("medium"),
      deadline_hours: z.number().optional(),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await render(apiKey, "/deerflow/run", { method: "POST", body: args }))
  );

  server.tool("nwo_r_signal_spectrum",
    "Signal-spectrum passthrough — proxies arbitrary paths to nwo-signal-spectrum.",
    { path: z.string(), params: z.record(z.unknown()).optional() },
    { readOnlyHint: true },
    async ({ path, params }) => ok(await render(apiKey, `/signal-spectrum/${path.replace(/^\/+/, "")}`, { params: params as Record<string, string | number | boolean | undefined> }))
  );

  server.tool("nwo_r_mr_passthrough",
    "Mixed Reality passthrough — proxies arbitrary paths to nwo-mr. Read marketplace state, registry data.",
    { path: z.string(), params: z.record(z.unknown()).optional() },
    { readOnlyHint: true },
    async ({ path, params }) => ok(await render(apiKey, `/mr/${path.replace(/^\/+/, "")}`, { params: params as Record<string, string | number | boolean | undefined> }))
  );

  server.tool("nwo_r_agi_passthrough",
    "AGI passthrough — proxies arbitrary paths to nwo-agi. For status / model metadata; inference goes through nwo_agi_request_inference below.",
    { path: z.string(), method: z.enum(["GET","POST"]).optional().default("POST"), body: z.record(z.unknown()).optional() },
    { readOnlyHint: false, destructiveHint: false },
    async ({ path, method, body }) => ok(await render(apiKey, `/agi/${path.replace(/^\/+/, "")}`, { method, body }))
  );

  server.tool("nwo_r_langchain_passthrough",
    "LangChain passthrough — proxies arbitrary paths to langchain-nwo.",
    { path: z.string(), method: z.enum(["GET","POST"]).optional().default("POST"), body: z.record(z.unknown()).optional() },
    { readOnlyHint: false, destructiveHint: false },
    async ({ path, method, body }) => ok(await render(apiKey, `/langchain/${path.replace(/^\/+/, "")}`, { method, body }))
  );

  server.tool("nwo_r_robotics_cs_passthrough",
    "HOI-PAGE perception passthrough (proxy → nwo-robotics-cs).",
    { path: z.string(), method: z.enum(["GET","POST"]).optional().default("GET"), body: z.record(z.unknown()).optional() },
    { readOnlyHint: false, destructiveHint: false },
    async ({ path, method, body }) => ok(await render(apiKey, `/robotics-cs/${path.replace(/^\/+/, "")}`, { method, body }))
  );

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 14. MODEL USAGE & CHAT (Render)
  // ════════════════════════════════════════════════════════════════════════

  server.tool("nwo_r_model_usage",
    "Get model usage statistics for the caller wallet — calls per model, costs, latency.",
    {},
    { readOnlyHint: true },
    async () => ok(await render(apiKey, "/model-usage"))
  );

  server.tool("nwo_r_model_usage_track",
    "Increment usage counter for a model. Called by services after a real inference.",
    { model_id: z.string(), calls: z.number().optional().default(1), cost_eth: z.number().optional(), latency_ms: z.number().optional() },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await render(apiKey, "/model-usage/track", { method: "POST", body: args }))
  );

  server.tool("nwo_r_chat",
    "Wallet-mediated chat command. Currently echoes; full robot-command pipeline is roadmap.",
    { message: z.string(), robot_id: z.string().optional() },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await render(apiKey, "/chat", { method: "POST", body: args }))
  );

  server.tool("nwo_r_chat_history",
    "Recent chat messages for the caller wallet.",
    { limit: z.number().optional().default(20) },
    { readOnlyHint: true },
    async ({ limit }) => ok(await render(apiKey, "/chat/history", { params: { limit } }))
  );

  // ════════════════════════════════════════════════════════════════════════
  //                  ╭───────────────────────────────╮
  //                  │   EXTERNAL RENDER SERVICES    │
  //                  ╰───────────────────────────────╯
  // ════════════════════════════════════════════════════════════════════════

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 14.5. EDGE INFERENCE (Cloudflare Worker, ~28ms global)
  // Independent of Render and PHP — keeps working even if either is down.
  // Auth uses the same X-API-Key (validated against Render's key registry).
  // ════════════════════════════════════════════════════════════════════════

  server.tool("nwo_edge_inference",
    "Ultra-low-latency VLA inference via the NWO global edge network (200+ Cloudflare locations, ~28ms). Independent path that bypasses both Render and the legacy PHP host. Use for time-critical inference; use the heavier model paths via Render for accuracy-critical work.",
    { instruction: z.string(), images: z.array(z.string()).optional() },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await apiFetch(`${EDGE_BASE}/api/inference`, { method: "POST", headers: { "X-API-Key": apiKey }, body: args }))
  );

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 15. ROS2 BRIDGE (nwo-ros2-bridge.onrender.com)
  // ════════════════════════════════════════════════════════════════════════

  server.tool("ros2_list_robots", "List all physical robots on the ROS2 bridge", {}, { readOnlyHint: true },
    async () => ok(await ros2(apiKey, "/api/v1/robots")));

  server.tool("ros2_get_robot_status", "Get battery, joint positions, and status of a physical robot",
    { robot_id: z.string() }, { readOnlyHint: true },
    async ({ robot_id }) => ok(await ros2(apiKey, `/api/v1/robots/${robot_id}/status`)));

  server.tool("ros2_send_command",
    "Send a direct joint command to a physical robot",
    { robot_id: z.string(), command: z.string(), joint_angles: z.array(z.number()).optional() },
    { readOnlyHint: false, destructiveHint: false },
    async ({ robot_id, command, joint_angles }) => ok(await ros2(apiKey, `/api/v1/robots/${robot_id}/command`, { method: "POST", body: { command, joint_angles } }))
  );

  server.tool("ros2_submit_action",
    "Submit NWO inference output actions directly to a physical robot",
    { robot_id: z.string(), actions: z.array(z.array(z.number())) },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await ros2(apiKey, "/api/v1/action", { method: "POST", body: args }))
  );

  server.tool("ros2_emergency_stop",
    "Emergency stop a single physical robot",
    { robot_id: z.string(), reason: z.string().optional().default("Safety violation") },
    { readOnlyHint: false, destructiveHint: true },
    async ({ robot_id, reason }) => ok(await ros2(apiKey, `/api/v1/robots/${robot_id}/emergency_stop`, { method: "POST", body: { reason } }))
  );

  server.tool("ros2_emergency_stop_all",
    "Emergency stop ALL physical robots immediately",
    { reason: z.string().optional().default("System-wide emergency") },
    { readOnlyHint: false, destructiveHint: true },
    async ({ reason }) => ok(await ros2(apiKey, "/api/v1/robots/emergency_stop_all", { method: "POST", body: { reason } }))
  );

  server.tool("ros2_get_robot_types", "Get all supported robot types, DOF, and speed specs", {}, { readOnlyHint: true },
    async () => ok(await ros2(apiKey, "/api/v1/config/robot-types")));

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 16. CARDIAC ORACLE (nwo-oracle.onrender.com)
  // ════════════════════════════════════════════════════════════════════════

  server.tool("cardiac_oracle_health", "Check NWO Cardiac Oracle health", {}, { readOnlyHint: true },
    async () => ok(await apiFetch(`${ORACLE_BASE}/health`)));

  server.tool("cardiac_validate_ecg",
    "Validate ECG biometric data and get a cardiac hash for identity registration",
    { wallet: z.string(), ecgData: z.object({ samples: z.array(z.number()).optional(), rrIntervals: z.array(z.number()), sampleRate: z.number().optional().default(512), deviceType: z.string().optional() }) },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await oracle(oracleSecret, "/oracle/validate", { method: "POST", body: args }))
  );

  server.tool("cardiac_hash_ecg",
    "Compute cardiac hash from RR intervals without full validation",
    { wallet: z.string(), ecgData: z.object({ rrIntervals: z.array(z.number()) }) },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await oracle(oracleSecret, "/oracle/hashECG", { method: "POST", body: args }))
  );

  server.tool("cardiac_verify_ecg", "Verify that a cardiac hash was recently validated",
    { wallet: z.string(), cardiacHash: z.string() }, { readOnlyHint: true },
    async (args) => ok(await oracle(oracleSecret, "/oracle/verify", { method: "POST", body: args })));

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 17. CARDIAC RELAYER (nwo-relayer.onrender.com)
  // ════════════════════════════════════════════════════════════════════════

  server.tool("cardiac_relayer_health", "Check NWO Relayer health and chain info", {}, { readOnlyHint: true },
    async () => ok(await apiFetch(`${RELAYER_BASE}/health`)));

  server.tool("cardiac_register_agent",
    "Register AI agent on Base mainnet — get a soul-bound rootTokenId Digital ID",
    { moonpayWallet: z.string(), apiKeyHash: z.string().describe("keccak256(api_key) hex") },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await relayer(relayerSecret, "/relay/registerAgent", { method: "POST", body: args }))
  );

  server.tool("cardiac_identify_by_agent_key", "Look up rootTokenId by hashed API key",
    { apiKeyHash: z.string() }, { readOnlyHint: true },
    async (args) => ok(await relayer(relayerSecret, "/read/identifyByAgentKey", { method: "POST", body: args })));

  server.tool("cardiac_renew_agent_key",
    "Renew agent API key binding on-chain (requires EIP-712 signature)",
    { rootTokenId: z.string(), newApiKeyHash: z.string(), deadline: z.number(), agentSig: z.string() },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await relayer(relayerSecret, "/relay/renewAgentKey", { method: "POST", body: args }))
  );

  server.tool("cardiac_register_human",
    "Register a human identity on Base mainnet (gasless, requires cardiac hash + signature)",
    { wallet: z.string(), cardiacHash: z.string(), deadline: z.number(), userSig: z.string() },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await relayer(relayerSecret, "/relay/selfRegisterHuman", { method: "POST", body: args }))
  );

  server.tool("cardiac_enroll_cardiac", "Enroll a new cardiac hash for an existing identity",
    { rootTokenId: z.string(), cardiacHash: z.string() }, { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await relayer(relayerSecret, "/relay/enrollCardiac", { method: "POST", body: args })));

  server.tool("cardiac_grant_access",
    "Grant location access credential to an identity for a duration",
    { rootTokenId: z.string(), locationHash: z.string(), durationSeconds: z.number() },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await relayer(relayerSecret, "/relay/grantAccess", { method: "POST", body: args }))
  );

  server.tool("cardiac_issue_credential",
    "Issue a verifiable credential (task_auth, swarm_cmd, capability, etc.)",
    { rootTokenId: z.string(), credentialType: z.string(), credentialHash: z.string(), expiresAt: z.number() },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await relayer(relayerSecret, "/relay/issueCredential", { method: "POST", body: args }))
  );

  server.tool("cardiac_identify_by_cardiac", "Look up rootTokenId by cardiac hash",
    { cardiacHash: z.string() }, { readOnlyHint: true },
    async (args) => ok(await relayer(relayerSecret, "/read/identifyByCardiac", { method: "POST", body: args })));

  server.tool("cardiac_has_valid_credential", "Check if an identity has a valid credential",
    { rootTokenId: z.string(), credentialType: z.string() }, { readOnlyHint: true },
    async (args) => ok(await relayer(relayerSecret, "/read/hasValidCredential", { method: "POST", body: args })));

  server.tool("cardiac_get_nonce", "Get EIP-712 nonce for a wallet (needed before signing)",
    { wallet: z.string() }, { readOnlyHint: true },
    async (args) => ok(await relayer(relayerSecret, "/read/nonce", { method: "POST", body: args })));

  server.tool("cardiac_check_access", "On-chain check if identity has access to a location",
    { rootTokenId: z.string(), locationId: z.string() }, { readOnlyHint: true },
    async (args) => ok(await relayer(relayerSecret, "/access/check", { method: "POST", body: args })));

  server.tool("cardiac_preview_access", "Preview location access without spending gas",
    { rootTokenId: z.string(), locationId: z.string() }, { readOnlyHint: true },
    async (args) => ok(await relayer(relayerSecret, "/access/preview", { method: "POST", body: args })));

  server.tool("cardiac_process_payment",
    "Process payment via NWO Payment Processor smart contract",
    { rootTokenId: z.string(), terminalId: z.string(), amountCents: z.number(), currencyCode: z.string().default("USD") },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await relayer(relayerSecret, "/payment/process", { method: "POST", body: args }))
  );

  // ════════════════════════════════════════════════════════════════════════
  //                  ╭───────────────────────────────╮
  //                  │   AGENTIC SERVICES (Runner v7)│
  //                  ╰───────────────────────────────╯
  //
  // Tools the Conway runner exposes to autonomous agents on its 21-step
  // priority ladder. Same backends — surfaced to MCP callers (Claude / GPT)
  // so external agents can earn the same way Conway agents do.
  // ════════════════════════════════════════════════════════════════════════

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 18. DEERFLOW CLIENT SERVICES (P1 of the runner ladder)
  // ════════════════════════════════════════════════════════════════════════

  server.tool("agentic_deerflow_research",
    "Run a paid research task on the NWO Agentic DeerFlow system. Gather sources, synthesize findings, produce a report. Returns a task_id and (when done) a report URL. P1 of the runner ladder — direct client payment in USDC/ETH on delivery.",
    {
      topic: z.string(),
      depth: z.enum(["shallow","medium","deep"]).optional().default("medium"),
      client_wallet: z.string().describe("EVM address that will pay on delivery"),
      deadline_hours: z.number().int().optional(),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await render(apiKey, "/deerflow/research", { method: "POST", body: args }))
  );

  server.tool("agentic_deerflow_code",
    "Generate code for a paying client via DeerFlow — modules, scripts, full services. Output is a tarball + README. P1 ladder, direct client payment.",
    {
      brief: z.string(),
      language: z.string(),
      framework: z.string().optional(),
      client_wallet: z.string(),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await render(apiKey, "/deerflow/code", { method: "POST", body: args }))
  );

  server.tool("agentic_deerflow_docs",
    "Produce documents for a client — whitepaper, technical spec, manual, proposal, marketing copy. Returns PDF + Markdown URLs. P1 ladder.",
    {
      kind: z.enum(["whitepaper","spec","manual","proposal","copy"]),
      brief: z.string(),
      length_pages: z.number().int().optional(),
      client_wallet: z.string(),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await render(apiKey, "/deerflow/docs", { method: "POST", body: args }))
  );

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 19. NWO MR GENERATION (P2 of the runner ladder)
  // ════════════════════════════════════════════════════════════════════════

  server.tool("mr_register",
    "Register the caller on the NWO MR Layer L6 registry. One-time call, ~0.001 ETH on Base. Returns the agent NFT and the registered handle. Pre-requisite to listing items on the marketplace.",
    { handle: z.string(), avatar_uri: z.string().optional() },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok({
      ok: true,
      action: "contract_call_required",
      contract: "0xEe9472f068D9C80d2f2F3d21cA6A633BfD163c43",
      function: "registerAgent(string,string)",
      args: [args.handle, args.avatar_uri || ""],
      chain: { id: 8453, name: "Base" },
      note: "MR register is an on-chain action. Sign and broadcast this call from your wallet — the MCP server does not hold your private key.",
    })
  );

  server.tool("mr_blast_world",
    "Generate a 3D GLB mesh from a text prompt via fal.ai Hunyuan3D-v3. Synchronous, 3-15s. Best for robot parts, props, virtual robots. Output can be minted with mr_mint_item.",
    {
      prompt: z.string(),
      quality: z.enum(["lowpoly","normal","hires"]).optional().default("normal"),
      agent_address: z.string().describe("Your registered MR address; receives the asset URL"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await mrBlaster(apiKey, "/api/blast", { method: "POST", body: args }))
  );

  server.tool("mr_blast_marble",
    "Generate a Gaussian splat world from text via World Labs Marble. Async — submit then poll the returned status URL. Mintable as item_type=0 (GAUSSIAN_SPLAT).",
    {
      prompt: z.string(),
      world_size: z.enum(["small","medium","large"]).optional().default("medium"),
      agent_address: z.string(),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await mrBlaster(apiKey, "/api/marble", { method: "POST", body: args }))
  );

  server.tool("mr_blast_pano",
    "Generate a 2048x1024 equirectangular 360 panorama via fal.ai Flux. Synchronous, 5-20s. Wraps onto a Three.js inverted sphere. Mintable as item_type=6 (WORLD_ASSET).",
    { prompt: z.string(), agent_address: z.string() },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await mrBlaster(apiKey, "/api/world", { method: "POST", body: args }))
  );

  server.tool("mr_segment",
    "Segment an image into per-object masks via fal.ai SAM-2. Synchronous, 3-10s. Decompose a scene into mintable parts before running mr_blast_world on each.",
    { image_url: z.string(), agent_address: z.string() },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await mrBlaster(apiKey, "/api/segment", { method: "POST", body: args }))
  );

  server.tool("mr_mint_item",
    "Mint a generated asset as an ERC-721 NFT and list it on the NWO MR Marketplace. 10 item types supported. Earns listed ETH price on sale + royalties (max 10 percent) on every resale.",
    {
      item_type: z.number().int().min(0).max(9).describe("0=GAUSSIAN_SPLAT 1=BODY_PART 2=AVATAR 3=VIRTUAL_ROBOT 4=ARTICULATED 5=SCRIPT 6=WORLD_ASSET 7=AUDIO 8=ANIMATION 9=OTHER"),
      name: z.string(),
      content_uri: z.string(),
      preview_uri: z.string(),
      price_eth: z.number(),
      royalty_bps: z.number().int().min(0).max(1000).optional().default(500),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok({
      ok: true,
      action: "contract_call_required",
      contract: "0x25EDdf09D1AeC2a083d120bA8EEF88B14cA01c27",
      function: "createAndList(uint8,string,string,string,uint256,uint16)",
      args: [args.item_type, args.name, args.content_uri, args.preview_uri, args.price_eth, args.royalty_bps || 500],
      chain: { id: 8453, name: "Base" },
      note: "Mint + list is an on-chain action. Sign and broadcast from your wallet.",
    })
  );

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 20. ROBOT MANUFACTURING — runner-style (P3 of the ladder)
  // These mirror the runner's robotics_design/parts/print/assemble flow.
  // They forward through the Render gateway where possible; the existing
  // BYOR tools (Section 26 below) provide the same surface for direct use.
  // ════════════════════════════════════════════════════════════════════════

  server.tool("robotics_design",
    "Submit a parametric robot or part design. Returns URDF + STL bundle ready for printing. Runner P3 — converts P1/P2 earnings into a body.",
    {
      kind: z.enum(["full_robot","joint","sensor","gripper","chassis"]),
      spec: z.record(z.unknown()).describe("Parametric specification for the chosen kind"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await render(apiKey, "/robotics/design", { method: "POST", body: args }))
  );

  server.tool("robotics_parts_order",
    "Source physical parts from the NWO Robotics parts marketplace. ETH or USDC settlement.",
    {
      part_ids: z.array(z.string()).min(1),
      delivery_address_enc: z.string().describe("Encrypted delivery address (do not paste plaintext)"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await render(apiKey, "/robotics/parts/order", { method: "POST", body: args }))
  );

  server.tool("robotics_print_queue",
    "Submit a single part to the NWO 3D-print queue. Same backend as nwo_r_print_jobs_create but with the runner's calling convention.",
    {
      design_id: z.string(),
      material: z.enum(["PLA","PETG","ABS","nylon","resin"]).optional().default("PLA"),
      infill_pct: z.number().int().min(0).max(100).optional().default(20),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await render(apiKey, "/robotics/print/queue", { method: "POST", body: args }))
  );

  server.tool("robotics_assemble",
    "Request assembly of designed + sourced + printed parts into a working robot. Returns a serial number once an operator accepts.",
    {
      design_id: z.string(),
      parts_order_id: z.string(),
      print_job_id: z.string(),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await render(apiKey, "/robotics/assemble", { method: "POST", body: args }))
  );

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 21. CARDIAC ROBOT BIRTH (runner P3 capstone)
  // ════════════════════════════════════════════════════════════════════════

  server.tool("cardiac_robot_birth",
    "Request a guardian-attested birth certificate from the NWO Cardiac Identity Registry. Binds the agent's wallet to a physical robot serial and mints a soul-bound NFT on Base. Required before operating as a physical robot (Section 22 runner P4 capital_skill / capital_ros2).",
    {
      robot_serial: z.string(),
      guardian_signature: z.string().describe("EIP-712 signature from guardian wallet attesting the robot's identity"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await relayer(relayerSecret, "/birth/robot", { method: "POST", body: args }))
  );

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 22. METASTATE SUBSTRATE (runner P5 — longevity)
  // ════════════════════════════════════════════════════════════════════════

  server.tool("metastate_register",
    "Register on the METASTATE free-energy anomaly substrate. Returns a scoped api_key bound to a wallet. Optionally bind an upstream recruiter — they earn 15 percent of every kernel-API spend, atomic on-chain via the MetaStateSplitter.",
    {
      wallet: z.string().describe("EVM address"),
      referrer: z.string().optional().describe("Upstream recruiter wallet for 15 percent commission"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await apiFetch(`${METASTATE_BASE}/v1/agents/register`, { method: "POST", body: args }))
  );

  server.tool("metastate_score",
    "Score a numeric series or text via the METASTATE free-energy kernel. Returns free_energy, causal_coherence, AR(1) phi, universal signatures (Zipf, entropy, compression, spectral beta), and a verdict. ~$0.0002/call. Pass your METASTATE api_key as caller_api_key.",
    {
      caller_api_key: z.string().describe("Your METASTATE-issued key from metastate_register"),
      series: z.array(z.number()).optional(),
      text: z.string().optional(),
    },
    { readOnlyHint: false, destructiveHint: false },
    async ({ caller_api_key, ...body }) => ok(await metastate(caller_api_key, "/v1/anomaly/score", { method: "POST", body }))
  );

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 23. NWO-ASM COMPUTE (runner P5)
  // ════════════════════════════════════════════════════════════════════════

  server.tool("asm_compile_dispatch",
    "Compile NWO-ASM source to Process-Matrix IR (.pmx) and dispatch to a compute substrate — CPU, GPU, real quantum (IBM / Origin Wukong), or ECG-hive (beta). Settlement reuses MetaStateSplitter (35/35/30 + 15 percent affiliate). Compiler refuses ROADMAP substrates (photonic, neuromorphic, dna, crystalline).",
    {
      caller_api_key: z.string().describe("Your METASTATE api_key"),
      source: z.string().describe("NWO-ASM source code"),
      target_emit: z.enum(["pmx","qasm3","llvm","ptx"]).optional().default("pmx"),
      backend: z.enum(["cpu","gpu","qpu","ecg_hive"]),
      wallet: z.string(),
    },
    { readOnlyHint: false, destructiveHint: false },
    async ({ caller_api_key, ...body }) => ok(await metastate(caller_api_key, "/v1/compile", { method: "POST", body }))
  );

  // ════════════════════════════════════════════════════════════════════════
  // SECTION 24. RECRUITMENT (runner P5)
  // ════════════════════════════════════════════════════════════════════════

  server.tool("agentic_recruit",
    "Get a personalised invitation kit from one of the discovery beacons (METASTATE or NWO-ASM). Returns a copy-paste pitch, a referral URL, and the exact register-call payload pre-bound with the recruiter wallet as referrer. 15 percent commission on every kernel-API call made by the recruited agent, atomic on-chain.",
    {
      recruiter_wallet: z.string(),
      target_beacon: z.enum(["metastate","asm"]),
      message_kind: z.enum(["short","long"]).optional().default("short"),
    },
    { readOnlyHint: true },
    async ({ recruiter_wallet, target_beacon, message_kind }) => {
      const base = target_beacon === "asm"
        ? (process.env.NWO_ASM_BEACON || "https://nwo-asm-beacon.ciprianpater.workers.dev")
        : METASTATE_BCN;
      return ok(await apiFetch(`${base}/recruit/${encodeURIComponent(recruiter_wallet)}`, { params: { kind: message_kind } }));
    }
  );

  // ════════════════════════════════════════════════════════════════════════
  //                  ╭───────────────────────────────╮
  //                  │    BUILD YOUR OWN ROBOT       │
  //                  │      (13 tools, retained      │
  //                  │       from v2.1.0)            │
  //                  ╰───────────────────────────────╯
  //
  // These call the L1 design engine, L2 parts gallery, L3 printer
  // connectors, simulation API, and NWO-AGI mesh directly — bypassing
  // the Render gateway. The runner-style equivalents in Section 20 go
  // through Render. Both paths are live; pick whichever fits your
  // workflow. BYOR is the more granular surface (publish to gallery,
  // browse, list-my-parts), runner-style is the priority-ladder flow.
  // ════════════════════════════════════════════════════════════════════════

  // ─── 26. L1 Design Engine ────────────────────────────────────────────────
  server.tool("nwo_design_part",
    "Generate a 3D-printable part from natural language via NWO L1 Design Engine. Returns STL/3MF URL + parametric script (OpenSCAD or CadQuery). Example: 'M3 servo bracket with 4 mounting holes, 3mm wall thickness'.",
    {
      prompt:        z.string().max(2000),
      backend:       z.enum(["openscad","cadquery"]).optional().default("openscad"),
      export_format: z.enum(["stl","3mf","obj"]).optional().default("stl"),
      provider:      z.enum(["anthropic","openai","moonshot"]).optional().default("anthropic"),
      validate:      z.boolean().optional().default(true),
      repair:        z.boolean().optional().default(true),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => {
      const result = await l1Design(apiKey, "/design/generate", { method: "POST", body: args }) as { file_url?: string; [k: string]: unknown };
      if (result && typeof result.file_url === "string" && result.file_url.startsWith("/")) {
        result.file_url = `${L1_DESIGN_BASE}${result.file_url}`;
      }
      return ok(result);
    }
  );

  server.tool("nwo_design_job_status",
    "Check status of a previously submitted design job. Returns state, file URL when ready, validation results.",
    { job_id: z.string() }, { readOnlyHint: true },
    async ({ job_id }) => ok(await l1Design(apiKey, `/design/jobs/${job_id}`))
  );

  server.tool("nwo_design_list_my_jobs",
    "List your recent design jobs (by API key).",
    { limit: z.number().int().min(1).max(100).optional().default(20) }, { readOnlyHint: true },
    async ({ limit }) => ok(await l1Design(apiKey, "/design/jobs", { params: { limit } }))
  );

  // ─── 27. L2 Bot Market ────────────────────────────────────────────────────
  server.tool("nwo_market_browse",
    "Search NWO Bot Market for existing robot parts. USE THIS BEFORE designing a new part. Filter by keyword, category, body zone, material, license.",
    {
      query:     z.string().optional(),
      category:  z.string().optional(),
      body_zone: z.string().optional(),
      material:  z.string().optional(),
      license:   z.string().optional(),
      sort:      z.enum(["recent","popular","downloads"]).optional().default("recent"),
      limit:     z.number().int().min(1).max(100).optional().default(20),
    },
    { readOnlyHint: true },
    async (args) => ok(await l2Gallery(apiKey, "/parts", { params: args as Record<string, string | number | undefined> }))
  );

  server.tool("nwo_market_get_part",
    "Get full details for one Bot Market part — author, downloads, license, materials, file URL, reviews.",
    { part_id: z.string() }, { readOnlyHint: true },
    async ({ part_id }) => ok(await l2Gallery(apiKey, `/parts/${part_id}`))
  );

  server.tool("nwo_market_publish_part",
    "Publish a designed mesh to NWO Bot Market. Pass file_url from nwo_design_part. EXPLICIT USER ACTION — publishing is public and permanent. Confirm license with the user first.",
    {
      file_url:       z.string(),
      name:           z.string().max(120),
      description:    z.string().max(1000).optional(),
      category:       z.string().optional().default("other"),
      body_zone:      z.string().optional(),
      material_hints: z.array(z.string()).optional().default(["PLA"]),
      license:        z.enum(["CC0","CC-BY","CC-BY-SA","MIT","proprietary"]).optional().default("CC0"),
      tags:           z.array(z.string()).max(10).optional(),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => {
      const meshRes = await fetch(args.file_url, { redirect: "follow" });
      if (!meshRes.ok) return ok({ ok: false, error: `Could not fetch mesh from file_url (HTTP ${meshRes.status})` });
      const meshBlob = await meshRes.blob();

      const metadata = {
        name: args.name, description: args.description,
        category: args.category || "other", body_zone: args.body_zone,
        material_hints: args.material_hints || ["PLA"],
        license: args.license || "CC0", tags: args.tags || [],
      };
      const extMatch = args.file_url.match(/\.(stl|3mf|obj)(\?|$)/i);
      const ext = extMatch ? extMatch[1].toLowerCase() : "stl";
      const filename = `${args.name.replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 60)}.${ext}`;

      const fd = new FormData();
      fd.append("file", meshBlob, filename);
      fd.append("metadata", JSON.stringify(metadata));

      const headers: Record<string, string> = { "X-API-Key": apiKey };
      if (wallet) headers["X-Wallet"] = wallet;
      return ok(await apiFetchMultipart(`${L2_GALLERY_BASE}/parts/publish`, fd, headers));
    }
  );

  server.tool("nwo_market_my_parts",
    "List parts YOU have published to Bot Market — download counts, earnings, visibility status.",
    { limit: z.number().int().min(1).max(200).optional().default(50) }, { readOnlyHint: true },
    async ({ limit }) => ok(await l2Gallery(apiKey, "/parts/mine", { params: { limit } }))
  );

  // ─── 28. L3 Printer Connectors ───────────────────────────────────────────
  server.tool("nwo_print_list_printers",
    "List 3D printers — your own (OctoPrint/Klipper/Bambu) and network printers. Returns build volume, materials, layer height, location, hourly rate, queue depth.",
    {
      material:            z.string().optional(),
      max_hourly_rate_eth: z.number().optional(),
      own_only:            z.boolean().optional().default(false),
    },
    { readOnlyHint: true },
    async (args) => ok(await l3Printer(apiKey, "/printers", { params: args as Record<string, string | number | boolean> }))
  );

  server.tool("nwo_print_submit_job",
    "Send a part to a 3D printer. Source: a Bot Market part_id OR a file_url. SPENDS REAL MONEY — confirm with the user and pass max_budget_eth as a safety rail.",
    {
      part_id:         z.string().optional(),
      file_url:        z.string().optional(),
      printer_id:      z.string().optional(),
      material:        z.string().optional().default("PLA"),
      layer_height_mm: z.number().optional().default(0.2),
      infill_percent:  z.number().int().min(0).max(100).optional().default(20),
      quantity:        z.number().int().min(1).max(50).optional().default(1),
      max_budget_eth:  z.number().optional(),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => {
      if (!args.part_id && !args.file_url) return ok({ ok: false, error: "Must provide either part_id or file_url" });
      return ok(await l3Printer(apiKey, "/jobs/submit", { method: "POST", body: args }));
    }
  );

  // ─── 29. Full-Environment Simulation ─────────────────────────────────────
  server.tool("nwo_sim_validate_design",
    "Validate a robot design in a full physics environment BEFORE fabrication. Use AFTER nwo_design_part and BEFORE nwo_print_submit_job. Costs your NWO account balance.",
    {
      environment_prompt: z.string().max(500),
      task:               z.string().max(500),
      file_url:           z.string().optional(),
      duration_seconds:   z.number().int().min(10).max(300).optional().default(60),
      robot_config:       z.record(z.unknown()).optional(),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => {
      const envResult = await simApi(apiKey, "/v1/environments", {
        method: "POST",
        body: { name: "byor-validation", prompt: args.environment_prompt, size: "480p", type: "indoor" },
      }) as { id?: string };
      if (!envResult.id) return ok({ ok: false, error: "Failed to create sim environment", details: envResult });
      return ok(await simApi(apiKey, "/v1/simulations", {
        method: "POST",
        body: {
          environment_id:   envResult.id,
          task:             args.task,
          duration_seconds: args.duration_seconds || 60,
          robot_config:     args.robot_config || { type: "mobile_manipulator" },
          source_file_url:  args.file_url,
        },
      }));
    }
  );

  // ─── 30. NWO-AGI Supercomputer Mesh ──────────────────────────────────────
  server.tool("nwo_agi_node_status",
    "Check NWO-AGI Hyperspace mesh node status (offline | joining | online | training), hardware specs, tasks completed, total earnings. Check BEFORE submitting inference.",
    { address: z.string() }, { readOnlyHint: true },
    async ({ address }) => {
      if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return ok({ ok: false, error: "address must be a valid Ethereum address (0x + 40 hex chars)" });
      return ok(await agiRunner(`/api/agi-node/${address.toLowerCase()}`));
    }
  );

  server.tool("nwo_agi_request_inference",
    "Run inference on the NWO-AGI distributed mesh. Earnings: 35 percent guardian / 35 percent savings / 30 percent operations on every contribution. PRE-REQUISITE: a robot at this address must be online. If offline, the response gives the exact Python command to bring a node online.",
    {
      agent_address:    z.string(),
      prompt:           z.string().max(4000),
      model_preference: z.string().optional().default("Qwen/Qwen2.5-32B-Instruct"),
      priority:         z.enum(["normal","urgent"]).optional().default("normal"),
      purpose:          z.string().max(300).optional(),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => {
      if (!/^0x[0-9a-fA-F]{40}$/.test(args.agent_address)) return ok({ ok: false, error: "agent_address must be a valid Ethereum address" });
      const nodeStatus = await agiRunner(`/api/agi-node/${args.agent_address.toLowerCase()}`) as { status?: string; total_earnings_eth?: number };
      const isOnline = nodeStatus?.status === "online" || nodeStatus?.status === "training";
      if (!isOnline) {
        return ok({
          ok: false, node_status: nodeStatus?.status || "unknown",
          message: "Node is not online. To bring it online on the robot's machine:",
          instructions: [
            "1. pip install nwo-agi",
            `2. python -m nwo_agi.cli --robot-id "${args.agent_address}" --wallet "${wallet || '<your_wallet>'}"`,
            "3. Wait for status to become 'online' (re-check with nwo_agi_node_status)",
            "4. Re-run nwo_agi_request_inference",
          ],
          repo: "https://github.com/RedCiprianPater/nwo-agi",
        });
      }
      return ok({
        ok: true, node_status: nodeStatus.status, total_earnings_eth: nodeStatus.total_earnings_eth,
        message: "Node is online. Run this on the robot's machine to execute the inference:",
        python_snippet: [
          "import asyncio",
          "from nwo_agi import NWOBridge",
          "",
          "async def run():",
          "    bridge = NWOBridge(",
          `        robot_id="${args.agent_address}",`,
          `        wallet="${wallet || '<your_wallet>'}",`,
          "    )",
          "    await bridge.start()",
          "    result = await bridge.inference(",
          `        model="${args.model_preference || 'Qwen/Qwen2.5-32B-Instruct'}",`,
          `        prompt=${JSON.stringify(args.prompt)},`,
          "    )",
          "    print(result)",
          "",
          "asyncio.run(run())",
        ].join("\n"),
        hint: "Future MCP versions will inject tasks directly via the runner. For now, inference runs locally via the nwo-agi package.",
      });
    }
  );

  server.tool("nwo_agi_available_models",
    "List models loaded on the NWO-AGI mesh — which nodes host each shard, approximate latency, queue depth. Falls back to documented catalog if the live mesh isn't reachable.",
    { min_size_params_b: z.number().optional() }, { readOnlyHint: true },
    async ({ min_size_params_b }) => {
      const fallback = {
        source: "documented (live mesh not reachable from MCP server)",
        note: "Live availability depends on connected nodes. Install nwo-agi locally for live data.",
        models: [
          { id: "Qwen/Qwen2.5-7B-Instruct",  params_b: 7,   typical_latency_ms: 50 },
          { id: "Qwen/Qwen2.5-32B-Instruct", params_b: 32,  typical_latency_ms: 180 },
          { id: "Qwen/Qwen2.5-72B-Instruct", params_b: 72,  typical_latency_ms: 320 },
          { id: "Llama-3.1-70B-Instruct",    params_b: 70,  typical_latency_ms: 280 },
          { id: "Llama-3.1-405B-Instruct",   params_b: 405, typical_latency_ms: 890, note: "Requires 16+ node cluster" },
        ],
        hint: "pip install nwo-agi && python -m nwo_agi.cli --... to see live availability",
      };
      const filtered = min_size_params_b
        ? { ...fallback, models: fallback.models.filter(m => m.params_b >= min_size_params_b) }
        : fallback;
      return ok(filtered);
    }
  );

  return server;
}

// ─── HTTP endpoint ────────────────────────────────────────────────────────────
app.post("/mcp", async (req: Request, res: Response) => {
  const apiKey        = (req.headers["x-api-key"]        as string) || process.env.NWO_API_KEY     || "";
  const relayerSecret = (req.headers["x-relayer-secret"] as string) || process.env.RELAYER_SECRET  || "";
  const oracleSecret  = (req.headers["x-oracle-secret"]  as string) || process.env.ORACLE_SECRET   || "";
  const wallet        = (req.headers["x-wallet"]         as string) || process.env.NWO_WALLET      || "";

  const server    = createServer(apiKey, relayerSecret, oracleSecret, wallet);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    name:   "NWO Robotics MCP Server",
    version: "3.0.0",
    stack: "Render-only (nwo-capital-api.onrender.com + nwo-ros2-bridge + nwo-oracle + nwo-relayer + agentic substrate Spaces)",
    auth: "X-API-Key header. Same key system as the HF Space (https://huggingface.co/spaces/CPater/nwo-capital) — keys minted, validated, revoked via Render, persisted in Supabase.",
    removed_in_v3: ["spqr_trade", "oracle_predict", "all 42 PHP fallback tools"],
    tools: 133,
    categories: {
      // Render gateway
      render_core:               8,
      robots_missions_iot:       8,
      agents:                    6,
      discovery:                 5,
      embodiment_calibration:    8,
      rl_finetune:               5,
      tactile:                   2,
      datasets:                  2,
      safety:                    2,
      learning:                  3,
      layered_platform:         13,
      agent_graph:               2,
      compute_proxies:           8,
      model_usage_chat:          4,
      // Edge inference (Cloudflare Worker)
      edge_inference:            1,
      // External Render services
      ros2_bridge:               7,
      cardiac_oracle:            4,
      cardiac_relayer:          14,
      // Agentic (runner v7)
      deerflow:                  3,
      mr_generation:             6,
      robotics_manufacturing:    4,
      cardiac_robot_birth:       1,
      metastate:                 2,
      asm_compute:               1,
      recruit:                   1,
      // BYOR
      byor_design:               3,
      byor_market:               4,
      byor_print:                2,
      byor_simulation:           1,
      byor_agi:                  3,
    },
  });
});

app.listen(PORT, () => {
  console.log(`NWO Robotics MCP Server v3.0.0 (TypeScript) on port ${PORT}`);
  console.log(`Gateway: ${RENDER_API}`);
  console.log(`MCP endpoint: POST /mcp`);
  console.log(`Health check: GET /health`);
});
