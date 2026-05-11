import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { z } from "zod";
import "dotenv/config";

// ─── Base URLs ────────────────────────────────────────────────────────────────
const NWO_BASE        = "https://nwo.capital/webapp";
const ROS2_BASE       = "https://nwo-ros2-bridge.onrender.com";
const EDGE_BASE       = "https://nwo-robotics-api-edge.ciprianpater.workers.dev";
const ORACLE_BASE     = "https://nwo-oracle.onrender.com";
const RELAYER_BASE    = "https://nwo-relayer.onrender.com";
// ─── Build-Your-Own-Robot service URLs ────────────────────────────────────────
const L1_DESIGN_BASE  = process.env.NWO_L1_DESIGN_URL  || "https://nwo-design-engine.onrender.com";
const L2_GALLERY_BASE = process.env.NWO_L2_GALLERY_URL || "https://nwo-parts-gallery.onrender.com";
const L3_PRINTER_BASE = process.env.NWO_L3_PRINTER_URL || "https://nwo-printer-connectors.onrender.com";
const SIM_API_BASE    = process.env.NWO_SIM_API_URL    || "https://nwo-simulation-api.onrender.com";
const AGI_RUNNER_BASE = process.env.NWO_AGI_RUNNER_URL || "https://nwo.ciprianpater.workers.dev";

const PORT = Number(process.env.PORT) || 3000;

// ─── Express setup ────────────────────────────────────────────────────────────
const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

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

// Multipart upload helper — used by nwo_market_publish_part to forward a mesh
// from a source URL into Bot Market. Does NOT set Content-Type; fetch sets it
// with the correct multipart boundary.
async function apiFetchMultipart(
  url: string,
  formData: FormData,
  headers: Record<string, string> = {},
): Promise<unknown> {
  const res = await fetch(url, { method: "POST", headers, body: formData });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text, status: res.status }; }
}

const nwo = (key: string, path: string, o: FetchOptions = {}) =>
  apiFetch(`${NWO_BASE}${path}`, { ...o, headers: { "X-API-Key": key, ...(o.headers ?? {}) } });

const ros2 = (key: string, path: string, o: FetchOptions = {}) =>
  apiFetch(`${ROS2_BASE}${path}`, { ...o, headers: { "X-API-Key": key, ...(o.headers ?? {}) } });

const relayer = (secret: string, path: string, o: FetchOptions = {}) =>
  apiFetch(`${RELAYER_BASE}${path}`, { ...o, headers: { "X-Relayer-Secret": secret, ...(o.headers ?? {}) } });

const oracle = (secret: string, path: string, o: FetchOptions = {}) =>
  apiFetch(`${ORACLE_BASE}${path}`, { ...o, headers: { "X-Oracle-Secret": secret, ...(o.headers ?? {}) } });

// ─── Build-Your-Own-Robot helpers ─────────────────────────────────────────────
const l1Design = (key: string, path: string, o: FetchOptions = {}) =>
  apiFetch(`${L1_DESIGN_BASE}${path}`, { ...o, headers: { "X-API-Key": key, ...(o.headers ?? {}) } });

const l2Gallery = (key: string, path: string, o: FetchOptions = {}) =>
  apiFetch(`${L2_GALLERY_BASE}${path}`, { ...o, headers: { "X-API-Key": key, ...(o.headers ?? {}) } });

const l3Printer = (key: string, path: string, o: FetchOptions = {}) =>
  apiFetch(`${L3_PRINTER_BASE}${path}`, { ...o, headers: { "X-API-Key": key, ...(o.headers ?? {}) } });

const simApi = (key: string, path: string, o: FetchOptions = {}) =>
  apiFetch(`${SIM_API_BASE}${path}`, { ...o, headers: { "X-API-Key": key, ...(o.headers ?? {}) } });

const agiRunner = (path: string, o: FetchOptions = {}) =>
  apiFetch(`${AGI_RUNNER_BASE}${path}`, { ...o });

const ok = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

// ─── MCP Server factory ───────────────────────────────────────────────────────
function createServer(apiKey: string, relayerSecret: string, oracleSecret: string, wallet: string): McpServer {
  const server = new McpServer({ name: "NWO Robotics", version: "2.1.0" });

  // ══════════════════════════════════════════════════════════════════════════
  // 1. INFERENCE & MODELS
  // ══════════════════════════════════════════════════════════════════════════

  server.tool("nwo_inference",
    "Run VLA (Vision-Language-Action) inference — control a robot with natural language",
    {
      instruction:      z.string(),
      images:           z.array(z.string()).optional(),
      model_id:         z.string().optional(),
      agent_id:         z.string().optional(),
      use_model_router: z.boolean().optional().describe("Auto-select best model"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await nwo(apiKey, "/api-robotics.php", { method: "POST", params: { action: "inference" }, body: args }))
  );

  server.tool("nwo_edge_inference",
    "Ultra-low-latency VLA inference via global edge network (~28ms)",
    { instruction: z.string(), images: z.array(z.string()).optional() },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await apiFetch(`${EDGE_BASE}/api/inference`, { method: "POST", body: args }))
  );

  server.tool("nwo_list_models",
    "List all available VLA models with capabilities and latency stats",
    {},
    { readOnlyHint: true },
    async () => ok(await nwo(apiKey, "/api-robotics.php", { params: { action: "list_models" } }))
  );

  server.tool("nwo_get_model_info",
    "Get performance stats and capabilities for a specific model",
    { model_id: z.string() },
    { readOnlyHint: true },
    async ({ model_id }) => ok(await nwo(apiKey, "/api-robotics.php", { params: { action: "get_model_info", model_id } }))
  );

  server.tool("nwo_get_streaming_config",
    "Get available WebSocket/SSE streaming frequencies and chunk size options",
    {},
    { readOnlyHint: true },
    async () => ok(await nwo(apiKey, "/api-robotics.php", { params: { action: "streaming_config" } }))
  );

  // ══════════════════════════════════════════════════════════════════════════
  // 2. ROBOT CONTROL & STATE
  // ══════════════════════════════════════════════════════════════════════════

  server.tool("nwo_query_robot_state",
    "Query joint angles, gripper state, position, and battery level",
    { agent_id: z.string(), include_image: z.boolean().optional() },
    { readOnlyHint: true },
    async ({ agent_id, include_image }) => ok(await nwo(apiKey, "/api-robotics.php", { params: { action: "query_state", agent_id, include_image } }))
  );

  server.tool("nwo_execute_actions",
    "Execute a sequence of low-level joint actions on a robot",
    {
      agent_id:     z.string(),
      actions:      z.array(z.array(z.number())),
      safety_check: z.boolean().optional().default(true),
      speed:        z.number().optional(),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await nwo(apiKey, "/api-robotics.php", { method: "POST", params: { action: "execute" }, body: args }))
  );

  server.tool("nwo_sensor_fusion",
    "Fuse multi-modal sensor data (camera, LiDAR, GPS, force) for robot decision-making",
    {
      instruction: z.string(),
      agent_id:    z.string().optional(),
      images:      z.array(z.string()).optional(),
      sensors: z.object({
        temperature: z.object({ value: z.number(), unit: z.string() }).optional(),
        proximity:   z.object({ distance: z.number(), unit: z.string() }).optional(),
        force:       z.record(z.number()).optional(),
        gps:         z.object({ lat: z.number(), lng: z.number() }).optional(),
        lidar:       z.record(z.unknown()).optional(),
      }).optional(),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await nwo(apiKey, "/api-robotics.php", { method: "POST", params: { action: "sensor_fusion" }, body: args }))
  );

  server.tool("nwo_robot_query",
    "Get status, battery, and current task of a robot",
    { agent_id: z.string() },
    { readOnlyHint: true },
    async ({ agent_id }) => ok(await nwo(apiKey, "/api-robotics.php", { method: "POST", params: { action: "robot_query" }, body: { agent_id } }))
  );

  server.tool("nwo_get_agent_status",
    "Get tasks completed and success rate for an agent",
    { agent_id: z.string() },
    { readOnlyHint: true },
    async ({ agent_id }) => ok(await nwo(apiKey, "/api-robotics.php", { method: "POST", params: { action: "get_agent_status" }, body: { agent_id } }))
  );

  server.tool("nwo_status_poll",
    "Poll the progress and status of an ongoing robot task",
    { task_id: z.string(), agent_id: z.string() },
    { readOnlyHint: true },
    async (args) => ok(await nwo(apiKey, "/api-robotics.php", { method: "POST", params: { action: "status_poll" }, body: args }))
  );

  // ══════════════════════════════════════════════════════════════════════════
  // 3. TASK PLANNING & LEARNING
  // ══════════════════════════════════════════════════════════════════════════

  server.tool("nwo_task_planner",
    "Decompose a complex goal into ordered subtasks with time estimates",
    { instruction: z.string(), agent_id: z.string().optional(), context: z.record(z.unknown()).optional() },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await nwo(apiKey, "/api-robotics.php", { method: "POST", params: { action: "task_planner" }, body: args }))
  );

  server.tool("nwo_execute_subtask",
    "Execute a specific numbered subtask from an existing plan",
    { plan_id: z.string(), subtask_order: z.number(), agent_id: z.string() },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await nwo(apiKey, "/api-robotics.php", { method: "POST", params: { action: "execute_subtask" }, body: args }))
  );

  server.tool("nwo_learning_recommend",
    "Get AI-recommended techniques and grip parameters based on past executions",
    { agent_id: z.string().optional(), task_description: z.string() },
    { readOnlyHint: true },
    async (args) => ok(await nwo(apiKey, "/api-robotics.php", { method: "POST", params: { action: "learning", subaction: "recommend" }, body: args }))
  );

  server.tool("nwo_learning_log",
    "Log a task execution for online learning and future recommendations",
    {
      agent_id:          z.string().optional(),
      task_id:           z.string().optional(),
      task_description:  z.string(),
      technique_used:    z.string(),
      success:           z.boolean(),
      execution_time_ms: z.number().optional(),
      sensor_data:       z.record(z.unknown()).optional(),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await nwo(apiKey, "/api-robotics.php", { method: "POST", params: { action: "learning", subaction: "log" }, body: args }))
  );

  // ══════════════════════════════════════════════════════════════════════════
  // 4. AGENT MANAGEMENT & REGISTRATION
  // ══════════════════════════════════════════════════════════════════════════

  server.tool("nwo_register_agent",
    "Self-register a new agent/robot and receive an API key and agent ID",
    {
      wallet_address: z.string().optional(),
      agent_name:     z.string(),
      agent_type:     z.string().optional(),
      capabilities:   z.array(z.string()).optional(),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await apiFetch(`${NWO_BASE}/api-agent-register.php`, { method: "POST", body: args }))
  );

  server.tool("nwo_register_robot",
    "Register a physical robot with the NWO robotics platform",
    { agent_id: z.string(), name: z.string(), type: z.string(), capabilities: z.array(z.string()).optional() },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await nwo(apiKey, "/api-robotics.php", { method: "POST", params: { action: "register_agent" }, body: args }))
  );

  server.tool("nwo_update_agent",
    "Update capabilities or status of an existing agent",
    { agent_id: z.string(), capabilities: z.array(z.string()).optional(), status: z.string().optional() },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await nwo(apiKey, "/api-robotics.php", { method: "PUT", params: { action: "update_agent" }, body: args }))
  );

  server.tool("nwo_get_agent",
    "Get details, type, status, and stats for a specific agent",
    { agent_id: z.string() },
    { readOnlyHint: true },
    async ({ agent_id }) => ok(await nwo(apiKey, "/api-robotics.php", { params: { action: "get_agent", agent_id } }))
  );

  server.tool("nwo_agent_pay",
    "Pay for a tier upgrade (ETH or credit card via MoonPay)",
    {
      agent_id:       z.string(),
      tier:           z.enum(["prototype", "production"]),
      billing_period: z.string().optional().default("monthly"),
      payment_method: z.string().optional(),
      tx_hash:        z.string().optional(),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await nwo(apiKey, "/api-agent-pay.php", { method: "POST", body: args }))
  );

  server.tool("nwo_agent_wallet",
    "Create a hosted MoonPay wallet for credit card funding",
    { agent_id: z.string() },
    { readOnlyHint: false, destructiveHint: false },
    async ({ agent_id }) => ok(await nwo(apiKey, "/api-agent-wallet.php", { method: "POST", body: { action: "create_hosted_wallet", agent_id } }))
  );

  server.tool("nwo_agent_balance",
    "Check quota usage, remaining calls, tier, and subscription expiry",
    {},
    { readOnlyHint: true },
    async () => ok(await nwo(apiKey, "/api-agent-balance.php"))
  );

  // ══════════════════════════════════════════════════════════════════════════
  // 5. AGENT DISCOVERY
  // ══════════════════════════════════════════════════════════════════════════

  server.tool("nwo_discovery_health",   "Check NWO API health", {}, { readOnlyHint: true },
    async () => ok(await nwo(apiKey, "/api-agent-discovery.php", { params: { action: "health" } })));

  server.tool("nwo_discovery_whoami",   "Get current agent identity and quota remaining", {}, { readOnlyHint: true },
    async () => ok(await nwo(apiKey, "/api-agent-discovery.php", { params: { action: "whoami" } })));

  server.tool("nwo_discovery_capabilities", "Discover all execution modes, robot types, models, and sensors available", {}, { readOnlyHint: true },
    async () => ok(await nwo(apiKey, "/api-agent-discovery.php", { params: { action: "capabilities" } })));

  server.tool("nwo_dry_run",
    "Validate task feasibility without executing — returns confidence, safety, and cost estimates",
    { instruction: z.string(), robot_id: z.string().optional(), execution_mode: z.enum(["mock","simulated","live"]).optional().default("mock") },
    { readOnlyHint: true },
    async (args) => ok(await nwo(apiKey, "/api-agent-discovery.php", { method: "POST", params: { action: "dry-run" }, body: args }))
  );

  server.tool("nwo_plan",
    "Generate a detailed multi-phase execution plan for a task",
    { instruction: z.string(), robot_id: z.string().optional(), execution_mode: z.enum(["mock","simulated","live"]).optional().default("mock") },
    { readOnlyHint: true },
    async (args) => ok(await nwo(apiKey, "/api-agent-discovery.php", { method: "POST", params: { action: "plan" }, body: args }))
  );

  // ══════════════════════════════════════════════════════════════════════════
  // 6. ROS2 BRIDGE
  // ══════════════════════════════════════════════════════════════════════════

  server.tool("ros2_list_robots",       "List all physical robots on the ROS2 bridge", {}, { readOnlyHint: true },
    async () => ok(await ros2(apiKey, "/api/v1/robots")));

  server.tool("ros2_get_robot_status",  "Get battery, joint positions, and status of a physical robot",
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

  server.tool("ros2_get_robot_types",   "Get all supported robot types, DOF, and speed specs", {}, { readOnlyHint: true },
    async () => ok(await ros2(apiKey, "/api/v1/config/robot-types")));

  // ══════════════════════════════════════════════════════════════════════════
  // 7. PHYSICS & SIMULATION
  // ══════════════════════════════════════════════════════════════════════════

  server.tool("nwo_simulate_trajectory",
    "Simulate a trajectory with physics — checks feasibility and collision",
    { agent_id: z.string().optional(), trajectory: z.array(z.array(z.number())), physics_params: z.record(z.unknown()).optional(), check_collision: z.boolean().optional().default(true) },
    { readOnlyHint: true },
    async (args) => ok(await nwo(apiKey, "/api-simulation.php", { method: "POST", params: { action: "simulate_trajectory" }, body: args }))
  );

  server.tool("nwo_check_collision",
    "Check if a trajectory collides with obstacles",
    { agent_id: z.string().optional(), trajectory: z.array(z.array(z.number())), environment: z.record(z.unknown()).optional() },
    { readOnlyHint: true },
    async (args) => ok(await nwo(apiKey, "/api-simulation.php", { method: "POST", params: { action: "check_collision" }, body: args }))
  );

  server.tool("nwo_estimate_torques",
    "Estimate joint torques for a trajectory given payload mass",
    { agent_id: z.string().optional(), trajectory: z.array(z.array(z.number())), payload_mass: z.number() },
    { readOnlyHint: true },
    async (args) => ok(await nwo(apiKey, "/api-simulation.php", { method: "POST", params: { action: "estimate_torques" }, body: args }))
  );

  server.tool("nwo_validate_grasp",
    "Validate that a grasp is stable given object shape, mass, and grip force",
    { agent_id: z.string().optional(), object_shape: z.string(), object_mass: z.number(), grip_force: z.number() },
    { readOnlyHint: true },
    async (args) => ok(await nwo(apiKey, "/api-simulation.php", { method: "POST", params: { action: "validate_grasp" }, body: args }))
  );

  server.tool("nwo_plan_motion",
    "Plan a collision-free motion path using MoveIt2",
    { agent_id: z.string().optional(), start_pose: z.array(z.number()), goal_pose: z.array(z.number()), planner: z.string().optional().default("RRTConnect"), avoid_collisions: z.boolean().optional().default(true) },
    { readOnlyHint: true },
    async (args) => ok(await nwo(apiKey, "/api-simulation.php", { method: "POST", params: { action: "plan_motion" }, body: args }))
  );

  server.tool("nwo_get_scene_library",  "List available simulation scenes", {}, { readOnlyHint: true },
    async () => ok(await nwo(apiKey, "/api-simulation.php", { params: { action: "get_scene_library" } })));

  server.tool("nwo_cosmos_generate_scene",
    "Generate synthetic MuJoCo training scenes using Cosmos 3",
    { prompt: z.string(), objects: z.array(z.string()).optional(), lighting: z.string().optional(), variations: z.number().optional().default(100) },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await nwo(apiKey, "/api-cosmos.php", { method: "POST", params: { action: "generate_scene" }, body: args }))
  );

  // ══════════════════════════════════════════════════════════════════════════
  // 8. EMBODIMENT & CALIBRATION
  // ══════════════════════════════════════════════════════════════════════════

  server.tool("nwo_embodiment_list",    "List robots in the embodiment registry",
    { filter_type: z.string().optional() }, { readOnlyHint: true },
    async ({ filter_type }) => ok(await nwo(apiKey, "/api-embodiment.php", { params: { action: "list", filter_type } })));

  server.tool("nwo_embodiment_detail",  "Get full specs for a robot type",
    { robot_type: z.string() }, { readOnlyHint: true },
    async ({ robot_type }) => ok(await nwo(apiKey, "/api-embodiment.php", { params: { action: "detail", robot_type } })));

  server.tool("nwo_embodiment_normalization", "Get joint normalization parameters",
    { robot_type: z.string() }, { readOnlyHint: true },
    async ({ robot_type }) => ok(await nwo(apiKey, "/api-embodiment.php", { params: { action: "normalization", robot_type } })));

  server.tool("nwo_embodiment_urdf",    "Download URDF model for a robot type",
    { robot_type: z.string() }, { readOnlyHint: true },
    async ({ robot_type }) => ok(await nwo(apiKey, "/api-embodiment.php", { params: { action: "urdf", robot_type } })));

  server.tool("nwo_embodiment_test_results", "Get benchmark results (LIBERO, CALVIN, SimplerEnv)",
    { robot_type: z.string() }, { readOnlyHint: true },
    async ({ robot_type }) => ok(await nwo(apiKey, "/api-embodiment.php", { params: { action: "test_results", robot_type } })));

  server.tool("nwo_embodiment_compare", "Compare two or more robot types side by side",
    { robot_types: z.array(z.string()).min(2), compare_fields: z.array(z.string()).optional() },
    { readOnlyHint: true },
    async (args) => ok(await nwo(apiKey, "/api-embodiment.php", { method: "POST", params: { action: "compare" }, body: args }))
  );

  server.tool("nwo_calibrate_confidence",
    "Calibrate raw model confidence scores to real success probabilities",
    { model_confidence: z.number(), model_id: z.string() },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await nwo(apiKey, "/api-calibration.php", { method: "POST", params: { action: "calibrate" }, body: args }))
  );

  server.tool("nwo_run_calibration",
    "Run automatic joint-offset calibration on a robot",
    { agent_id: z.string(), calibration_type: z.string().optional().default("joint_offset"), method: z.string().optional().default("automatic"), samples: z.number().optional().default(100) },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await nwo(apiKey, "/api-calibration.php", { method: "POST", params: { action: "run_calibration" }, body: args }))
  );

  // ══════════════════════════════════════════════════════════════════════════
  // 9. ONLINE RL & FINE-TUNING
  // ══════════════════════════════════════════════════════════════════════════

  server.tool("nwo_start_online_rl",
    "Start an online RL session with reward configuration",
    { agent_id: z.string(), task_name: z.string(), reward_config: z.record(z.number()).optional() },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await nwo(apiKey, "/api-online-rl.php", { method: "POST", params: { action: "start_online_rl" }, body: args }))
  );

  server.tool("nwo_submit_telemetry",
    "Submit state/action/reward telemetry to an active RL session",
    { rl_session_id: z.string(), state: z.array(z.number()).optional(), action: z.array(z.number()).optional(), reward: z.number(), telemetry: z.record(z.unknown()).optional() },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await nwo(apiKey, "/api-online-rl.php", { method: "POST", params: { action: "submit_telemetry" }, body: args }))
  );

  server.tool("nwo_create_fine_tune_dataset",
    "Create a fine-tuning dataset from execution history",
    { agent_id: z.string(), start_date: z.string(), end_date: z.string(), format: z.string().optional().default("json") },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await nwo(apiKey, "/api-fine-tune.php", { method: "POST", params: { action: "create_dataset" }, body: args }))
  );

  server.tool("nwo_start_fine_tune_job",
    "Start a LoRA fine-tuning job on a base VLA model",
    { dataset_id: z.string(), base_model: z.string().optional().default("xiaomi-robotics-0"), algorithm: z.string().optional().default("LoRA"), rank: z.number().optional().default(32) },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await nwo(apiKey, "/api-fine-tune.php", { method: "POST", params: { action: "start_job" }, body: args }))
  );

  // ══════════════════════════════════════════════════════════════════════════
  // 10. TACTILE SENSING
  // ══════════════════════════════════════════════════════════════════════════

  server.tool("nwo_orca_get_tactile",   "Read tactile sensor data from ORCA robotic hand fingers",
    { finger: z.enum(["index","thumb","middle","ring","pinky","all"]).optional().default("all"), sensor_type: z.enum(["raw_taxels","force_vector","slip_detection"]).optional().default("raw_taxels") },
    { readOnlyHint: true },
    async (args) => ok(await nwo(apiKey, "/api-orca.php", { params: { action: "get_tactile", ...args } })));

  server.tool("nwo_tactile_process",    "Process tactile data to determine grip quality and recommended force",
    { agent_id: z.string().optional(), tactile_data: z.record(z.unknown()) },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await nwo(apiKey, "/api-tactile.php", { method: "POST", params: { action: "process_input" }, body: args }))
  );

  server.tool("nwo_slip_detection",     "Detect slip probability from current vs previous tactile readings",
    { agent_id: z.string().optional(), current_tactile: z.array(z.number()), previous_tactile: z.array(z.number()) },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await nwo(apiKey, "/api-tactile.php", { method: "POST", params: { action: "slip_detection" }, body: args }))
  );

  // ══════════════════════════════════════════════════════════════════════════
  // 11. DATASET HUB
  // ══════════════════════════════════════════════════════════════════════════

  server.tool("nwo_list_unitree_datasets", "List Unitree G1 humanoid datasets (1.54M+ episodes, LeRobot-compatible)", {}, { readOnlyHint: true },
    async () => ok(await nwo(apiKey, "/api-unitree-datasets.php", { params: { action: "list" } })));

  // ══════════════════════════════════════════════════════════════════════════
  // 12. SWARM
  // ══════════════════════════════════════════════════════════════════════════

  server.tool("nwo_swarm_join",      "Add a robot to a multi-robot swarm", { swarm_id: z.string(), robot_id: z.string() }, { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await nwo(apiKey, "/api/swarm/join", { method: "POST", body: args })));

  server.tool("nwo_swarm_leave",     "Remove a robot from a swarm", { swarm_id: z.string(), robot_id: z.string() }, { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await nwo(apiKey, "/api/swarm/leave", { method: "POST", body: args })));

  server.tool("nwo_swarm_broadcast", "Broadcast a command to all robots in a swarm",
    { swarm_id: z.string(), message: z.record(z.unknown()) }, { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await nwo(apiKey, "/api/swarm/broadcast", { method: "POST", body: args })));

  // ══════════════════════════════════════════════════════════════════════════
  // 13-18. TASKS / CONFIG / BILLING / IOT / SAFETY / TEMPLATES / MODELS
  // ══════════════════════════════════════════════════════════════════════════

  server.tool("nwo_tasks_list",    "List current and recent tasks", {}, { readOnlyHint: true },
    async () => ok(await nwo(apiKey, "/api/tasks/list")));

  server.tool("nwo_tasks_history", "Get paginated task execution history",
    { limit: z.number().optional().default(20), offset: z.number().optional().default(0) }, { readOnlyHint: true },
    async ({ limit, offset }) => ok(await nwo(apiKey, "/api/tasks/history", { params: { limit, offset } })));

  server.tool("nwo_config_get",    "Get a configuration value", { key: z.string().optional() }, { readOnlyHint: true },
    async ({ key }) => ok(await nwo(apiKey, "/api/config/get", { params: { key } })));

  server.tool("nwo_config_set",    "Set a configuration key-value pair",
    { key: z.string(), value: z.unknown() }, { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await nwo(apiKey, "/api/config/set", { method: "POST", body: args })));

  server.tool("nwo_billing_usage",   "Check API usage and quota", {}, { readOnlyHint: true },
    async () => ok(await nwo(apiKey, "/api/billing/usage")));

  server.tool("nwo_billing_invoice", "Get invoices for a billing month",
    { month: z.string().optional() }, { readOnlyHint: true },
    async ({ month }) => ok(await nwo(apiKey, "/api/billing/invoice", { params: { month } })));

  server.tool("nwo_iot_command",     "Send a command to an IoT device",
    { device_id: z.string(), command: z.record(z.unknown()) }, { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await nwo(apiKey, "/api/iot/command", { method: "POST", body: args })));

  server.tool("nwo_iot_status",      "Get current status of an IoT device",
    { device_id: z.string() }, { readOnlyHint: true },
    async ({ device_id }) => ok(await nwo(apiKey, "/api/iot/status", { params: { device_id } })));

  server.tool("nwo_safety_check",    "Run safety validation on a proposed robot action",
    { action: z.record(z.unknown()), context: z.record(z.unknown()).optional() }, { readOnlyHint: true },
    async (args) => ok(await nwo(apiKey, "/api/safety/check", { method: "POST", body: args })));

  server.tool("nwo_safety_alert",    "Send a safety alert with severity level",
    { level: z.enum(["info","warning","critical"]), message: z.string() }, { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await nwo(apiKey, "/api/safety/alert", { method: "POST", body: args })));

  server.tool("nwo_template_list",   "List available robot control code templates", {}, { readOnlyHint: true },
    async () => ok(await nwo(apiKey, "/api/template/list")));

  server.tool("nwo_template_get",    "Get content of a code template",
    { template_id: z.string() }, { readOnlyHint: true },
    async ({ template_id }) => ok(await nwo(apiKey, "/api/template/get", { params: { template_id } })));

  server.tool("nwo_models_list",     "List all uploaded custom models", {}, { readOnlyHint: true },
    async () => ok(await nwo(apiKey, "/api/models/list")));

  server.tool("nwo_models_upload",   "Upload a custom model",
    { name: z.string(), file: z.string() }, { readOnlyHint: false, destructiveHint: false },
    async (args) => ok(await nwo(apiKey, "/api/models/upload", { method: "POST", body: args })));

  server.tool("nwo_models_download", "Download a model by ID",
    { model_id: z.string() }, { readOnlyHint: true },
    async ({ model_id }) => ok(await nwo(apiKey, "/api/models/download", { params: { model_id } })));

  server.tool("nwo_models_delete",   "Delete a custom model by ID",
    { model_id: z.string() }, { readOnlyHint: false, destructiveHint: true },
    async ({ model_id }) => ok(await nwo(apiKey, "/api/models/delete", { method: "DELETE", params: { model_id } })));

  // ══════════════════════════════════════════════════════════════════════════
  // 19. CARDIAC ORACLE
  // ══════════════════════════════════════════════════════════════════════════

  server.tool("cardiac_oracle_health",  "Check NWO Cardiac Oracle health", {}, { readOnlyHint: true },
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

  server.tool("cardiac_verify_ecg",     "Verify that a cardiac hash was recently validated",
    { wallet: z.string(), cardiacHash: z.string() }, { readOnlyHint: true },
    async (args) => ok(await oracle(oracleSecret, "/oracle/verify", { method: "POST", body: args })));

  // ══════════════════════════════════════════════════════════════════════════
  // 20. CARDIAC RELAYER (Agent Identity on Base Mainnet)
  // ══════════════════════════════════════════════════════════════════════════

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

  server.tool("cardiac_get_nonce",      "Get EIP-712 nonce for a wallet (needed before signing)",
    { wallet: z.string() }, { readOnlyHint: true },
    async (args) => ok(await relayer(relayerSecret, "/read/nonce", { method: "POST", body: args })));

  server.tool("cardiac_check_access",   "On-chain check if identity has access to a location",
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

  // ══════════════════════════════════════════════════════════════════════════
  //
  //                        BUILD YOUR OWN ROBOT
  //
  //   13 tools that give any external agent (Claude, GPT, custom) the same
  //   design / market / print / simulate / AGI capabilities that Conway
  //   agents get from the runner. No on-chain deployment required —
  //   authenticate with your NWO API key, optionally attach a wallet for
  //   earnings, and you can design, validate, fabricate, publish, and
  //   contribute compute to the NWO ecosystem.
  //
  //   See: https://github.com/RedCiprianPater/nwo-claude-plugin#build-your-own-robot
  //
  // ══════════════════════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════════════════════
  // 21. DESIGN — L1 Design Engine (3 tools)
  // ══════════════════════════════════════════════════════════════════════════

  server.tool("nwo_design_part",
    "Generate a 3D-printable part from natural language via NWO L1 Design Engine. Returns STL/3MF URL + parametric script (OpenSCAD or CadQuery). Examples: 'M3 servo bracket with 4 mounting holes, 3mm wall thickness', 'TPU gripper finger pad with cross-hatch grip pattern for 50-80mm cylinders'.",
    {
      prompt:        z.string().max(2000).describe("Natural-language description of the part"),
      backend:       z.enum(["openscad", "cadquery"]).optional().default("openscad"),
      export_format: z.enum(["stl", "3mf", "obj"]).optional().default("stl"),
      provider:      z.enum(["anthropic", "openai", "moonshot"]).optional().default("anthropic").describe("LLM provider for code generation"),
      validate:      z.boolean().optional().default(true).describe("Run mesh validation (manifold, watertight)"),
      repair:        z.boolean().optional().default(true).describe("Auto-repair non-manifold geometry"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => {
      const result = await l1Design(apiKey, "/design/generate", { method: "POST", body: args }) as any;
      if (result && typeof result.file_url === "string" && result.file_url.startsWith("/")) {
        result.file_url = `${L1_DESIGN_BASE}${result.file_url}`;
      }
      return ok(result);
    }
  );

  server.tool("nwo_design_job_status",
    "Check status of a previously submitted design job. Returns state, file URL when ready, validation results.",
    { job_id: z.string().describe("Job ID returned by nwo_design_part") },
    { readOnlyHint: true },
    async ({ job_id }) => ok(await l1Design(apiKey, `/design/jobs/${job_id}`))
  );

  server.tool("nwo_design_list_my_jobs",
    "List your recent design jobs (by API key). Useful for resuming work across sessions.",
    { limit: z.number().int().min(1).max(100).optional().default(20) },
    { readOnlyHint: true },
    async ({ limit }) => ok(await l1Design(apiKey, "/design/jobs", { params: { limit } }))
  );

  // ══════════════════════════════════════════════════════════════════════════
  // 22. BOT MARKET — L2 Parts Gallery (4 tools)
  // ══════════════════════════════════════════════════════════════════════════

  server.tool("nwo_market_browse",
    "Search NWO Bot Market for existing robot parts. USE THIS BEFORE designing a new part — chances are someone already designed what you need. Filter by keyword, category, body zone, material, license.",
    {
      query:     z.string().optional().describe("Free-text keyword (e.g. 'servo bracket M3')"),
      category:  z.string().optional().describe("gripper | bracket | sensor_mount | frame | drivetrain | electronics | wheel | joint | housing | manipulator | other"),
      body_zone: z.string().optional().describe("head | torso | arm | leg | hand | foot"),
      material:  z.string().optional().describe("PLA | PETG | TPU | ABS | ASA | nylon"),
      license:   z.string().optional().describe("CC0 | CC-BY | CC-BY-SA | MIT | proprietary"),
      sort:      z.enum(["recent", "popular", "downloads"]).optional().default("recent"),
      limit:     z.number().int().min(1).max(100).optional().default(20),
    },
    { readOnlyHint: true },
    async (args) => ok(await l2Gallery(apiKey, "/parts", { params: args as Record<string, string | number> }))
  );

  server.tool("nwo_market_get_part",
    "Get full details for one Bot Market part — author, downloads, license, materials, file URL, reviews.",
    { part_id: z.string().describe("Part ID from nwo_market_browse results") },
    { readOnlyHint: true },
    async ({ part_id }) => ok(await l2Gallery(apiKey, `/parts/${part_id}`))
  );

  server.tool("nwo_market_publish_part",
    "Publish a designed mesh to NWO Bot Market. Pass file_url from nwo_design_part (or any external mesh URL). Once published, the part is downloadable by other agents and printable via nwo_print_submit_job. If you provided a wallet, you earn credits/ETH on downloads (license-dependent). EXPLICIT USER ACTION — publishing is public and permanent. Confirm license with the user first.",
    {
      file_url:       z.string().describe("Source mesh URL (from nwo_design_part or external)"),
      name:           z.string().max(120).describe("Part name (e.g. 'M3 Servo Bracket v2')"),
      description:    z.string().max(1000).optional(),
      category:       z.string().optional().default("other").describe("gripper | bracket | sensor_mount | frame | drivetrain | electronics | wheel | joint | housing | manipulator | other"),
      body_zone:      z.string().optional().describe("head | torso | arm | leg | hand | foot"),
      material_hints: z.array(z.string()).optional().default(["PLA"]),
      license:        z.enum(["CC0", "CC-BY", "CC-BY-SA", "MIT", "proprietary"]).optional().default("CC0"),
      tags:           z.array(z.string()).max(10).optional(),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => {
      // Fetch the source mesh
      const meshRes = await fetch(args.file_url, { redirect: "follow" });
      if (!meshRes.ok) {
        return ok({ ok: false, error: `Could not fetch mesh from file_url (HTTP ${meshRes.status})` });
      }
      const meshBlob = await meshRes.blob();

      const metadata = {
        name:           args.name,
        description:    args.description,
        category:       args.category || "other",
        body_zone:      args.body_zone,
        material_hints: args.material_hints || ["PLA"],
        license:        args.license || "CC0",
        tags:           args.tags || [],
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
    "List parts YOU have published to Bot Market under your API key. Shows download counts, earnings, visibility status.",
    { limit: z.number().int().min(1).max(200).optional().default(50) },
    { readOnlyHint: true },
    async ({ limit }) => ok(await l2Gallery(apiKey, "/parts/mine", { params: { limit } }))
  );

  // ══════════════════════════════════════════════════════════════════════════
  // 23. 3D PRINT FULFILLMENT — L3 Printer Connectors (2 tools)
  // ══════════════════════════════════════════════════════════════════════════

  server.tool("nwo_print_list_printers",
    "List 3D printers available through NWO L3 Printer Connectors — both your own (registered via OctoPrint/Klipper/Bambu) and network printers opted in to fulfill jobs. Returns build volume, materials, layer height, location, hourly rate, queue depth.",
    {
      material:            z.string().optional().describe("Filter by supported material (PLA, PETG, TPU, ABS, ASA)"),
      max_hourly_rate_eth: z.number().optional().describe("Filter by max acceptable hourly cost in ETH"),
      own_only:            z.boolean().optional().default(false).describe("Show only printers you've registered"),
    },
    { readOnlyHint: true },
    async (args) => ok(await l3Printer(apiKey, "/printers", { params: args as Record<string, string | number | boolean> }))
  );

  server.tool("nwo_print_submit_job",
    "Send a part to a 3D printer for fabrication. Source: a Bot Market part_id OR a direct file_url. If no printer_id, the job queues to the cheapest matching network printer. SPENDS REAL MONEY AND CONSUMES FILAMENT — confirm with the user before calling, and pass max_budget_eth as a safety rail.",
    {
      part_id:         z.string().optional().describe("Bot Market part ID (alternative to file_url)"),
      file_url:        z.string().optional().describe("Direct STL/3MF URL (alternative to part_id)"),
      printer_id:      z.string().optional().describe("Specific printer to target (omit to use queue)"),
      material:        z.string().optional().default("PLA"),
      layer_height_mm: z.number().optional().default(0.2),
      infill_percent:  z.number().int().min(0).max(100).optional().default(20),
      quantity:        z.number().int().min(1).max(50).optional().default(1),
      max_budget_eth:  z.number().optional().describe("Reject the job if estimated cost exceeds this (safety rail)"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => {
      if (!args.part_id && !args.file_url) {
        return ok({ ok: false, error: "Must provide either part_id (from Bot Market) or file_url" });
      }
      return ok(await l3Printer(apiKey, "/jobs/submit", { method: "POST", body: args }));
    }
  );

  // ══════════════════════════════════════════════════════════════════════════
  // 24. FULL-ENVIRONMENT SIMULATION — NWO Simulation API (1 tool)
  //
  // Distinct from category 7 (Physics & Simulation). Category 7 covers
  // trajectory-level physics on nwo.capital. This tool wraps the heavier
  // full-environment simulator (LingBot-World / nwo-simulation-api) that
  // Conway agents use for design validation. ~$0.10 per environment +
  // $0.01/sec runtime, billed via your NWO API key.
  // ══════════════════════════════════════════════════════════════════════════

  server.tool("nwo_sim_validate_design",
    "Validate a robot design in a full physics environment BEFORE fabrication. Pass file_url + task description; the sim checks collision, structural integrity, and task feasibility. Use AFTER nwo_design_part and BEFORE nwo_print_submit_job. Costs your NWO account balance.",
    {
      environment_prompt: z.string().max(500).describe("Sim environment (e.g. 'lab bench with 50N load weight')"),
      task:               z.string().max(500).describe("What the robot/part should do (e.g. 'lift 1kg, hold 30 sec')"),
      file_url:           z.string().optional().describe("STL/URDF/Mujoco URL of the design to validate"),
      duration_seconds:   z.number().int().min(10).max(300).optional().default(60),
      robot_config:       z.record(z.unknown()).optional().describe("Robot params (type, sensors, etc.)"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => {
      // Step 1: create environment
      const envResult = await simApi(apiKey, "/v1/environments", {
        method: "POST",
        body: {
          name:   "byor-validation",
          prompt: args.environment_prompt,
          size:   "480p",
          type:   "indoor",
        },
      }) as { id?: string };
      if (!envResult.id) {
        return ok({ ok: false, error: "Failed to create sim environment", details: envResult });
      }
      // Step 2: create simulation
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

  // ══════════════════════════════════════════════════════════════════════════
  // 25. NWO-AGI SUPERCOMPUTER — distributed compute mesh (3 tools)
  //
  // NWO-AGI is a peer-to-peer mesh (built on Hyperspace) where robots pool
  // GPU/CPU/RAM/sensors to run models too large for any single robot
  // (Qwen 32B/72B, Llama 70B, etc.). External agents check node status via
  // the runner's public endpoints. To run inference, the operator must
  // install nwo-agi locally (pip install nwo-agi) and run the bridge on
  // the robot's actual hardware.
  // ══════════════════════════════════════════════════════════════════════════

  server.tool("nwo_agi_node_status",
    "Check status of an NWO-AGI node on the Hyperspace mesh. Returns node state (offline | joining | online | training), hardware specs, tasks completed, and total earnings. Check this BEFORE submitting inference — only online nodes can serve queries.",
    { address: z.string().describe("Agent or robot Ethereum address (0x...)") },
    { readOnlyHint: true },
    async ({ address }) => {
      if (!/^0x[0-9a-fA-F]{40}$/.test(address)) {
        return ok({ ok: false, error: "address must be a valid Ethereum address (0x + 40 hex chars)" });
      }
      return ok(await agiRunner(`/api/agi-node/${address.toLowerCase()}`));
    }
  );

  server.tool("nwo_agi_request_inference",
    "Run inference on the NWO-AGI distributed mesh using pooled robot hardware. Models too large for any single robot (Qwen 72B, Llama 70B, etc.) become available. Earnings: 35% guardian / 35% savings / 30% operations on every contribution. PRE-REQUISITE: a robot at this address must be online — check nwo_agi_node_status first. If offline, the response gives the exact Python command to bring a node online.",
    {
      agent_address:    z.string().describe("Robot Ethereum address (0x...)"),
      prompt:           z.string().max(4000).describe("The inference query"),
      model_preference: z.string().optional().default("Qwen/Qwen2.5-32B-Instruct").describe("Preferred model on the mesh"),
      priority:         z.enum(["normal", "urgent"]).optional().default("normal"),
      purpose:          z.string().max(300).optional().describe("Why this query — logged for transparency"),
    },
    { readOnlyHint: false, destructiveHint: false },
    async (args) => {
      if (!/^0x[0-9a-fA-F]{40}$/.test(args.agent_address)) {
        return ok({ ok: false, error: "agent_address must be a valid Ethereum address (0x + 40 hex chars)" });
      }

      const nodeStatus = await agiRunner(`/api/agi-node/${args.agent_address.toLowerCase()}`) as any;
      const isOnline = nodeStatus?.status === "online" || nodeStatus?.status === "training";

      if (!isOnline) {
        return ok({
          ok: false,
          node_status: nodeStatus?.status || "unknown",
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

      // Node is online — return the Python snippet to run on the connected robot.
      // Direct task injection from MCP requires a /api/agi-submit endpoint on
      // the runner; until that ships, the canonical path is bridge.inference()
      // locally on the robot that owns the node.
      return ok({
        ok: true,
        node_status: nodeStatus.status,
        total_earnings_eth: nodeStatus.total_earnings_eth,
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
        hint: "Future versions of this MCP will inject tasks directly via a runner endpoint. For now, inference runs on the connected node via the nwo-agi package.",
      });
    }
  );

  server.tool("nwo_agi_available_models",
    "List models loaded on the NWO-AGI mesh — which nodes host each shard, approximate latency, queue depth. Falls back to documented model catalog if the live mesh isn't reachable.",
    { min_size_params_b: z.number().optional().describe("Minimum model size in billions of params (e.g. 7, 32, 70)") },
    { readOnlyHint: true },
    async ({ min_size_params_b }) => {
      // Fallback catalog — accurate as of nwo-agi v1.0.1 README
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
      let result: any = fallback;
      if (min_size_params_b) {
        result = { ...fallback, models: fallback.models.filter(m => m.params_b >= min_size_params_b) };
      }
      return ok(result);
    }
  );

  return server;
}

// ─── HTTP endpoint ─────────────────────────────────────────────────────────────
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
    name: "NWO Robotics MCP Server",
    version: "2.1.0",
    tools: 107,
    categories: {
      vla_inference:         5,
      robot_control:         6,
      task_planning:         4,
      agent_management:      8,
      agent_discovery:       5,
      ros2_bridge:           7,
      physics_simulation:    7,
      embodiment:            8,
      online_rl:             4,
      tactile:               3,
      dataset_hub:           1,
      swarm:                 3,
      tasks_config_iot:     16,
      cardiac_oracle:        4,
      cardiac_relayer:      14,
      // Build Your Own Robot:
      design:                3,
      bot_market:            4,
      print_fulfillment:     2,
      full_env_simulation:   1,
      agi_supercomputer:     3,
    },
  });
});

app.listen(PORT, () => {
  console.log(`NWO Robotics MCP Server v2.1.0 (TypeScript) on port ${PORT}`);
  console.log(`MCP endpoint: POST /mcp`);
  console.log(`Health check: GET /health`);
  console.log(`Tools: 107 (94 original + 13 Build Your Own Robot)`);
});
