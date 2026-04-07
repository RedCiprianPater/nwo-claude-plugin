import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

/**
 * NWO Robotics MCP Server
 * 
 * This server provides MCP (Model Context Protocol) integration for NWO Robotics API,
 * enabling Claude to control robots via Vision-Language-Action AI.
 */

interface NWOConfig {
  apiKey: string;
  apiBaseUrl: string;
  defaultRobotId?: string;
}

class NWORoboticsServer {
  private server: Server;
  private config: NWOConfig;

  constructor(config: NWOConfig) {
    this.config = {
      apiBaseUrl: "https://nwo.capital/webapp",
      ...config,
    };

    this.server = new Server(
      {
        name: "nwo-robotics",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
        },
      }
    );

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "nwo_inference",
            description: "POST /api-robotics.php?action=inference - VLA inference for robot control",
            inputSchema: {
              type: "object",
              properties: {
                instruction: { type: "string" },
                agent_id: { type: "string" },
                image_url: { type: "string" },
                proprioception: { type: "object" }
              },
              required: ["instruction"]
            }
          },
          {
            name: "nwo_list_models",
            description: "GET /api-robotics.php?action=list_models - List VLA models",
            inputSchema: { type: "object", properties: {} }
          },
          {
            name: "nwo_get_model_info",
            description: "GET /api-robotics.php?action=get_model_info - Get model details",
            inputSchema: {
              type: "object",
              properties: { model_id: { type: "string" } },
              required: ["model_id"]
            }
          },
          {
            name: "nwo_query_state",
            description: "GET /api-robotics.php?action=query_state - Query robot state",
            inputSchema: {
              type: "object",
              properties: { agent_id: { type: "string" } },
              required: ["agent_id"]
            }
          },
          {
            name: "nwo_execute",
            description: "POST /api-robotics.php?action=execute - Execute robot actions",
            inputSchema: {
              type: "object",
              properties: {
                agent_id: { type: "string" },
                actions: { type: "array" }
              },
              required: ["agent_id", "actions"]
            }
          },
          {
            name: "nwo_sensor_fusion",
            description: "POST /api-robotics.php?action=sensor_fusion - IoT sensor fusion",
            inputSchema: {
              type: "object",
              properties: {
                instruction: { type: "string" },
                temperature: { type: "number" },
                humidity: { type: "number" },
                gps: { type: "string" },
                lidar: { type: "object" }
              },
              required: ["instruction"]
            }
          },
          {
            name: "nwo_task_planner",
            description: "POST /api-robotics.php?action=task_planner - Task planning",
            inputSchema: {
              type: "object",
              properties: {
                goal: { type: "string" },
                constraints: { type: "array" }
              },
              required: ["goal"]
            }
          },
          {
            name: "nwo_learning_recommend",
            description: "POST /api-robotics.php?action=learning&subaction=recommend - Learning recommendations",
            inputSchema: {
              type: "object",
              properties: {
                task: { type: "string" },
                object: { type: "string" }
              },
              required: ["task"]
            }
          },
          {
            name: "nwo_register_agent",
            description: "POST /api-robotics.php?action=register_agent - Register agent",
            inputSchema: {
              type: "object",
              properties: {
                name: { type: "string" },
                capabilities: { type: "array" },
                wallet_address: { type: "string" }
              },
              required: ["name"]
            }
          },
          {
            name: "nwo_agent_discovery",
            description: "GET/POST /api-agent-discovery.php - Agent discovery",
            inputSchema: {
              type: "object",
              properties: {
                action: { type: "string", enum: ["health", "whoami", "capabilities", "dry-run", "plan"] },
                agent_id: { type: "string" },
                task: { type: "string" }
              },
              required: ["action"]
            }
          },
          {
            name: "nwo_agent_register",
            description: "POST /api-agent-register.php - Register autonomous agent",
            inputSchema: {
              type: "object",
              properties: {
                name: { type: "string" },
                wallet_address: { type: "string" },
                capabilities: { type: "array" }
              },
              required: ["name", "wallet_address"]
            }
          },
          {
            name: "nwo_agent_pay",
            description: "POST /api-agent-pay.php - Pay for tier upgrade",
            inputSchema: {
              type: "object",
              properties: {
                tier: { type: "string", enum: ["prototype", "production"] },
                tx_hash: { type: "string" }
              },
              required: ["tier", "tx_hash"]
            }
          },
          {
            name: "nwo_agent_balance",
            description: "GET /api-agent-balance.php - Check quota and usage",
            inputSchema: { type: "object", properties: {} }
          },
          {
            name: "nwo_simulate_trajectory",
            description: "POST /api-simulation.php?action=simulate_trajectory - Trajectory validation",
            inputSchema: {
              type: "object",
              properties: {
                start: { type: "object" },
                end: { type: "object" },
                obstacles: { type: "array" }
              },
              required: ["start", "end"]
            }
          },
          {
            name: "nwo_check_collision",
            description: "POST /api-simulation.php?action=check_collision - Collision detection",
            inputSchema: {
              type: "object",
              properties: {
                object1: { type: "object" },
                object2: { type: "object" }
              },
              required: ["object1", "object2"]
            }
          },
          {
            name: "nwo_estimate_torques",
            description: "POST /api-simulation.php?action=estimate_torques - Joint torque calculation",
            inputSchema: {
              type: "object",
              properties: {
                joint_positions: { type: "array" },
                payload: { type: "number" }
              },
              required: ["joint_positions"]
            }
          },
          {
            name: "nwo_validate_grasp",
            description: "POST /api-simulation.php?action=validate_grasp - Grasp stability analysis",
            inputSchema: {
              type: "object",
              properties: {
                object: { type: "object" },
                gripper_pose: { type: "object" }
              },
              required: ["object", "gripper_pose"]
            }
          },
          {
            name: "nwo_plan_motion",
            description: "POST /api-simulation.php?action=plan_motion - Motion planning",
            inputSchema: {
              type: "object",
              properties: {
                start_config: { type: "object" },
                goal_config: { type: "object" },
                constraints: { type: "array" }
              },
              required: ["start_config", "goal_config"]
            }
          },
          {
            name: "nwo_get_scene_library",
            description: "GET /api-simulation.php?action=get_scene_library - Available scenes",
            inputSchema: { type: "object", properties: {} }
          },
          {
            name: "nwo_cosmos_generate_scene",
            description: "POST /api-cosmos.php?action=generate_scene - Cosmos 3 scene generation",
            inputSchema: {
              type: "object",
              properties: {
                description: { type: "string" },
                parameters: { type: "object" }
              },
              required: ["description"]
            }
          },
          {
            name: "nwo_embodiment_list",
            description: "GET /api-embodiment.php?action=list - List robots",
            inputSchema: { type: "object", properties: {} }
          },
          {
            name: "nwo_embodiment_detail",
            description: "GET /api-embodiment.php?action=detail - Robot specifications",
            inputSchema: {
              type: "object",
              properties: { robot_id: { type: "string" } },
              required: ["robot_id"]
            }
          },
          {
            name: "nwo_embodiment_normalization",
            description: "GET /api-embodiment.php?action=normalization - Normalization parameters",
            inputSchema: {
              type: "object",
              properties: { robot_id: { type: "string" } },
              required: ["robot_id"]
            }
          },
          {
            name: "nwo_embodiment_urdf",
            description: "GET /api-embodiment.php?action=urdf - URDF downloads",
            inputSchema: {
              type: "object",
              properties: { robot_id: { type: "string" } },
              required: ["robot_id"]
            }
          },
          {
            name: "nwo_embodiment_test_results",
            description: "GET /api-embodiment.php?action=test_results - Validation data",
            inputSchema: {
              type: "object",
              properties: { robot_id: { type: "string" } },
              required: ["robot_id"]
            }
          },
          {
            name: "nwo_embodiment_compare",
            description: "POST /api-embodiment.php?action=compare - Robot comparison",
            inputSchema: {
              type: "object",
              properties: { robot_ids: { type: "array" } },
              required: ["robot_ids"]
            }
          },
          {
            name: "nwo_calibration_calibrate",
            description: "POST /api-calibration.php?action=calibrate - Convert confidence scores",
            inputSchema: {
              type: "object",
              properties: {
                raw_scores: { type: "array" },
                method: { type: "string" }
              },
              required: ["raw_scores"]
            }
          },
          {
            name: "nwo_calibration_run",
            description: "POST /api-calibration.php?action=run_calibration - Auto-calibration",
            inputSchema: {
              type: "object",
              properties: {
                robot_id: { type: "string" },
                iterations: { type: "number" }
              },
              required: ["robot_id"]
            }
          },
          {
            name: "nwo_online_rl_start",
            description: "POST /api-online-rl.php?action=start_online_rl - Initialize RL session",
            inputSchema: {
              type: "object",
              properties: {
                task: { type: "string" },
                parameters: { type: "object" }
              },
              required: ["task"]
            }
          },
          {
            name: "nwo_online_rl_submit_telemetry",
            description: "POST /api-online-rl.php?action=submit_telemetry - Send telemetry",
            inputSchema: {
              type: "object",
              properties: {
                session_id: { type: "string" },
                telemetry: { type: "object" }
              },
              required: ["session_id", "telemetry"]
            }
          },
          {
            name: "nwo_fine_tune_create_dataset",
            description: "POST /api-fine-tune.php?action=create_dataset - Create training dataset",
            inputSchema: {
              type: "object",
              properties: {
                name: { type: "string" },
                data: { type: "array" }
              },
              required: ["name", "data"]
            }
          },
          {
            name: "nwo_fine_tune_start_job",
            description: "POST /api-fine-tune.php?action=start_job - Start fine-tuning job",
            inputSchema: {
              type: "object",
              properties: {
                dataset_id: { type: "string" },
                model: { type: "string" },
                hyperparameters: { type: "object" }
              },
              required: ["dataset_id"]
            }
          },
          {
            name: "nwo_orca_get_tactile",
            description: "POST /api-orca.php?action=get_tactile - Read tactile sensors",
            inputSchema: {
              type: "object",
              properties: { hand_id: { type: "string" } },
              required: ["hand_id"]
            }
          },
          {
            name: "nwo_tactile_process_input",
            description: "POST /api-tactile.php?action=process_input - Process tactile data",
            inputSchema: {
              type: "object",
              properties: {
                sensor_data: { type: "object" },
                calibration: { type: "object" }
              },
              required: ["sensor_data"]
            }
          },
          {
            name: "nwo_tactile_slip_detection",
            description: "POST /api-tactile.php?action=slip_detection - Detect object slip",
            inputSchema: {
              type: "object",
              properties: {
                sensor_data: { type: "object" },
                threshold: { type: "number" }
              },
              required: ["sensor_data"]
            }
          },
          {
            name: "nwo_unitree_datasets_list",
            description: "GET /api-unitree-datasets.php?action=list - List available datasets",
            inputSchema: { type: "object", properties: {} }
          },
          {
            name: "nwo_swarm_join",
            description: "POST /api/swarm/join - Join robot to swarm",
            inputSchema: {
              type: "object",
              properties: {
                swarm_id: { type: "string" },
                robot_id: { type: "string" }
              },
              required: ["swarm_id", "robot_id"]
            }
          },
          {
            name: "nwo_swarm_leave",
            description: "POST /api/swarm/leave - Remove robot from swarm",
            inputSchema: {
              type: "object",
              properties: {
                swarm_id: { type: "string" },
                robot_id: { type: "string" }
              },
              required: ["swarm_id", "robot_id"]
            }
          },
          {
            name: "nwo_swarm_broadcast",
            description: "POST /api/swarm/broadcast - Broadcast command to swarm",
            inputSchema: {
              type: "object",
              properties: {
                swarm_id: { type: "string" },
                message: { type: "object" }
              },
              required: ["swarm_id", "message"]
            }
          },
          {
            name: "nwo_tasks_list",
            description: "GET /api/tasks/list - List tasks",
            inputSchema: { type: "object", properties: {} }
          },
          {
            name: "nwo_tasks_history",
            description: "GET /api/tasks/history - Task execution history",
            inputSchema: {
              type: "object",
              properties: {
                limit: { type: "number" },
                offset: { type: "number" }
              }
            }
          },
          {
            name: "nwo_config_get",
            description: "GET /api/config/get - Get configuration",
            inputSchema: {
              type: "object",
              properties: { key: { type: "string" } }
            }
          },
          {
            name: "nwo_config_set",
            description: "POST /api/config/set - Set configuration",
            inputSchema: {
              type: "object",
              properties: {
                key: { type: "string" },
                value: {}
              },
              required: ["key", "value"]
            }
          },
          {
            name: "nwo_billing_usage",
            description: "GET /api/billing/usage - Check API usage",
            inputSchema: { type: "object", properties: {} }
          },
          {
            name: "nwo_billing_invoice",
            description: "GET /api/billing/invoice - Get invoices",
            inputSchema: {
              type: "object",
              properties: { month: { type: "string" } }
            }
          },
          {
            name: "nwo_iot_command",
            description: "POST /api/iot/command - Send IoT command",
            inputSchema: {
              type: "object",
              properties: {
                device_id: { type: "string" },
                command: { type: "object" }
              },
              required: ["device_id", "command"]
            }
          },
          {
            name: "nwo_iot_status",
            description: "GET /api/iot/status - Get IoT device status",
            inputSchema: {
              type: "object",
              properties: { device_id: { type: "string" } },
              required: ["device_id"]
            }
          },
          {
            name: "nwo_safety_check",
            description: "POST /api/safety/check - Run safety validation",
            inputSchema: {
              type: "object",
              properties: {
                action: { type: "object" },
                context: { type: "object" }
              },
              required: ["action"]
            }
          },
          {
            name: "nwo_safety_alert",
            description: "POST /api/safety/alert - Send safety alert",
            inputSchema: {
              type: "object",
              properties: {
                level: { type: "string", enum: ["info", "warning", "critical"] },
                message: { type: "string" }
              },
              required: ["level", "message"]
            }
          },
          {
            name: "nwo_template_list",
            description: "GET /api/template/list - List code templates",
            inputSchema: { type: "object", properties: {} }
          },
          {
            name: "nwo_template_get",
            description: "GET /api/template/get - Get template",
            inputSchema: {
              type: "object",
              properties: { template_id: { type: "string" } },
              required: ["template_id"]
            }
          },
          {
            name: "nwo_models_list",
            description: "GET /api/models/list - List available models",
            inputSchema: { type: "object", properties: {} }
          },
          {
            name: "nwo_models_upload",
            description: "POST /api/models/upload - Upload model",
            inputSchema: {
              type: "object",
              properties: {
                name: { type: "string" },
                file: { type: "string" }
              },
              required: ["name", "file"]
            }
          },
          {
            name: "nwo_models_download",
            description: "GET /api/models/download - Download model",
            inputSchema: {
              type: "object",
              properties: { model_id: { type: "string" } },
              required: ["model_id"]
            }
          },
          {
            name: "nwo_models_delete",
            description: "DELETE /api/models/delete - Delete model",
            inputSchema: {
              type: "object",
              properties: { model_id: { type: "string" } },
              required: ["model_id"]
            }
          }
        ]
      };
    });

    // Handle tool execution
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      
      try {
        const response = await fetch(`${this.config.apiBaseUrl}/api-robotics.php`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": this.config.apiKey,
          },
          body: JSON.stringify({
            action: name.replace("nwo_", ""),
            ...args,
          }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(data, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    });

    // List resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: "nwo://docs/api",
            name: "NWO Robotics API Documentation",
            mimeType: "text/markdown",
          },
          {
            uri: "nwo://examples/basic",
            name: "Basic Usage Examples",
            mimeType: "text/markdown",
          },
          {
            uri: "nwo://examples/advanced",
            name: "Advanced Examples",
            mimeType: "text/markdown",
          },
        ],
      };
    });

    // Read resources
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      
      const resources: Record<string, string> = {
        "nwo://docs/api": "# NWO Robotics API Documentation\n\nComplete API documentation...",
        "nwo://examples/basic": "# Basic Examples\n\nExample usage...",
        "nwo://examples/advanced": "# Advanced Examples\n\nAdvanced usage...",
      };

      const content = resources[uri];
      if (!content) {
        throw new Error(`Resource not found: ${uri}`);
      }

      return {
        contents: [
          {
            uri,
            mimeType: "text/markdown",
            text: content,
          },
        ],
      };
    });

    // List prompts
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return {
        prompts: [
          {
            name: "robot-control",
            description: "Help control robots using natural language",
          },
          {
            name: "swarm-coordination",
            description: "Coordinate multiple robots as a swarm",
          },
          {
            name: "troubleshooting",
            description: "Troubleshoot robot issues",
          },
        ],
      };
    });

    // Get prompts
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const prompts: Record<string, (args: any) => { messages: any[] }> = {
        "robot-control": (args) => ({
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Help me control a robot to: ${args?.task || "perform a task"}`,
              },
            },
          ],
        }),
        "swarm-coordination": (args) => ({
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Coordinate a robot swarm for: ${args?.mission || "a mission"}`,
              },
            },
          ],
        }),
        "troubleshooting": (args) => ({
          messages: [
            {
              role: "user",
              content: {
                type: "text",
                text: `Help troubleshoot this robot issue: ${args?.issue || "unknown issue"}`,
              },
            },
          ],
        }),
      };

      const prompt = prompts[name];
      if (!prompt) {
        throw new Error(`Prompt not found: ${name}`);
      }

      return prompt(args);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("NWO Robotics MCP server running on stdio");
  }
}

// Start server
const apiKey = process.env.NWO_API_KEY || "";
const server = new NWORoboticsServer({ apiKey });
server.run().catch(console.error);