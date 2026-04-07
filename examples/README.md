# NWO Robotics Claude Plugin - Usage Examples

## Basic Robot Control

### Query Robot Status
```
"What's the status of robot unitree-001?"
```

### Move Robot
```
"Move the robot arm to coordinates [0.5, 0.3, 0.2]"
```

### Pick and Place
```
"Pick up the red box and place it on the blue shelf"
```

## VLA (Vision-Language-Action) Inference

### Natural Language Commands
```
"Look at this image and tell the robot what to do"
[Attach image]

"Navigate to the kitchen and find the coffee mug"
```

### With Image Input
```
"Analyze this workspace image and plan a grasp for the screwdriver"
```

## Multi-Agent Swarm

### Broadcast to All Robots
```
"Send a message to all robots in the warehouse: pause operations"
```

### Swarm Coordination
```
"Coordinate robots A1, A2, and A3 to move the pallet together"
```

## Task Planning

### Complex Tasks
```
"Plan a task to: 1) Navigate to loading dock, 2) Pick up package #1234, 3) Deliver to zone B"
```

### Task Status
```
"What's the status of task task_12345?"
```

## Simulation

### Trajectory Planning
```
"Simulate a trajectory for moving from point A to point B avoiding obstacles"
```

### Collision Detection
```
"Check if this motion plan has any collisions"
```

## IoT and Sensors

### Sensor Fusion
```
"Fuse data from camera_01, lidar_02, and imu_03"
```

### IoT Device Control
```
"Turn on the conveyor belt in zone A"
```

## Safety

### Safety Check
```
"Run a safety check before executing this motion"
```

### Emergency Stop
```
"Emergency stop all robots in the assembly line"
```

## Advanced Examples

### Complete Workflow
```
"I need to automate the packaging process:
1. Detect boxes on the conveyor
2. Classify them by size
3. Pick each box with appropriate grasp
4. Place in corresponding bin
5. Log all actions"
```

### Learning and Adaptation
```
"Start an online RL session for improving grasp success rate"
```

### Model Management
```
"List all available VLA models"
"Upload my custom trained model 'grasp_v2.onnx'"
```

---

## Tips

1. **Be specific**: Include robot IDs, coordinates, and object names when possible
2. **Use natural language**: The VLA system understands descriptive commands
3. **Check status**: Always verify robot status before sending commands
4. **Safety first**: Use safety checks for critical operations
5. **Iterate**: Start with simple commands and build complexity

## API Key

Get your API key at: https://nwo.capital/webapp/api-key.php
