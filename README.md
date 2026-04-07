# NWO Robotics Claude Plugin

Control robots using Vision-Language-Action AI through Claude. This plugin provides access to 60+ API endpoints for robot control, multi-agent swarms, IoT sensor fusion, and intelligent automation.

## 🚀 Quick Start

1. Get your API key from [nwo.capital/api-key.php](https://nwo.capital/webapp/api-key.php)
2. Install the plugin in Claude
3. Start controlling robots with natural language

## 📋 Requirements

- Claude Desktop or Claude Code
- NWO Robotics API key
- Node.js 18+ (for development)

## 🔧 Installation

### For Claude Desktop

1. Open Claude Desktop
2. Go to Settings → Plugins
3. Click "Install Plugin"
4. Select this folder or enter the GitHub URL

### For Claude Code

```bash
claude plugins install /path/to/nwo-claude-plugin
```

## 🎮 Usage

Once installed, you can control robots using natural language:

```
"Move the robot arm to pick up the red box"
"Query the status of robot unitree-001"
"Plan a task to navigate through the warehouse"
"Send a swarm command to all robots in zone A"
```

## 📚 API Categories

The plugin provides 60+ tools across these categories:

| Category | Tools | Description |
|----------|-------|-------------|
| Core Robotics | 15 | VLA inference, robot control, task planning |
| Agent Discovery | 5 | Health checks, capabilities, dry-run |
| Agent Management | 3 | Registration, payments, quotas |
| Simulation | 6 | Trajectory, collision, motion planning |
| Embodiment | 6 | Robot specs, URDF, comparison |
| Calibration | 2 | Confidence calibration |
| Online RL | 2 | Reinforcement learning |
| Fine-tuning | 2 | Dataset creation, model training |
| Tactile Sensing | 3 | Sensor processing, slip detection |
| Swarm | 3 | Multi-agent coordination |
| Tasks | 2 | Task management |
| Config | 2 | Configuration management |
| Billing | 2 | Usage tracking |
| IoT | 2 | Device control |
| Safety | 2 | Validation & alerts |
| Templates | 2 | Code templates |
| Models | 4 | Model management |

## 🔐 Authentication

The plugin uses API key authentication. Your key is stored securely and never shared.

## 📖 Documentation

- [Quick Start Guide](QUICKSTART.md)
- [Submission Guide](SUBMISSION.md)
- [Publishing Guide](PUBLISH.md)
- [API Endpoints](API_ENDPOINTS.md)
- [Examples](examples/)

## 🏠 Homepage

[https://nwo.capital/webapp/nwo-robotics.html](https://nwo.capital/webapp/nwo-robotics.html)

## 📄 License

MIT License - see [LICENSE](LICENSE)

## 🤝 Support

- Email: ciprian.pater@publicae.org
- Issues: [GitHub Issues](https://github.com/RedCiprianPater/nwo-claude-plugin/issues)

---

Built with ❤️ by NWO Capital