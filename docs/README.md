# NWO Robotics Claude Plugin Documentation

## Overview

The NWO Robotics Claude Plugin provides seamless integration between Claude AI and the NWO Robotics API, enabling natural language control of robots, multi-agent swarms, IoT devices, and automation systems.

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Claude    │────▶│  NWO Plugin      │────▶│  NWO Robotics   │
│   Desktop   │     │  (MCP Server)    │     │  API            │
└─────────────┘     └──────────────────┘     └─────────────────┘
                           │
                           ▼
                    ┌──────────────────┐
                    │  Robot Hardware  │
                    │  - Unitree       │
                    │  - Tesla Bot     │
                    │  - Figure AI     │
                    │  - Custom ROS2   │
                    └──────────────────┘
```

## File Structure

```
nwo-claude-plugin/
├── src/
│   └── index.ts          # Main MCP server implementation
├── assets/
│   └── icon.png          # Plugin icon
├── examples/
│   └── README.md         # Usage examples
├── docs/
│   └── README.md         # This documentation
├── claude.json           # Claude plugin manifest
├── ai-plugin.json        # OpenAI plugin manifest
├── openapi.yaml          # OpenAPI specification
├── README.md             # Main readme
├── QUICKSTART.md         # Quick start guide
├── SUBMISSION.md         # Submission checklist
├── PUBLISH.md            # Publishing guide
├── MANIFEST.md           # Plugin manifest details
├── API_ENDPOINTS.md      # Complete API reference
├── package.json          # Node.js dependencies
├── tsconfig.json         # TypeScript config
├── LICENSE               # MIT License
└── .gitignore            # Git ignore rules
```

## Core Components

### 1. MCP Server (src/index.ts)

The Model Context Protocol (MCP) server implements:
- **Tools**: 60+ API endpoints as callable functions
- **Resources**: Robot state, task status, sensor data
- **Prompts**: Pre-built prompts for common workflows

### 2. Manifests

**claude.json**: Claude-specific plugin configuration
- Tool definitions
- Authentication schema
- Capabilities declaration

**ai-plugin.json**: OpenAI-compatible manifest
- Cross-platform compatibility
- Standard plugin format

### 3. OpenAPI Spec (openapi.yaml)

Complete API specification with:
- All 60+ endpoints
- Request/response schemas
- Authentication requirements

## API Categories

### Core Robotics (15 tools)
- `inference`: VLA model inference
- `list_models`: List available models
- `get_model_info`: Get model details
- `query_state`: Query robot state
- `execute`: Execute robot actions
- `sensor_fusion`: Fuse multi-sensor data
- `robot_query`: Query robot database
- `get_agent_status`: Get agent status
- `task_planner`: Plan complex tasks
- `execute_subtask`: Execute subtasks
- `learning_recommend`: Get learning recommendations
- `learning_log`: Log learning data
- `register_agent`: Register new agents
- `update_agent`: Update agent config
- `get_agent`: Get agent details

### Agent Discovery (5 tools)
- `health`: Health check
- `whoami`: Identity verification
- `capabilities`: List capabilities
- `dry-run`: Test without execution
- `plan`: Generate execution plan

### Agent Management (3 tools)
- `register`: Register agent
- `pay`: Process payment
- `balance`: Check quota balance

### Simulation (6 tools)
- `simulate_trajectory`: Simulate motion
- `check_collision`: Collision detection
- `estimate_torques`: Torque estimation
- `validate_grasp`: Grasp validation
- `plan_motion`: Motion planning
- `get_scene_library`: Get scene library

### Embodiment (6 tools)
- `list`: List embodiments
- `detail`: Get embodiment details
- `normalization`: Normalization info
- `urdf`: Get URDF files
- `test_results`: Test results
- `compare`: Compare embodiments

### Calibration (2 tools)
- `calibrate`: Run calibration
- `run_calibration`: Execute calibration

### Online RL (2 tools)
- `start_online_rl`: Start RL session
- `submit_telemetry`: Submit telemetry

### Fine-tuning (2 tools)
- `create_dataset`: Create dataset
- `start_job`: Start training job

### Tactile Sensing (3 tools)
- `get_tactile`: Get tactile data
- `process_input`: Process sensor input
- `slip_detection`: Detect slippage

### Cosmos (1 tool)
- `generate_scene`: Generate synthetic scenes

### Dataset Hub (1 tool)
- `list_datasets`: List available datasets

### Swarm (3 tools)
- `join`: Join swarm
- `leave`: Leave swarm
- `broadcast`: Broadcast message

### Tasks (2 tools)
- `list`: List tasks
- `history`: Task history

### Config (2 tools)
- `get`: Get config
- `set`: Set config

### Billing (2 tools)
- `usage`: Check usage
- `invoice`: Get invoices

### IoT (2 tools)
- `command`: Send command
- `status`: Get device status

### Safety (2 tools)
- `check`: Safety validation
- `alert`: Send alert

### Templates (2 tools)
- `list`: List templates
- `get`: Get template

### Models (4 tools)
- `list`: List models
- `upload`: Upload model
- `download`: Download model
- `delete`: Delete model

## Authentication

The plugin uses API key authentication:

1. Get your API key from https://nwo.capital/webapp/api-key.php
2. The plugin securely stores your key
3. All API requests include the key in the Authorization header

## Development

### Setup

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm test
```

### Adding New Tools

1. Define the tool in `claude.json`
2. Implement the handler in `src/index.ts`
3. Add OpenAPI spec in `openapi.yaml`
4. Update documentation

## Troubleshooting

### Common Issues

**"API key invalid"**
- Verify your key at nwo.capital/api-key.php
- Check the key is properly configured in Claude

**"Robot not found"**
- Verify the robot ID exists
- Check the robot is online

**"Rate limit exceeded"**
- Upgrade your plan for higher limits
- Contact support for enterprise rates

## Support

- Email: ciprian.pater@publicae.org
- GitHub Issues: https://github.com/RedCiprianPater/nwo-claude-plugin/issues
- Website: https://nwo.capital

## License

MIT License - see LICENSE file
