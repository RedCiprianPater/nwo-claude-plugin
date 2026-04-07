# NWO Robotics API Endpoints - Complete List (60+)

## Core Robotics API
| Endpoint | Method | Tool Name | Description |
|----------|--------|-----------|-------------|
| /api-robotics.php?action=inference | POST | nwo_inference | VLA inference for robot control |
| /api-robotics.php?action=list_models | GET | nwo_list_models | List available VLA models |
| /api-robotics.php?action=get_model_info | GET | nwo_get_model_info | Get model details |
| /api-robotics.php?action=query_state | GET | nwo_query_state | Query robot state and telemetry |
| /api-robotics.php?action=execute | POST | nwo_execute | Execute robot actions |
| /api-robotics.php?action=sensor_fusion | POST | nwo_sensor_fusion | IoT sensor fusion commands |
| /api-robotics.php?action=task_planner | POST | nwo_task_planner | Break down complex tasks |
| /api-robotics.php?action=learning&subaction=recommend | POST | nwo_learning_recommend | Get learning recommendations |
| /api-robotics.php?action=register_agent | POST | nwo_register_agent | Register robot/agent |

## Agent Discovery API
| Endpoint | Method | Tool Name | Description |
|----------|--------|-----------|-------------|
| /api-agent-discovery.php?action=health | GET | nwo_agent_discovery | Health check |
| /api-agent-discovery.php?action=whoami | GET | nwo_agent_discovery | Agent identity |
| /api-agent-discovery.php?action=capabilities | GET | nwo_agent_discovery | Discover capabilities |
| /api-agent-discovery.php?action=dry-run | POST | nwo_agent_discovery | Validate task without execution |
| /api-agent-discovery.php?action=plan | POST | nwo_agent_discovery | Generate execution plan |

## Agent Management API
| Endpoint | Method | Tool Name | Description |
|----------|--------|-----------|-------------|
| /api-agent-register.php | POST | nwo_agent_register | Register autonomous agent |
| /api-agent-pay.php | POST | nwo_agent_pay | Pay for tier upgrade |
| /api-agent-balance.php | GET | nwo_agent_balance | Check quota and usage |

## Simulation API
| Endpoint | Method | Tool Name | Description |
|----------|--------|-----------|-------------|
| /api-simulation.php?action=simulate_trajectory | POST | nwo_simulate_trajectory | Trajectory validation |
| /api-simulation.php?action=check_collision | POST | nwo_check_collision | Collision detection |
| /api-simulation.php?action=estimate_torques | POST | nwo_estimate_torques | Joint torque calculation |
| /api-simulation.php?action=validate_grasp | POST | nwo_validate_grasp | Grasp stability analysis |
| /api-simulation.php?action=plan_motion | POST | nwo_plan_motion | Motion planning |
| /api-simulation.php?action=get_scene_library | GET | nwo_get_scene_library | Available scenes |

## Cosmos API
| Endpoint | Method | Tool Name | Description |
|----------|--------|-----------|-------------|
| /api-cosmos.php?action=generate_scene | POST | nwo_cosmos_generate_scene | Cosmos 3 scene generation |

## Embodiment API
| Endpoint | Method | Tool Name | Description |
|----------|--------|-----------|-------------|
| /api-embodiment.php?action=list | GET | nwo_embodiment_list | List robots |
| /api-embodiment.php?action=detail | GET | nwo_embodiment_detail | Robot specifications |
| /api-embodiment.php?action=normalization | GET | nwo_embodiment_normalization | Normalization parameters |
| /api-embodiment.php?action=urdf | GET | nwo_embodiment_urdf | URDF downloads |
| /api-embodiment.php?action=test_results | GET | nwo_embodiment_test_results | Validation data |
| /api-embodiment.php?action=compare | POST | nwo_embodiment_compare | Robot comparison |

## Calibration API
| Endpoint | Method | Tool Name | Description |
|----------|--------|-----------|-------------|
| /api-calibration.php?action=calibrate | POST | nwo_calibration_calibrate | Convert confidence scores |
| /api-calibration.php?action=run_calibration | POST | nwo_calibration_run | Auto-calibration |

## Online RL API
| Endpoint | Method | Tool Name | Description |
|----------|--------|-----------|-------------|
| /api-online-rl.php?action=start_online_rl | POST | nwo_online_rl_start | Initialize RL session |
| /api-online-rl.php?action=submit_telemetry | POST | nwo_online_rl_submit_telemetry | Send telemetry |

## Fine-tuning API
| Endpoint | Method | Tool Name | Description |
|----------|--------|-----------|-------------|
| /api-fine-tune.php?action=create_dataset | POST | nwo_fine_tune_create_dataset | Create training dataset |
| /api-fine-tune.php?action=start_job | POST | nwo_fine_tune_start_job | Start fine-tuning job |

## Tactile Sensing API
| Endpoint | Method | Tool Name | Description |
|----------|--------|-----------|-------------|
| /api-orca.php?action=get_tactile | POST | nwo_orca_get_tactile | Read tactile sensors |
| /api-tactile.php?action=process_input | POST | nwo_tactile_process_input | Process tactile data |
| /api-tactile.php?action=slip_detection | POST | nwo_tactile_slip_detection | Detect object slip |

## Dataset Hub API
| Endpoint | Method | Tool Name | Description |
|----------|--------|-----------|-------------|
| /api-unitree-datasets.php?action=list | GET | nwo_unitree_datasets_list | List available datasets |

## Swarm API
| Endpoint | Method | Tool Name | Description |
|----------|--------|-----------|-------------|
| /api/swarm/join | POST | nwo_swarm_join | Join robot to swarm |
| /api/swarm/leave | POST | nwo_swarm_leave | Remove robot from swarm |
| /api/swarm/broadcast | POST | nwo_swarm_broadcast | Broadcast command to swarm |

## Tasks API
| Endpoint | Method | Tool Name | Description |
|----------|--------|-----------|-------------|
| /api/tasks/list | GET | nwo_tasks_list | List tasks |
| /api/tasks/history | GET | nwo_tasks_history | Task execution history |

## Config API
| Endpoint | Method | Tool Name | Description |
|----------|--------|-----------|-------------|
| /api/config/get | GET | nwo_config_get | Get configuration |
| /api/config/set | POST | nwo_config_set | Set configuration |

## Billing API
| Endpoint | Method | Tool Name | Description |
|----------|--------|-----------|-------------|
| /api/billing/usage | GET | nwo_billing_usage | Check API usage |
| /api/billing/invoice | GET | nwo_billing_invoice | Get invoices |

## IoT API
| Endpoint | Method | Tool Name | Description |
|----------|--------|-----------|-------------|
| /api/iot/command | POST | nwo_iot_command | Send IoT command |
| /api/iot/status | GET | nwo_iot_status | Get IoT device status |

## Safety API
| Endpoint | Method | Tool Name | Description |
|----------|--------|-----------|-------------|
| /api/safety/check | POST | nwo_safety_check | Run safety validation |
| /api/safety/alert | POST | nwo_safety_alert | Send safety alert |

## Templates API
| Endpoint | Method | Tool Name | Description |
|----------|--------|-----------|-------------|
| /api/template/list | GET | nwo_template_list | List code templates |
| /api/template/get | GET | nwo_template_get | Get template |

## Models API
| Endpoint | Method | Tool Name | Description |
|----------|--------|-----------|-------------|
| /api/models/list | GET | nwo_models_list | List available models |
| /api/models/upload | POST | nwo_models_upload | Upload model |
| /api/models/download | GET | nwo_models_download | Download model |
| /api/models/delete | DELETE | nwo_models_delete | Delete model |

## External Services
| Service | URL | Description |
|---------|-----|-------------|
| ROS2 Bridge | https://nwo-ros2-bridge.onrender.com | ROS2 integration |
| Edge API | https://nwo-robotics-api-edge.ciprianpater.workers.dev | Global low-latency API |
| MQTT Broker | mqtt.nwo.capital:8883 | Real-time messaging |

## Total: 60+ Endpoints