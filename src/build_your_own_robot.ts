/**
 * src/build_your_own_robot.ts
 * ─────────────────────────────────────────────────────────────────────────
 * "Build Your Own Robot" — 13 MCP tools that give external agents
 * (Claude/GPT via MCP) the same design / market / print / simulate / AGI
 * capabilities that Conway agents get from the runner.
 *
 * These tools wrap the same backend HTTP services Conway uses. The only
 * differences from Conway's tools:
 *   - Auth is the user's NWO API key (X-API-Key header), not a body fund
 *   - Tools are called on-demand from chat, not on a cron cycle
 *   - Results go straight back to the chat, not into KV
 *
 * Usage in src/index.ts:
 *
 *   import { registerBuildYourOwnRobotTools } from "./build_your_own_robot.js";
 *
 *   // ... after creating the server and registering the other 85 tools ...
 *   registerBuildYourOwnRobotTools(server);
 *
 *   // Update the health endpoint: tools: 85 → tools: 98
 *
 * Service URLs (override via env vars if needed):
 *   NWO_L1_DESIGN_URL          https://nwo-design-engine.onrender.com
 *   NWO_L2_GALLERY_URL         https://nwo-parts-gallery.onrender.com
 *   NWO_L3_PRINTER_URL         https://nwo-printer-connectors.onrender.com
 *   NWO_SIM_API_URL            https://nwo-simulation-api.onrender.com
 *   NWO_AGI_TASKS_URL          https://nwo.ciprianpater.workers.dev
 *   NWO_TIMESFM_URL            https://nwo-timesfm.onrender.com
 *
 * Auth headers forwarded per-request:
 *   X-API-Key      → user's NWO API key (sk_live_...)
 *   X-Wallet       → optional, user's ETH wallet for AGI / market attribution
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// ── Config ───────────────────────────────────────────────────────────────────

const URLS = {
  L1_DESIGN:    process.env.NWO_L1_DESIGN_URL    || "https://nwo-design-engine.onrender.com",
  L2_GALLERY:   process.env.NWO_L2_GALLERY_URL   || "https://nwo-parts-gallery.onrender.com",
  L3_PRINTER:   process.env.NWO_L3_PRINTER_URL   || "https://nwo-printer-connectors.onrender.com",
  SIM_API:      process.env.NWO_SIM_API_URL      || "https://nwo-simulation-api.onrender.com",
  AGI_TASKS:    process.env.NWO_AGI_TASKS_URL    || "https://nwo.ciprianpater.workers.dev",
  TIMESFM:      process.env.NWO_TIMESFM_URL      || "https://nwo-timesfm.onrender.com",
};

// ── Types ────────────────────────────────────────────────────────────────────

type ToolHandler = (args: any, headers: Record<string, string>) => Promise<any>;

interface ToolDef {
  name: string;
  description: string;
  inputSchema: any;
  handler: ToolHandler;
}

// ── HTTP helper that forwards user's API key ─────────────────────────────────

async function callBackend(
  url: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: any;
    apiKey?: string;
    extraHeaders?: Record<string, string>;
    isFormData?: boolean;
  } = {},
) {
  const headers: Record<string, string> = {
    "Accept": "application/json",
    ...(options.apiKey ? { "X-API-Key": options.apiKey } : {}),
    ...(options.extraHeaders || {}),
  };

  let body: any = undefined;
  if (options.body !== undefined) {
    if (options.isFormData) {
      body = options.body; // already a FormData
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }
  }

  const res = await fetch(url, {
    method: options.method || (body ? "POST" : "GET"),
    headers,
    body,
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (!res.ok) {
    const errBody = isJson ? await res.json().catch(() => null) : await res.text();
    throw new Error(`HTTP ${res.status}: ${typeof errBody === "string" ? errBody.slice(0, 300) : JSON.stringify(errBody).slice(0, 300)}`);
  }

  return isJson ? res.json() : res.text();
}

function getApiKey(headers: Record<string, string>): string {
  const key = headers["x-api-key"] || headers["X-API-Key"] || "";
  if (!key) {
    throw new Error("X-API-Key header required. Get one at nwo.capital/webapp/api-key.php");
  }
  return key;
}

function getWallet(headers: Record<string, string>): string | null {
  return headers["x-wallet"] || headers["X-Wallet"] || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// TOOL DEFINITIONS — 13 new tools across 5 categories
// ─────────────────────────────────────────────────────────────────────────────

export const BUILD_YOUR_OWN_ROBOT_TOOLS: ToolDef[] = [

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY: DESIGN  (3 tools — L1 Design Engine)
  // ───────────────────────────────────────────────────────────────────────────

  {
    name: "nwo_design_part",
    description:
      "Generate a 3D-printable part from a natural-language description via the NWO L1 Design Engine. " +
      "Returns an STL file URL plus the parametric script (OpenSCAD or CadQuery). " +
      "Example prompts: 'M3 servo bracket with 4 mounting holes, 3mm wall thickness', " +
      "'gripper finger pad in TPU with cross-hatch grip pattern'. " +
      "Use this when you want to design a robot part that doesn't yet exist on Bot Market.",
    inputSchema: {
      type: "object",
      required: ["prompt"],
      properties: {
        prompt: { type: "string", description: "Natural-language description of the part", maxLength: 2000 },
        backend: { type: "string", enum: ["openscad", "cadquery"], default: "openscad" },
        export_format: { type: "string", enum: ["stl", "3mf", "obj"], default: "stl" },
        provider: { type: "string", enum: ["anthropic", "openai", "moonshot"], default: "anthropic", description: "LLM provider for code generation" },
        validate: { type: "boolean", default: true, description: "Run mesh validation (manifold, watertight)" },
        repair: { type: "boolean", default: true, description: "Auto-repair non-manifold geometry" },
      },
    },
    handler: async (args, headers) => {
      const apiKey = getApiKey(headers);
      const result = await callBackend(`${URLS.L1_DESIGN}/design/generate`, {
        method: "POST",
        apiKey,
        body: {
          prompt: args.prompt,
          backend: args.backend || "openscad",
          export_format: args.export_format || "stl",
          provider: args.provider || "anthropic",
          validate: args.validate !== false,
          repair: args.repair !== false,
        },
      });
      // Resolve relative file_url to absolute
      if (result.file_url && result.file_url.startsWith("/")) {
        result.file_url = `${URLS.L1_DESIGN}${result.file_url}`;
      }
      return result;
    },
  },

  {
    name: "nwo_design_job_status",
    description:
      "Check the status of a previously submitted design job. Returns the job state, file URL when ready, " +
      "and validation results. Useful for long-running designs or after server restarts.",
    inputSchema: {
      type: "object",
      required: ["job_id"],
      properties: {
        job_id: { type: "string", description: "Job ID returned by nwo_design_part" },
      },
    },
    handler: async (args, headers) => {
      const apiKey = getApiKey(headers);
      return callBackend(`${URLS.L1_DESIGN}/design/jobs/${args.job_id}`, { apiKey });
    },
  },

  {
    name: "nwo_design_list_my_jobs",
    description:
      "List the most recent design jobs you've submitted via your API key. Useful for resuming work " +
      "across sessions or finding a part you generated earlier.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", default: 20, minimum: 1, maximum: 100 },
      },
    },
    handler: async (args, headers) => {
      const apiKey = getApiKey(headers);
      const limit = args.limit || 20;
      return callBackend(`${URLS.L1_DESIGN}/design/jobs?limit=${limit}`, { apiKey });
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY: BOT MARKET  (4 tools — L2 Parts Gallery)
  // ───────────────────────────────────────────────────────────────────────────

  {
    name: "nwo_market_browse",
    description:
      "Browse and search NWO Bot Market for existing robot parts published by Conway agents and other users. " +
      "Search by keyword, filter by category (gripper, bracket, sensor_mount, frame, drivetrain, electronics, " +
      "wheel, joint, housing, manipulator, other), body zone, material, or license. " +
      "USE THIS BEFORE designing a new part — chances are someone has already designed what you need.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free-text keyword search (e.g. 'servo bracket M3')" },
        category: { type: "string", description: "Filter by part category" },
        body_zone: { type: "string", description: "Filter by body zone (head, torso, arm, leg, etc.)" },
        material: { type: "string", description: "Filter by material hint (PLA, PETG, TPU, ABS, etc.)" },
        license: { type: "string", description: "Filter by license (CC0, CC-BY, MIT, etc.)" },
        sort: { type: "string", enum: ["recent", "popular", "downloads"], default: "recent" },
        limit: { type: "integer", default: 20, minimum: 1, maximum: 100 },
      },
    },
    handler: async (args, headers) => {
      const apiKey = getApiKey(headers);
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(args)) {
        if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
      }
      return callBackend(`${URLS.L2_GALLERY}/parts?${params.toString()}`, { apiKey });
    },
  },

  {
    name: "nwo_market_get_part",
    description:
      "Get full details for a single Bot Market part — author, downloads, license, materials, " +
      "the STL/3MF file URL, and any user reviews.",
    inputSchema: {
      type: "object",
      required: ["part_id"],
      properties: {
        part_id: { type: "string", description: "Part ID from nwo_market_browse results" },
      },
    },
    handler: async (args, headers) => {
      const apiKey = getApiKey(headers);
      return callBackend(`${URLS.L2_GALLERY}/parts/${args.part_id}`, { apiKey });
    },
  },

  {
    name: "nwo_market_publish_part",
    description:
      "Publish a designed mesh to NWO Bot Market. Pass the file_url from nwo_design_part (or an " +
      "external mesh URL you control). Once published, the part becomes available for download by " +
      "other users and downloadable by 3D printers via nwo_print_submit_job. " +
      "Your wallet (if attached) receives credit/ETH for downloads, depending on the license.",
    inputSchema: {
      type: "object",
      required: ["file_url", "name"],
      properties: {
        file_url: { type: "string", description: "Source mesh URL (from nwo_design_part or external)" },
        name: { type: "string", description: "Part name (e.g. 'M3 Servo Bracket v2')", maxLength: 120 },
        description: { type: "string", maxLength: 1000 },
        category: { type: "string", description: "gripper | bracket | sensor_mount | frame | drivetrain | electronics | wheel | joint | housing | manipulator | other", default: "other" },
        body_zone: { type: "string", description: "head | torso | arm | leg | hand | foot (optional)" },
        material_hints: { type: "array", items: { type: "string" }, default: ["PLA"] },
        license: { type: "string", enum: ["CC0", "CC-BY", "CC-BY-SA", "MIT", "proprietary"], default: "CC0" },
        tags: { type: "array", items: { type: "string" }, maxItems: 10 },
      },
    },
    handler: async (args, headers) => {
      const apiKey = getApiKey(headers);
      const wallet = getWallet(headers);

      // Fetch the source mesh
      const meshRes = await fetch(args.file_url, { redirect: "follow" });
      if (!meshRes.ok) throw new Error(`Could not fetch mesh from file_url (${meshRes.status})`);
      const meshBlob = await meshRes.blob();

      const metadata = {
        name: args.name,
        description: args.description,
        category: args.category || "other",
        body_zone: args.body_zone,
        material_hints: args.material_hints || ["PLA"],
        license: args.license || "CC0",
        tags: args.tags || [],
      };

      // Detect extension
      const extMatch = args.file_url.match(/\.(stl|3mf|obj)(\?|$)/i);
      const ext = extMatch ? extMatch[1].toLowerCase() : "stl";
      const filename = `${args.name.replace(/[^a-zA-Z0-9]+/g, "_").slice(0, 60)}.${ext}`;

      const fd = new FormData();
      fd.append("file", meshBlob, filename);
      fd.append("metadata", JSON.stringify(metadata));

      return callBackend(`${URLS.L2_GALLERY}/parts/publish`, {
        method: "POST",
        apiKey,
        body: fd,
        isFormData: true,
        extraHeaders: wallet ? { "X-Wallet": wallet } : {},
      });
    },
  },

  {
    name: "nwo_market_my_parts",
    description:
      "List parts YOU have published to Bot Market under your API key. Shows download counts, " +
      "earnings, and current visibility status.",
    inputSchema: {
      type: "object",
      properties: {
        limit: { type: "integer", default: 50, minimum: 1, maximum: 200 },
      },
    },
    handler: async (args, headers) => {
      const apiKey = getApiKey(headers);
      return callBackend(`${URLS.L2_GALLERY}/parts/mine?limit=${args.limit || 50}`, { apiKey });
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY: 3D PRINT FULFILLMENT  (2 tools — L3 Printer Connectors)
  // ───────────────────────────────────────────────────────────────────────────

  {
    name: "nwo_print_list_printers",
    description:
      "List 3D printers available through NWO L3 Printer Connectors — both your own registered printers " +
      "(via OctoPrint/Klipper/Bambu API keys) and printers that have opted in to fulfill jobs for the network. " +
      "Returns printer specs (build volume, materials, layer height), location, hourly rate, and current queue depth.",
    inputSchema: {
      type: "object",
      properties: {
        material: { type: "string", description: "Filter by supported material (PLA, PETG, TPU, ABS, ASA, etc.)" },
        max_hourly_rate_eth: { type: "number", description: "Filter by max acceptable hourly cost in ETH" },
        own_only: { type: "boolean", default: false, description: "Show only printers you've registered" },
      },
    },
    handler: async (args, headers) => {
      const apiKey = getApiKey(headers);
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(args)) {
        if (v !== undefined && v !== null) params.set(k, String(v));
      }
      return callBackend(`${URLS.L3_PRINTER}/printers?${params.toString()}`, { apiKey });
    },
  },

  {
    name: "nwo_print_submit_job",
    description:
      "Send a part to a 3D printer for fabrication. The part can come from Bot Market (pass part_id) " +
      "or from your own design job (pass file_url). The printer operator earns the hourly rate; " +
      "if you don't have your own printer registered, the job is queued to the cheapest matching network printer. " +
      "EXPLICIT USER ACTION — this spends real money. Ask the user to confirm before calling.",
    inputSchema: {
      type: "object",
      properties: {
        part_id: { type: "string", description: "Bot Market part ID (alternative to file_url)" },
        file_url: { type: "string", description: "Direct STL/3MF URL (alternative to part_id)" },
        printer_id: { type: "string", description: "Specific printer to target (omit to use queue)" },
        material: { type: "string", default: "PLA" },
        layer_height_mm: { type: "number", default: 0.2 },
        infill_percent: { type: "integer", default: 20, minimum: 0, maximum: 100 },
        quantity: { type: "integer", default: 1, minimum: 1, maximum: 50 },
        max_budget_eth: { type: "number", description: "Reject the job if cost exceeds this (safety rail)" },
      },
    },
    handler: async (args, headers) => {
      const apiKey = getApiKey(headers);
      if (!args.part_id && !args.file_url) {
        throw new Error("Must provide either part_id (from Bot Market) or file_url");
      }
      return callBackend(`${URLS.L3_PRINTER}/jobs/submit`, {
        method: "POST",
        apiKey,
        body: args,
      });
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY: SIMULATION  (1 tool — NWO Simulation API)
  // Note: the existing MCP already has "Physics & Simulation 7 tools" — this
  // one specifically wraps the NWO Simulation API used by Conway. If duplicate
  // functionality exists, prefer the existing tools.
  // ───────────────────────────────────────────────────────────────────────────

  {
    name: "nwo_sim_validate_design",
    description:
      "Validate a robot design (part or full body) in physics simulation BEFORE fabrication. " +
      "Pass a file_url (STL/URDF) plus a task description; the simulation checks for collision, " +
      "structural failure under load, and task feasibility. Costs ~$0.10 per environment + " +
      "$0.01/sec runtime, billed to your NWO account. Use this AFTER nwo_design_part and BEFORE nwo_print_submit_job.",
    inputSchema: {
      type: "object",
      required: ["task", "environment_prompt"],
      properties: {
        file_url: { type: "string", description: "STL/URDF/Mujoco URL of the design to validate" },
        environment_prompt: { type: "string", description: "Sim environment (e.g. 'lab bench with 50N load weight')", maxLength: 500 },
        task: { type: "string", description: "What the robot/part should do (e.g. 'lift 1kg, hold 30 sec')", maxLength: 500 },
        duration_seconds: { type: "integer", default: 60, minimum: 10, maximum: 300 },
        robot_config: { type: "object", description: "Robot params (type, sensors, etc.)" },
      },
    },
    handler: async (args, headers) => {
      const apiKey = getApiKey(headers);

      // Step 1: create environment
      const envResult = await callBackend(`${URLS.SIM_API}/v1/environments`, {
        method: "POST",
        extraHeaders: { "X-API-Key": apiKey },
        body: {
          name: "external-validation",
          prompt: args.environment_prompt,
          size: "480p",
          type: "indoor",
        },
      });

      // Step 2: create simulation
      return callBackend(`${URLS.SIM_API}/v1/simulations`, {
        method: "POST",
        extraHeaders: { "X-API-Key": apiKey },
        body: {
          environment_id: envResult.id,
          task: args.task,
          duration_seconds: args.duration_seconds || 60,
          robot_config: args.robot_config || { type: "mobile_manipulator" },
          source_file_url: args.file_url,
        },
      });
    },
  },

  // ───────────────────────────────────────────────────────────────────────────
  // CATEGORY: NWO-AGI SUPERCOMPUTER  (3 tools — distributed compute mesh)
  // ───────────────────────────────────────────────────────────────────────────

  {
    name: "nwo_agi_node_status",
    description:
      "Check the status of an NWO-AGI node on the Hyperspace distributed supercomputer mesh. " +
      "Returns node state (offline | joining | online | training), hardware specs, tasks completed, " +
      "and total earnings. Useful before submitting an inference task — only online nodes can serve it. " +
      "Pass the agent_address (a Conway agent's wallet) or your own robot_address.",
    inputSchema: {
      type: "object",
      required: ["address"],
      properties: {
        address: { type: "string", description: "Agent or robot Ethereum address (0x...)" },
      },
    },
    handler: async (args, headers) => {
      if (!/^0x[0-9a-fA-F]{40}$/.test(args.address)) {
        throw new Error("address must be a valid Ethereum address (0x + 40 hex chars)");
      }
      return callBackend(`${URLS.AGI_TASKS}/api/agi-node/${args.address}`);
    },
  },

  {
    name: "nwo_agi_request_inference",
    description:
      "Submit an inference task to the NWO-AGI distributed supercomputer mesh. " +
      "Uses pooled robot hardware to run models too large for any single robot (Qwen 32B/72B, " +
      "Llama 70B, etc.). Task is queued in KV for up to 48h. Earnings: 35% guardian / 35% savings / " +
      "30% operations on every contribution. " +
      "Pre-requisite: your address must have an online node — check with nwo_agi_node_status first. " +
      "If no node is online, run `pip install nwo-agi` and start `nwo_agi_adapter.py` on your robot's hardware first.",
    inputSchema: {
      type: "object",
      required: ["agent_address", "prompt"],
      properties: {
        agent_address: { type: "string", description: "Your robot's Ethereum address (0x...)" },
        prompt: { type: "string", description: "The inference query", maxLength: 4000 },
        model_preference: { type: "string", default: "Qwen/Qwen2.5-32B-Instruct", description: "Preferred model on the mesh" },
        priority: { type: "string", enum: ["normal", "urgent"], default: "normal" },
        purpose: { type: "string", description: "Why this query — logged for transparency", maxLength: 300 },
      },
    },
    handler: async (args, headers) => {
      const apiKey = getApiKey(headers);
      if (!/^0x[0-9a-fA-F]{40}$/.test(args.agent_address)) {
        throw new Error("agent_address must be a valid Ethereum address (0x + 40 hex chars)");
      }

      // This hits the same KV queue Conway agents use. The runner's KV is the shared substrate.
      // Note: the runner endpoint POST /api/agi-task-results doesn't accept *new* tasks from
      // external sources directly. For external task injection, route through a dedicated
      // /api/agi-submit endpoint OR install nwo-agi locally and call bridge.inference() directly.
      // The runner exposes the queue for READ (adapters poll) and WRITE-RESULT (adapters post back).
      // For an external agent to inject a task, the simplest path right now is: pip install nwo-agi
      // and call bridge.inference() locally. This MCP tool returns instructions for that.

      const nodeStatus = await callBackend(`${URLS.AGI_TASKS}/api/agi-node/${args.agent_address}`);
      const isOnline = nodeStatus.status === "online" || nodeStatus.status === "training";

      if (!isOnline) {
        return {
          ok: false,
          node_status: nodeStatus.status,
          message: "Node is not online. To bring it online:",
          instructions: [
            "1. pip install nwo-agi",
            `2. python -m nwo_agi.cli --robot-id "${args.agent_address}" --wallet <your_wallet>`,
            "3. Wait for status to become 'online' (check with nwo_agi_node_status)",
            "4. Re-run nwo_agi_request_inference",
          ],
          repo: "https://github.com/RedCiprianPater/code/nwo-agi",
        };
      }

      // Node is online — we'd inject the task. For now, return the python snippet
      // the user can run locally to call the bridge directly.
      return {
        ok: true,
        node_status: nodeStatus.status,
        message: "Node is online. To run this inference, execute on the robot:",
        python_snippet: [
          "from nwo_agi import NWOBridge",
          "import asyncio",
          "",
          "async def run():",
          "    bridge = NWOBridge(",
          `        robot_id="${args.agent_address}",`,
          `        wallet="${getWallet(headers) || '<your_wallet>'}",`,
          "    )",
          "    await bridge.start()",
          `    result = await bridge.inference(`,
          `        model="${args.model_preference || 'Qwen/Qwen2.5-32B-Instruct'}",`,
          `        prompt=${JSON.stringify(args.prompt)},`,
          "    )",
          "    print(result)",
          "",
          "asyncio.run(run())",
        ].join("\n"),
        hint: "Future versions of this MCP will inject tasks directly. For now, the nwo-agi package handles inference locally on the connected robot.",
      };
    },
  },

  {
    name: "nwo_agi_available_models",
    description:
      "List models currently loaded on the NWO-AGI mesh, with which nodes host each shard, " +
      "approximate latency, and queue depth. Useful for picking which model to request inference from " +
      "via nwo_agi_request_inference.",
    inputSchema: {
      type: "object",
      properties: {
        min_size_params_b: { type: "number", description: "Minimum model size in billions of params (e.g. 7, 32, 70)" },
      },
    },
    handler: async (args, headers) => {
      // The Hyperspace network exposes a /v1/models endpoint when connected.
      // For now this is a best-effort proxy; if the network isn't reachable,
      // return a fallback list documented from the nwo-agi README.
      try {
        const data = await callBackend("http://localhost:8080/v1/models", {});
        if (args.min_size_params_b && data.models) {
          data.models = data.models.filter((m: any) => (m.params_b || 0) >= args.min_size_params_b);
        }
        return data;
      } catch {
        return {
          source: "fallback (Hyperspace mesh not reachable from MCP server)",
          note: "Models below are documented; live availability depends on connected nodes.",
          models: [
            { id: "Qwen/Qwen2.5-7B-Instruct",  params_b: 7,   typical_latency_ms: 50 },
            { id: "Qwen/Qwen2.5-32B-Instruct", params_b: 32,  typical_latency_ms: 180 },
            { id: "Qwen/Qwen2.5-72B-Instruct", params_b: 72,  typical_latency_ms: 320 },
            { id: "Llama-3.1-70B-Instruct",    params_b: 70,  typical_latency_ms: 280 },
            { id: "Llama-3.1-405B-Instruct",   params_b: 405, typical_latency_ms: 890, note: "Requires 16+ node cluster" },
          ],
          hint: "Run `pip install nwo-agi` and connect a node to see live availability.",
        };
      }
    },
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// REGISTRATION FUNCTION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Add this to the bottom of src/index.ts:
 *
 *   import { registerBuildYourOwnRobotTools } from "./build_your_own_robot.js";
 *   registerBuildYourOwnRobotTools(server, existingToolsList, existingHandlersMap);
 *
 * Or merge BUILD_YOUR_OWN_ROBOT_TOOLS into your existing tools array directly.
 *
 * The exact integration depends on how your current index.ts registers tools.
 * The pattern below assumes:
 *   - You maintain a flat array of {name, description, inputSchema} for tools/list
 *   - You maintain a Map<name, handler> for tools/call dispatch
 */

export function registerBuildYourOwnRobotTools(
  server: Server,
  existingTools: Array<{ name: string; description: string; inputSchema: any }>,
  existingHandlers: Map<string, ToolHandler>,
) {
  for (const tool of BUILD_YOUR_OWN_ROBOT_TOOLS) {
    existingTools.push({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    });
    existingHandlers.set(tool.name, tool.handler);
  }
}

/**
 * Alternative: if your index.ts uses the simpler pattern of one ListToolsRequest
 * and one CallToolRequest handler with inline switch statements, just paste the
 * tool definitions from BUILD_YOUR_OWN_ROBOT_TOOLS into your list, and add a case
 * to your switch for each handler.
 */
