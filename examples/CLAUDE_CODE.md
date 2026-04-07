# 📚 NWO Robotics Claude Plugin - Examples & Usage Guide

Complete examples for using the NWO Robotics Claude Plugin with real-world scenarios.

---

## Table of Contents

1. [Quick Start Examples](#quick-start-examples)
2. [API Usage & Quota Management](#api-usage--quota-management)
3. [Error Handling](#error-handling)
4. [Feature Examples](#feature-examples)
5. [Advanced Scenarios](#advanced-scenarios)
6. [Getting Help](#getting-help)
7. [Troubleshooting](#troubleshooting)

---

## Quick Start Examples

### Example 1: Basic Robot Control

**Ask Claude:**
```
I want to pick up a red box from the table. 
The robot is currently at position (1.0, 0.5, 0.8).
What are the steps?
```

**What Happens:**
1. Claude calls `nwo_inference` with your instruction
2. Plugin sends request to NWO API
3. Receives robot actions (joint positions)
4. Returns step-by-step plan

**Claude's Response:**
```
I'll help you pick up the red box. Let me query the robot state 
and plan the motion.

Robot current state:
- Position: (1.0, 0.5, 0.8)
- Battery: 85%
- Gripper: Open

Planned steps:
1. Move arm to approach position
2. Lower gripper toward box
3. Close gripper with gentle force
4. Lift box vertically
5. Move to desired location

Let me validate this plan first...
✓ Collision check: PASSED
✓ Force limits: PASSED
✓ Safety constraints: PASSED

Ready to execute! (15 actions, ~15 seconds estimated)
```

---

### Example 2: Autonomous Task Decomposition

**Ask Claude:**
```
Clean the entire warehouse. The warehouse has shelves, boxes, 
and a cleaning supplies cabinet in the corner.
```

**What Happens:**
1. Claude calls `nwo_task_planner`
2. Plugin breaks down complex task
3. Returns subtasks with order

**Claude's Response:**
```
I'm breaking down the warehouse cleaning task...

Generated 8 subtasks:

1. ✓ Move to cleaning supplies cabinet
   Estimated time: 2 minutes
   
2. ✓ Pick up cleaning solution
   Estimated time: 30 seconds
   
3. ✓ Move to first shelf area
   Estimated time: 1 minute
   
4. ✓ Spray and wipe shelf surfaces
   Estimated time: 5 minutes
   
5. ✓ Pick up fallen boxes
   Estimated time: 3 minutes
   
6. ✓ Move to second shelf area
   Estimated time: 1 minute
   
7. ✓ Repeat cleaning process
   Estimated time: 5 minutes
   
8. ✓ Return cleaning supplies
   Estimated time: 1 minute

Total estimated time: 18 minutes

Would you like me to start executing these tasks?
```

---

### Example 3: Vision-Based Object Detection

**Ask Claude:**
```
I'm seeing something on the conveyor belt. Can you identify it?
Here's an image from the camera.

[Image uploaded]
```

**What Happens:**
1. Claude receives camera image
2. Calls `nwo_detect_objects_grounding` for open-vocabulary detection
3. Returns identified objects with confidence scores

**Claude's Response:**
```
Analyzing the camera image...

I can see:
✓ Red cylindrical object (94% confidence) - Located at center
✓ Blue square box (87% confidence) - Located at right
✓ Small metallic component (72% confidence) - Located at left

The red cylinder appears to be your target item.
Would you like me to pick it up?
```

---

### Example 4: SLAM Mapping

**Ask Claude:**
```
I want the robot to explore and map this warehouse section.
Start from the entrance and map out the layout.
```

**What Happens:**
1. Claude calls `nwo_initialize_slam`
2. Robot creates visual map of environment
3. Later can call `nwo_localize` to remember locations

**Claude's Response:**
```
Initializing SLAM mapping for warehouse exploration...

Map initialization:
- Mode: Hybrid (visual + depth sensors)
- Loop closure: Enabled (robot remembers places)
- Update rate: 30 Hz

Starting exploration...
[5 seconds later]

Map created successfully!
- Coverage: 200 square meters
- Keyframes captured: 45
- Loop closures detected: 3

Saved map: "warehouse_section_1_2026-04-07"

The robot now remembers this space and can:
✓ Localize itself in future visits
✓ Navigate to remembered locations
✓ Detect changes since last visit

You can revisit anytime without re-mapping!
```

---

### Example 5: Reinforcement Learning Training

**Ask Claude:**
```
Train a policy for picking up delicate objects. 
I want it to learn gentle grip force and slow approach speed.
```

**What Happens:**
1. Claude calls `nwo_create_rl_env` 
2. Sets up reward function for gentle manipulation
3. Calls `nwo_train_policy` with PPO algorithm
4. Returns trained model

**Claude's Response:**
```
Setting up RL training for delicate object handling...

Environment created:
- Task: Pick up fragile objects
- Physics engine: MuJoCo
- Reward function:
  * Success bonus: +1.0
  * Efficiency: -0.001 per second
  * Safety (no damage): +0.5
  * Excessive force: -1.0

Training policy with PPO (Proximal Policy Optimization)...
Network architecture: [256, 256] hidden layers
Learning rate: 3e-4
Batch size: 64

[Training progress]
Episode 1000: Success rate 45%, Avg reward 0.52
Episode 2000: Success rate 73%, Avg reward 0.78
Episode 3000: Success rate 91%, Avg reward 0.94
Episode 4000: Success rate 96%, Avg reward 0.97

✓ Training complete!

Policy performance:
- Success rate: 96% on test set
- Average grip force: 2.1 N (gentle)
- Object damage rate: 0.2%

Ready to deploy to physical robot!
```

---

## API Usage & Quota Management

### Check Your Current Quota

**Ask Claude:**
```
Check my API usage and quota
```

**What Happens:**
1. Claude calls `nwo_agent_check_balance`
2. Returns quota information

**Claude's Response:**
```
Checking your API quota...

Current Usage:
┌─────────────────────────────────────────┐
│ Tier: FREE                              │
│ Monthly Quota: 100,000 calls            │
│ Used This Month: 67,342 calls           │
│ Remaining: 32,658 calls                 │
│ Usage: 67.3%                            │
└─────────────────────────────────────────┘

Expiration: May 6, 2026

⚠️ You're using 67% of your monthly quota
   At current rate (1,500 calls/day), 
   you'll hit limit in ~22 days

Recommendations:
✓ Consider upgrading to Prototype tier (500k/month)
✓ Or optimize API calls to reduce usage
✓ Or wait for quota reset on May 6

Would you like to upgrade your tier?
```

---

### Understand Quota Tiers

**Ask Claude:**
```
What are the pricing tiers and how much quota do I get?
```

**Claude's Response:**
```
NWO Robotics API Pricing Tiers:

FREE TIER
├─ Monthly Quota: 100,000 API calls
├─ Cost: $0
├─ Best for: Development, testing, hobbyist projects
└─ Perfect if: Learning and experimenting

PROTOTYPE TIER
├─ Monthly Quota: 500,000 API calls
├─ Cost: 0.015 ETH (~$20-30/month)
├─ Best for: Small production deployments, research
└─ Perfect if: Running 1-5 robots continuously

PRODUCTION TIER
├─ Monthly Quota: Unlimited calls
├─ Cost: 0.062 ETH (~$80-100/month)
├─ Best for: Enterprise, large-scale deployments
└─ Perfect if: Running 100+ robots or high volume

Cost Examples:
- Prototype: ~$240/year per robot
- Production: ~$960/year for unlimited robots
- Free development: Perfect to start

Current Recommendation:
You're at 67% usage on Free tier.
Upgrade to Prototype when ready to go into production.
```

---

### Optimize API Usage

**Ask Claude:**
```
How can I reduce my API usage and save on quota?
```

**Claude's Response:**
```
API Usage Optimization Tips:

1. USE CACHING
   ✓ Cache robot capabilities discovery
   ✓ Cache model information
   ✓ Don't call discovery endpoints repeatedly
   
   Example:
   - First time: Call /api-agent-discovery.php (1 call)
   - Store result in memory (no additional calls)
   - Reuse for next 1000 tasks

2. BATCH OPERATIONS
   ✓ Plan multiple tasks at once
   ✓ Execute sequentially
   ✓ Log once, not per step
   
   Example:
   - Single task planner call for full warehouse = 1 call
   - Individual steps = 8 calls
   - Savings: 75%

3. USE DRY-RUN FOR VALIDATION
   ✓ Validate before executing (1 call)
   ✓ Prevents failed executions (saves 5-10 calls)
   
   Example:
   - Validate plan: 1 call
   - Execute plan: 1 call (now optimized)
   - Total: 2 calls vs 10+ if you had to retry

4. REUSE LEARNED MODELS
   ✓ Log execution results
   ✓ Use learned techniques next time
   ✓ Get recommendations from past data
   
   Example:
   - First delicate object: Learn technique (5 calls)
   - Next delicate object: Use learned technique (1 call)
   - Savings: 80%

ESTIMATED SAVINGS: 60-70% reduction possible
```

---

## Error Handling

### Rate Limit Exceeded

**Scenario:**
```
You've hit your monthly quota and try to execute a task.
```

**What Claude Shows:**
```
Error: QUOTA_EXCEEDED
└─ Your monthly quota of 100,000 calls has been used
└─ Next quota reset: May 6, 2026
└─ Time remaining: 15 days

Recovery Options:
1️⃣  Upgrade to Prototype tier (500k/month)
    Cost: 0.015 ETH (~$25)
    → Immediate upgrade
    
2️⃣  Upgrade to Production tier (unlimited)
    Cost: 0.062 ETH (~$100)
    → Full unlimited access

3️⃣  Wait until next month (May 6)
    → Free quota resets
    
How would you like to proceed?
(Example: "Upgrade me to Prototype tier")
```

---

### Safety Constraint Violation

**Scenario:**
```
Robot tries to move outside safe parameters.
```

**What Claude Shows:**
```
⚠️ Safety Constraint Violation

Violation Details:
├─ Constraint: Force limit (50 N max)
├─ Attempted: 67 N
├─ Location: End effector, Z-axis
└─ Risk: Potential damage to gripper

Action Taken:
✓ Emergency stop activated (<10ms)
✓ All joints halted
✓ Robot in safe state

Recommendations:
1. Reduce grip force to 40-45 N
2. Use "gentle_grip" technique
3. Validate with dry-run first
4. Try again with adjusted parameters

Would you like to retry with lower force?
```

---

### Network Error Recovery

**Scenario:**
```
Network connection dropped during task execution.
```

**What Claude Shows:**
```
⚠️ Network Error

Error: Connection timeout
└─ API endpoint unreachable
└─ Last successful ping: 2 seconds ago

Recovery in Progress:
[Attempt 1/3] Retrying... (wait 2 seconds)
[Attempt 2/3] Retrying... (wait 4 seconds)  
[Attempt 3/3] Retrying... (wait 8 seconds)

✓ Connection restored!
✓ Resumed from last checkpoint

Task Status:
├─ Completed phases: 3/4
├─ Current phase: Verified and resumed
├─ Remaining: 1 phase
└─ Resume time: 2 seconds

Continuing execution...
```

---

### Invalid Instruction

**Scenario:**
```
Ask the robot to do something impossible.
```

**What Claude Shows:**
```
⚠️ Invalid Instruction

Instruction: "Lift 500 kg with gripper rated for 5 kg"

Validation Failed:
├─ Payload check: FAILED
│  └─ Gripper capacity: 5 kg
│  └─ Requested: 500 kg
│  └─ Safety margin: 1%
├─ Force limits: EXCEEDED
│  └─ Max torque: 10 Nm
│  └─ Required: 750 Nm
└─ Risk level: CRITICAL

Suggestions:
1. Use a different robot with higher capacity
2. Use lifting equipment (crane, scissor lift)
3. Break into smaller loads
4. Use different technique (push vs lift)

Would you like to try a different approach?
```

---

## Feature Examples

### Example 1: Multi-Modal Sensor Fusion

**Ask Claude:**
```
The warehouse is hot. Pick up the metal part carefully 
while avoiding the thermal hazard zone.
```

**What Happens:**
1. Claude calls `nwo_sensor_fusion`
2. Combines: camera, thermal, proximity, force sensors
3. Returns context-aware actions

**Claude's Response:**
```
Fusing multi-modal sensor data...

Sensor Status:
├─ Camera: Red part at (0.5, 0.3)
├─ Thermal: Hot zone (85°C) at (0.4, 0.2)
├─ Proximity: Safe distance 0.25m
├─ Force: Gripper ready (0 N)
└─ Temperature sensor: Part is 78°C

Context-Aware Adjustments:
✓ Grip force reduced to 1.5 N (gentle for hot metal)
✓ Approach speed: Slow (0.1 m/s)
✓ Path adjusted to avoid hot zone
✓ Thermal protection: Activate heat-resistant gripper
✓ Monitoring: Watch for thermal drift during pickup

Execution Plan:
1. Move arm to side approach (avoid thermal zone)
2. Reduce gripper temperature to safe level
3. Approach part slowly with thermal monitoring
4. Grip with reduced force
5. Lift and move to safe zone

Ready to execute with thermal safety!
```

---

### Example 2: Gesture-Based Control

**Ask Claude:**
```
I'll control the robot with hand gestures.
Show me available gestures and how to use them.
```

**What Happens:**
1. Claude explains `nwo_detect_gesture`
2. Shows gesture recognition capabilities

**Claude's Response:**
```
Gesture Control System Activated

Available Gestures:

1️⃣  WAVE GESTURE
    ├─ How: Wave hand side-to-side
    ├─ Distance: 0.5 - 3 meters
    ├─ Action: PAUSE current task
    └─ Accuracy: 98%

2️⃣  POINT GESTURE  
    ├─ How: Extend arm and point
    ├─ Distance: 0.5 - 3 meters
    ├─ Action: Move robot to that location
    └─ Accuracy: 95%

3️⃣  STOP GESTURE
    ├─ How: Raise hand with palm out
    ├─ Distance: Any distance
    ├─ Action: Emergency stop
    └─ Accuracy: 99%

4️⃣  THUMBS UP GESTURE
    ├─ How: Raise fist with thumb up
    ├─ Distance: 1 - 2 meters
    ├─ Action: Confirm and continue
    └─ Accuracy: 94%

5️⃣  THUMBS DOWN GESTURE
    ├─ How: Raise fist with thumb down
    ├─ Distance: 1 - 2 meters
    ├─ Action: Cancel and retry
    └─ Accuracy: 94%

Camera Setup:
✓ Forward-facing camera active
✓ Processing at 30 Hz
✓ Gesture detection: Real-time

Try a gesture now!
(The robot will respond to your motion)
```

---

### Example 3: Real-Time Safety Monitoring

**Ask Claude:**
```
Start a dangerous task (cutting with sharp tool).
Monitor safety in real-time and stop if needed.
```

**What Happens:**
1. Claude calls `nwo_enable_safety_monitoring`
2. Real-time safety checks every 50ms
3. Auto-stops if violation detected

**Claude's Response:**
```
Enabling Real-Time Safety Monitoring

Safety Configuration:
┌────────────────────────────────────────┐
│ Monitoring Interval: 50ms              │
│ Emergency Stop Response: <10ms         │
│ Force Limit: 25 N                      │
│ Speed Limit: 0.5 m/s                   │
│ Human Proximity: 1.5m (warning zone)   │
│ Collision Detection: Enabled           │
└────────────────────────────────────────┘

Starting dangerous operation: Tool cutting

[Monitoring Active]

T+0.0s: Task started
T+0.5s: Human detected at 2.0m (safe)
T+1.2s: Robot speed: 0.3 m/s (OK)
T+2.1s: Tool force: 18.5 N (OK)
T+3.0s: Human moved to 1.2m (warning!)
T+3.05s: Speed reduced to 0.2 m/s (auto-adjustment)
T+3.8s: Human raised hand (PAUSE gesture)
T+3.85s: ✓ Task paused instantly

Safety Report:
✓ No violations detected
✓ 47 safety checks passed
✓ 1 auto-adjustment (speed reduction)
✓ Total monitoring time: 3.85 seconds

Task is paused and in safe state.
Human can re-signal when ready.
```

---

### Example 4: ORCA Hand Tactile Sensing

**Ask Claude:**
```
Pick up a fragile egg using the ORCA hand. 
Detect slip in real-time and adjust grip automatically.
```

**What Happens:**
1. Claude calls `nwo_read_tactile`
2. Gets 576 taxel readings (16x16 per fingertip x 5 fingers)
3. Calls `nwo_detect_slip` to monitor for slip

**Claude's Response:**
```
Initializing ORCA Hand (5-finger dexterous hand)

Calibrating Tactile Sensors:
├─ Thumb: 256 taxels ✓
├─ Index: 256 taxels ✓
├─ Middle: 256 taxels ✓
├─ Ring: 256 taxels ✓
└─ Pinky: 256 taxels ✓
Total: 1,280 individual tactile sensors

Grasping fragile egg...

Grip Phase:
T+0.0s: Initial contact (light pressure)
T+0.2s: Pressure increasing (8 taxels active per finger)
T+0.4s: Full grasp established (stable grip, 2.1 N force)

Slip Detection:
T+0.4s: Baseline established (no slip)
T+0.6s: Force detected: 2.1 N ✓ Optimal
T+0.8s: Slip probability: <1% ✓ Stable
T+1.0s: Pressure distribution: Even ✓ Good

Lifting egg...
T+1.2s: Lift force applied (3.5 N total)
T+1.4s: Height: 5 cm, Slip risk: <1%
T+1.8s: Height: 15 cm, Slip risk: <1%
T+2.2s: Height: 25 cm, Slip risk: 0.1%

✓ Egg successfully grasped and lifted
✓ No slip detected
✓ Pressure evenly distributed
✓ All fingers contributing equally
✓ Excellent grip quality (confidence: 96%)

Tactile Feedback Summary:
- Object recognized as fragile
- Grip force automatically limited to 2.5 N
- Continuous monitoring active
- Ready to move to destination
```

---

### Example 5: Motion Planning with Collision Avoidance

**Ask Claude:**
```
Plan a path from the conveyor belt to the storage shelf.
Avoid the obstacle (tall machinery) in the middle.
```

**What Happens:**
1. Claude calls `nwo_plan_motion` (MoveIt2 integration)
2. Returns collision-free path
3. Shows waypoints and trajectory

**Claude's Response:**
```
Planning collision-free motion path...

Environment Analysis:
├─ Start position: Conveyor belt (0, 0, 1.0)
├─ Goal position: Storage shelf (5, 3, 1.2)
├─ Obstacle: Machinery at (2.5, 1.5, 0-2.0)
├─ Clear space: 6 x 4 meters
└─ Planning algorithm: RRT-Connect

Computing path...
[Searching for collision-free trajectory]

✓ PATH FOUND!

Planned Trajectory (8 waypoints):
┌──────────────────────────────────────┐
│ Start: (0.0, 0.0, 1.0)              │
│  ↓                                    │
│ Waypoint 1: (0.5, 0.0, 1.0) - Clear │
│  ↓                                    │
│ Waypoint 2: (1.2, 0.5, 1.1) - Clear │
│  ↓                                    │
│ Waypoint 3: (1.8, 1.2, 1.2) - Clear │
│  ↓                                    │
│ Waypoint 4: (2.0, 2.2, 1.3) - Clear │
│  ↓                                    │
│ Waypoint 5: (3.0, 2.8, 1.2) - Clear │
│  ↓                                    │
│ Waypoint 6: (4.2, 3.0, 1.1) - Clear │
│  ↓                                    │
│ Goal: (5.0, 3.0, 1.2)               │
└──────────────────────────────────────┘

Path Statistics:
├─ Distance: 6.2 meters
├─ Planning time: 150 ms
├─ Waypoints: 8
├─ Collision check: PASSED (all waypoints)
├─ Clearance from obstacle: 0.8m (safe)
└─ Estimated execution time: 12 seconds

Collision Avoidance:
✓ Path maintains 0.5m minimum clearance
✓ Smooth trajectory (no sharp angles)
✓ Joint velocity limits respected
✓ Singularity avoidance: PASSED

Ready to execute this collision-free path!
```

---

## Advanced Scenarios

### Scenario 1: Autonomous Warehouse Fleet Coordination

**Ask Claude:**
```
I have 3 robots in the warehouse. 
Coordinate them to pick up orders from 3 different locations
and deliver to the packing station without collisions.
```

**What Happens:**
1. Claude plans task distribution
2. Manages 3 robots autonomously
3. Coordinates to avoid collisions

**Claude's Response:**
```
Coordinating 3-robot warehouse fleet...

Task Analysis:
├─ Robot 1: Pick location A → Packing station
├─ Robot 2: Pick location B → Packing station
├─ Robot 3: Pick location C → Packing station
└─ Constraint: Avoid collisions between robots

Generated Coordination Plan:

PHASE 1 (0-5 seconds) - Robots moving to pick locations
├─ Robot 1: Path A (leftmost route)
├─ Robot 2: Path B (center route)
├─ Robot 3: Path C (rightmost route)
└─ Conflict check: NO COLLISIONS ✓

PHASE 2 (5-15 seconds) - Picking up items
├─ Robot 1: Pick order at A
├─ Robot 2: Pick order at B
├─ Robot 3: Pick order at C
└─ Parallel execution: All pick simultaneously

PHASE 3 (15-25 seconds) - Transport to packing station
├─ Robot 1: Returns via path A-1
├─ Robot 2: Returns via path B-1  (staggered 2 sec)
├─ Robot 3: Returns via path C-1  (staggered 4 sec)
└─ Collision avoidance: Dynamic handoff zones

Final Position:
├─ Robot 1: At packing station (ready for next task)
├─ Robot 2: Waiting at handoff zone
├─ Robot 3: Waiting at handoff zone
└─ All items delivered to packing station ✓

Coordination Metrics:
- Total time: 25 seconds
- Efficiency: 98% (no waiting/conflicts)
- Throughput: 3 orders processed
- Safety: All collision checks PASSED

Starting autonomous coordination now...
```

---

### Scenario 2: Continuous Learning & Improvement

**Ask Claude:**
```
I want the robot to learn from every task it performs
and gradually get better at picking tasks.
```

**What Happens:**
1. Claude logs every execution
2. Learns techniques that work
3. Gets better over time

**Claude's Response:**
```
Setting up Continuous Learning Pipeline

Learning Configuration:
├─ Recording: All task executions
├─ Analysis: Success/failure patterns
├─ Update frequency: Every 100 tasks
├─ Learning algorithm: RL + behavioral cloning
└─ Feedback loop: Active

Learning Cycle:

1. EXECUTE TASK
   ├─ Attempt pick-and-place
   ├─ Record: Joint angles, forces, sensor data
   └─ Log: Success/failure + metrics

2. ANALYZE
   ├─ Success rate: 85% (improving!)
   ├─ Average time: 8.2 seconds
   ├─ Most common failures: Grip slip (12%)
   └─ Highest success technique: Approach from top

3. RECOMMEND
   ├─ Next pick should: Approach from top angle
   ├─ Suggested grip force: 2.3 N
   ├─ Expected success: 92%
   └─ Confidence: High

4. APPLY IMPROVEMENTS
   ├─ Update parameters
   ├─ Deploy updated model
   └─ Test on next task

Learning Progress:
Day 1:  Success rate: 65%  (base)
Day 2:  Success rate: 72%  (+7%)
Day 3:  Success rate: 78%  (+6%)
Day 4:  Success rate: 84%  (+6%)
Day 5:  Success rate: 88%  (+4%)
Day 6:  Success rate: 91%  (+3%)
Day 7:  Success rate: 93%  (+2%)

Key Learnings Discovered:
✓ Top-down approach is 15% more reliable
✓ Gripper pre-positioning reduces slip by 20%
✓ Slower approach speed improves success
✓ Temperature compensation needed for hot parts

The robot is now EXPERT at this task!
```

---

## Getting Help

### View All Available Tools

**Ask Claude:**
```
What tools are available in the NWO Robotics plugin?
```

**Claude's Response:**
```
NWO Robotics Claude Plugin - Complete Tool List

INFERENCE & MODELS (3 tools)
├─ nwo_inference - Standard VLA inference
├─ nwo_inference_with_router - Auto-select best model
└─ nwo_edge_inference - Ultra-low latency (global)

ROBOT CONTROL (5 tools)
├─ nwo_query_robot_state - Get joint positions, battery, etc
├─ nwo_execute_actions - Send commands to robot
├─ nwo_sensor_fusion - Multi-modal sensor processing
├─ nwo_send_ros2_action - Control real ROS2 robots
└─ nwo_get_ros2_state - Check physical robot status

TASK PLANNING (4 tools)
├─ nwo_task_planner - Break down complex tasks
├─ nwo_execute_subtask - Execute plan step-by-step
├─ nwo_get_learning_recommendations - Get suggestions
└─ nwo_log_task_execution - Record for learning

SLAM & LOCALIZATION (2 tools)
├─ nwo_initialize_slam - Create map of environment
└─ nwo_localize - Remember and return to locations

VISION & PERCEPTION (2 tools)
├─ nwo_detect_objects_grounding - Identify any object
├─ nwo_detect_gesture - Hand gesture recognition
└─ nwo_process_voice_command - Voice control

REINFORCEMENT LEARNING (2 tools)
├─ nwo_create_rl_env - Setup training environment
└─ nwo_train_policy - Train robot policies (PPO, SAC, etc)

SAFETY & MONITORING (3 tools)
├─ nwo_check_safety - Validate actions
├─ nwo_emergency_stop - Halt robot immediately
└─ nwo_enable_safety_monitoring - Continuous monitoring

TACTILE SENSING (2 tools)
├─ nwo_read_tactile - ORCA Hand sensor readings
└─ nwo_detect_slip - Detect object slipping

MOTION PLANNING (1 tool)
├─ nwo_plan_motion - MoveIt2 collision-free paths

AGENT MANAGEMENT (3 tools)
├─ nwo_agent_self_register - Create agent account
├─ nwo_agent_check_balance - View quota usage
└─ nwo_agent_pay - Upgrade subscription tier

DISCOVERY & INFO (2 tools)
├─ nwo_test_dry_run - Validate without executing
└─ nwo_agent_discovery - Learn system capabilities

TOTAL: 31 core tools + extended feature set

Use "Show me documentation for [tool name]" 
for detailed information about any tool.
```

---

### Get Documentation for Specific Features

**Ask Claude:**
```
Show me documentation for the swarm features
```

**Claude's Response:**
```
NWO Robotics - Multi-Agent Coordination (Swarm) Features

OVERVIEW:
Coordinate multiple robots to work together on complex tasks
without centralized control. Each robot operates autonomously
while respecting collision constraints and shared goals.

AVAILABLE CAPABILITIES:

1. MULTI-ROBOT TASK DISTRIBUTION
   └─ Automatically assign tasks to available robots
   └─ Consider robot capabilities and locations
   └─ Minimize travel time and conflicts

2. COLLISION AVOIDANCE
   └─ Real-time path planning between robots
   └─ Maintains safety zones around each robot
   └─ Dynamic replanning if obstacles appear

3. COORDINATED MOTION
   └─ Robots move in sequence to avoid collisions
   └─ Handoff zones for passing work between robots
   └─ Traffic management in shared workspaces

4. SHARED RESOURCE MANAGEMENT
   └─ Prevent multiple robots from using same tool
   └─ Queue management for shared equipment
   └─ Synchronization for dependent tasks

5. PROGRESS MONITORING
   └─ Track all robots in real-time
   └─ Report task completion
   └─ Alert on failures or conflicts

EXAMPLE USE CASES:

Case 1: Warehouse Picking
├─ 10 robots coordinate to pick orders
├─ Each picks from different locations
├─ All deliver to packing station
└─ No collisions, optimal efficiency

Case 2: Manufacturing Assembly
├─ Multiple robots assemble product
├─ Robot A: Install component 1
├─ Robot B: Install component 2 (waits for A)
├─ Robot C: Test assembly
└─ Sequential but parallel where possible

Case 3: Inspection Swarm
├─ Drones inspect warehouse ceiling
├─ Each covers different grid
├─ Communicate findings
├─ Return to dock simultaneously
└─ Aggregate results

GETTING STARTED:
1. Register multiple robots (nwo_register_agent)
2. Use nwo_task_planner with swarm context
3. Monitor with nwo_agent_discovery
4. Execute coordinated tasks

Questions? Ask "Show me an example of [specific scenario]"
```

---

### Get Feature Examples

**Ask Claude:**
```
Give me an example of sensor fusion
```

**Claude's Response:**
```
Sensor Fusion Example: Smart Picking in Variable Conditions

Scenario:
Pick hot metal parts from a conveyor belt while maintaining
safety and precision in a dynamic warehouse environment.

Available Sensors:
├─ Camera: Part location, color, size
├─ Thermal: Temperature of part and surroundings
├─ Proximity: Distance to obstacles
├─ Force/Torque: Grip force, applied loads
├─ Accelerometer: Vibration and movement
└─ GPS: Absolute positioning in warehouse

Single-Sensor Approach (Limited):
```
Camera only: "There's a red part at (0.5, 0.3)"
→ Ignores temperature → Burn risk!
→ Ignores obstacles → Collision risk!
→ Ignores force → Damage risk!
```

Fused-Sensor Approach (Smart):
```
Camera: Red part detected at (0.5, 0.3)
Thermal: Part temperature 82°C (hot!)
Proximity: Obstacle 0.2m away (close!)
Force: Current grip: 0 N (ready)
Weather: Humid environment detected

Analysis:
├─ Part IS hot → Need temperature-resistant gripper
├─ Obstacle nearby → Approach angle must change
├─ Humidity high → Increased slip risk
└─ Thermal zone at (0.4, 0.2) → AVOID

Context-Aware Actions:
1. Switch to heat-resistant gripper
2. Plan approach from side (avoid obstacle)
3. Reduce grip force to prevent slip (2.5 N max)
4. Slow speed (0.1 m/s) for humid conditions
5. Monitor thermal drift during pickup
6. Take alternative path around thermal zone

Results:
✓ Part picked safely (82°C)
✓ No gripper damage
✓ No collisions
✓ No slip
✓ Optimal execution time
```

Key Insight:
Multiple sensors together = intelligent decisions
One sensor alone = limited capability

Fusion Benefits:
- 40% fewer failures
- 30% faster execution
- Better safety margins
- Adaptive to conditions

Want to enable sensor fusion for your next task?
```

---

## Troubleshooting

### Common Issues & Solutions

**Issue: "Connection timeout"**
```
Q: I keep getting connection timeouts when calling the API
A: Try these solutions:

1. Use Edge API instead of Standard
   (Edge has 200+ global locations)
   
2. Check network stability
   (Robot needs 10+ Mbps connection)
   
3. Verify API key is correct
   (Check formatting: sk_live_...)
   
4. Try smaller requests first
   (Large images can timeout)
   
5. Upgrade if quota is low
   (Rate limiting can cause timeouts)
```

**Issue: "Safety violation - force too high"**
```
Q: Robot keeps exceeding force limits
A: Solutions:

1. Reduce grip force parameter
   (From 5 N to 3 N)
   
2. Use "gentle_grip" technique
   (Documented in learning recommendations)
   
3. Approach slower
   (Less momentum = less force spike)
   
4. Use different end effector
   (Some grippers have lower limits)
   
5. Split task into smaller steps
   (Reduce load on any single action)
```

**Issue: "Quota exceeded"**
```
Q: I ran out of quota mid-project
A: Immediate solutions:

1. Upgrade to next tier (Prototype/Production)
   
2. Wait for quota reset (next month)
   
3. Optimize API calls
   ├─ Use caching
   ├─ Batch operations
   └─ Reduce discovery calls
   
4. Archive unused projects
   (Free up quota from old tasks)
```

**Issue: "No collision-free path found"**
```
Q: Motion planner can't find a path
A: Try these:

1. Expand planning time
   (Let planner search longer)
   
2. Check goal is reachable
   (Maybe it's physically impossible)
   
3. Remove obstacles
   (Clear path for robot)
   
4. Use different approach angle
   (Top-down vs side approach)
   
5. Try simpler path
   (Via waypoints instead of direct)
```

---

## Quick Reference

### Command Examples

```bash
# Check quota
"Check my API usage and quota"

# List tools
"What tools are available?"

# Get documentation
"Show me documentation for the swarm features"

# See examples
"Give me an example of sensor fusion"

# Control robot
"Pick up the red box from the table"

# Get help
"How do I reduce API usage?"

# Handle errors
"I got a safety violation, what do I do?"

# Learn features
"Teach the robot a new technique"

# Monitor task
"Show me the real-time status of the robot"

# Upgrade
"I need more API quota, what are my options?"
```

---

## Tips & Best Practices

1. **Always validate first**
   - Use `nwo_test_dry_run` before executing
   - Saves quota and prevents failures

2. **Log everything**
   - Use `nwo_log_task_execution`
   - Enables learning and improvement

3. **Monitor actively**
   - Enable `nwo_enable_safety_monitoring`
   - Prevents accidents

4. **Cache discoveries**
   - Call `nwo_agent_discovery` once
   - Reuse results for many tasks

5. **Use sensor fusion**
   - Combine multiple sensors
   - Better decisions, fewer failures

6. **Batch operations**
   - Plan multiple tasks together
   - Reduce API calls by 60%+

7. **Learn from failures**
   - Log what went wrong
   - Get recommendations for next time

8. **Optimize for your use case**
   - Understand your bottleneck
   - Focus on that specific issue

---

## Need More Help?

**Ask Claude any of these:**
- "What tools are available in the NWO Robotics plugin?"
- "Show me documentation for [feature name]"
- "Give me an example of [task name]"
- "How do I [accomplish something]?"
- "What are the best practices for [use case]?"
- "How can I reduce my API usage?"
- "I got an error: [error message]. What do I do?"
- "Teach me about [feature]"
- "Can you help me debug this [problem]?"

---

**Plugin Version**: 2.0.0  
**Last Updated**: April 2026  
**Status**: Production Ready ✅

*For more detailed documentation, visit:* https://github.com/RedCiprianPater/nwo-claude-plugin

