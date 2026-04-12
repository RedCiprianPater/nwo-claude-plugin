import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import { z } from "zod";
import "dotenv/config";

// ─── Base URLs ────────────────────────────────────────────────────────────────
const NWO_BASE     = "https://nwo.capital/webapp";
const ROS2_BASE    = "https://nwo-ros2-bridge.onrender.com";
const EDGE_BASE    = "https://nwo-robotics-api-edge.ciprianpater.workers.dev";
const ORACLE_BASE  = "https://nwo-oracle.onrender.com";
const RELAYER_BASE = "https://nwo-relayer.onrender.com";

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

const nwo = (key: string, path: string, o: FetchOptions = {}) =>
  apiFetch(`${NWO_BASE}${path}`, { ...o, headers: { "X-API-Key": key, ...(o.headers ?? {}) } });

const ros2 = (key: string, path: string, o: FetchOptions = {}) =>
  apiFetch(`${ROS2_BASE}${path}`, { ...o, headers: { "X-API-Key": key, ...(o.headers ?? {}) } });

const relayer = (secret: string, path: string, o: FetchOptions = {}) =>
  apiFetch(`${RELAYER_BASE}${path}`, { ...o, headers: { "X-Relayer-Secret": secret, ...(o.headers ?? {}) } });

const oracle = (secret: string, path: string, o: FetchOptions = {}) =>
  apiFetch(`${ORACLE_BASE}${path}`, { ...o, headers: { "X-Oracle-Secret": secret, ...(o.headers ?? {}) } });

const ok = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

// ─── MCP Server factory ───────────────────────────────────────────────────────
function createServer(apiKey: string, relayerSecret: string, oracleSecret: string): McpServer {
  const server = new McpServer({ name: "NWO Robotics", version: "2.0.0" });

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

  return server;
}

// ─── HTTP endpoint ─────────────────────────────────────────────────────────────
app.post("/mcp", async (req: Request, res: Response) => {
  const apiKey        = (req.headers["x-api-key"]        as string) || process.env.NWO_API_KEY     || "";
  const relayerSecret = (req.headers["x-relayer-secret"] as string) || process.env.RELAYER_SECRET  || "";
  const oracleSecret  = (req.headers["x-oracle-secret"]  as string) || process.env.ORACLE_SECRET   || "";

  const server    = createServer(apiKey, relayerSecret, oracleSecret);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", name: "NWO Robotics MCP Server", version: "2.0.0", tools: 85 });
});

app.listen(PORT, () => {
  console.log(`NWO Robotics MCP Server (TypeScript) on port ${PORT}`);
  console.log(`MCP endpoint: POST /mcp`);
  console.log(`Health check: GET /health`);
});
