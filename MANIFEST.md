# NWO Robotics Claude Plugin - File Manifest

Complete listing of all files in the plugin.

## Root Files

| File | Purpose | Size |
|------|---------|------|
| `claude.json` | Main Claude marketplace manifest with 60 tools | 20KB |
| `ai-plugin.json` | OpenAI-compatible plugin manifest | 4KB |
| `openapi.yaml` | OpenAPI 3.0 specification | 22KB |
| `package.json` | NPM package configuration | 1KB |
| `tsconfig.json` | TypeScript compiler configuration | 500B |
| `README.md` | Main documentation | 3KB |
| `LICENSE` | MIT license | 1KB |
| `QUICKSTART.md` | Quick start guide | 2KB |
| `SUBMISSION.md` | Marketplace submission guide | 2KB |
| `PUBLISH.md` | GitHub publishing guide | 3KB |
| `MANIFEST.md` | This file | 2KB |
| `API_ENDPOINTS.md` | Complete API endpoint list | 5KB |
| `ENDPOINT_COUNT.txt` | Endpoint count summary | 1KB |
| `.gitignore` | Git ignore rules | 200B |

## Source Code

| File | Purpose | Lines |
|------|---------|-------|
| `src/index.ts` | MCP server implementation | 600+ |

## Documentation

| File | Purpose |
|------|---------|
| `examples/basic.md` | Basic usage examples |
| `examples/advanced.md` | Advanced examples (swarm, IoT) |
| `assets/README.md` | Asset guidelines |

## Assets

| File | Purpose | Size |
|------|---------|------|
| `assets/icon.png` | Plugin icon (128x128) | 10KB |

## Total Statistics

- **Total Files**: 19
- **Total Size**: ~75KB
- **Tools Defined**: 60
- **API Endpoints**: 60+
- **Categories**: 19

## Categories Breakdown

1. Core Robotics API (15 tools)
2. Agent Discovery API (5 tools)
3. Agent Management API (3 tools)
4. Simulation API (6 tools)
5. Cosmos API (1 tool)
6. Embodiment API (6 tools)
7. Calibration API (2 tools)
8. Online RL API (2 tools)
9. Fine-tuning API (2 tools)
10. Tactile Sensing API (3 tools)
11. Dataset Hub API (1 tool)
12. Swarm API (3 tools)
13. Tasks API (2 tools)
14. Config API (2 tools)
15. Billing API (2 tools)
16. IoT API (2 tools)
17. Safety API (2 tools)
18. Templates API (2 tools)
19. Models API (4 tools)

## External Services

- ROS2 Bridge: https://nwo-ros2-bridge.onrender.com
- Edge API: https://nwo-robotics-api-edge.ciprianpater.workers.dev
- MQTT Broker: mqtt.nwo.capital:8883

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-04-07 | Initial release with 60+ endpoints |