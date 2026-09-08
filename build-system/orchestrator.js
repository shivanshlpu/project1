#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'graph_state.json');

function loadState() {
  if (!fs.existsSync(STATE_FILE)) {
    console.error('Error: graph_state.json not found!');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function printStatus() {
  const state = loadState();
  console.log(`\n=== ${state.project} (v${state.version}) — Build Graph Status ===`);
  console.log(`Active Node: ${state.active_node || 'None'}\n`);

  const rows = Object.values(state.nodes).map((n) => {
    let statusColor = '\x1b[37m';
    if (n.status === 'DONE') statusColor = '\x1b[32m'; // green
    else if (n.status === 'IN_PROGRESS') statusColor = '\x1b[33m'; // yellow
    else if (n.status === 'BLOCKED') statusColor = '\x1b[31m'; // red
    else if (n.status === 'IN_REVIEW') statusColor = '\x1b[36m'; // cyan

    return {
      ID: n.id,
      Name: n.name.substring(0, 30),
      Role: n.owner_agent_role,
      Status: `${statusColor}${n.status}\x1b[0m`,
      Retries: n.retry_count,
      DependsOn: n.depends_on.join(', ') || '—'
    };
  });

  console.table(rows);
}

function inspectNode(nodeId) {
  const state = loadState();
  const node = state.nodes[nodeId];
  if (!node) {
    console.error(`Node not found: ${nodeId}`);
    return;
  }
  console.log(`\n--- Node Details: ${node.id} ---`);
  console.log(JSON.stringify(node, null, 2));
}

function updateNode(nodeId, newStatus, summary) {
  const state = loadState();
  const node = state.nodes[nodeId];
  if (!node) {
    console.error(`Node not found: ${nodeId}`);
    return;
  }

  const validStatuses = ['NOT_STARTED', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE'];
  if (!validStatuses.includes(newStatus)) {
    console.error(`Invalid status: ${newStatus}. Must be one of: ${validStatuses.join(', ')}`);
    return;
  }

  if (newStatus === 'BLOCKED' || (node.qa_result && node.qa_result.status === 'fail')) {
    node.retry_count += 1;
    if (node.retry_count > 3) {
      console.warn(`\n[ALERT] Node ${nodeId} has exceeded max retries (3)! ESCALATING to human (Shiva).`);
      node.status = 'BLOCKED';
      saveState(state);
      return;
    }
  }

  node.status = newStatus;
  if (summary) {
    node.qa_result = { status: newStatus === 'DONE' ? 'pass' : 'pending', summary };
  }
  node.last_updated_by = process.env.AGENT_ROLE || 'orchestrator';

  // Automatically advance active_node if completed
  if (newStatus === 'DONE') {
    const nextNode = Object.values(state.nodes).find((n) => {
      if (n.status === 'NOT_STARTED') {
        const allDepsDone = n.depends_on.every((depId) => state.nodes[depId]?.status === 'DONE');
        return allDepsDone;
      }
      return false;
    });
    if (nextNode) {
      state.active_node = nextNode.id;
      nextNode.status = 'IN_PROGRESS';
      console.log(`\nAdvanced active node to: ${nextNode.id} (${nextNode.name})`);
    }
  }

  saveState(state);
  console.log(`Updated ${nodeId} status to ${newStatus}`);
}

function generatePrompt(nodeId) {
  const state = loadState();
  const node = state.nodes[nodeId];
  if (!node) {
    console.error(`Node not found: ${nodeId}`);
    return;
  }

  const depOutputs = node.depends_on
    .map((depId) => {
      const dep = state.nodes[depId];
      return `[${depId} (${dep.name})]: ${(dep.outputs || []).join(', ') || 'Done'}`;
    })
    .join('\n');

  const prompt = `
================ WORKER AGENT TASK BRIEF ================
You are the ${node.owner_agent_role.toUpperCase()} Agent for AHTRI FFA.
Current Node: ${node.id} — ${node.name}

Inputs & Dependencies Available:
${depOutputs || 'None'}

Node Inputs Spec:
${(node.inputs || []).map((i) => `- ${i}`).join('\n')}

Definition of Done (DoD) Checklist:
${(node.dof_checklist || []).map((item) => `[ ] ${item}`).join('\n')}

Hard Boundaries:
- Do not invent endpoints outside the API catalog.
- Distance calculations MUST be recomputed on the server. Never trust client values.
- Enforce server-side RBAC on all routes.
- Produce output manifest and code.
=========================================================
`;
  console.log(prompt);
}

const args = process.argv.slice(2);
const command = args[0] || 'status';

switch (command) {
  case 'status':
    printStatus();
    break;
  case 'inspect':
    inspectNode(args[1]);
    break;
  case 'update':
    updateNode(args[1], args[2], args.slice(3).join(' '));
    break;
  case 'prompt':
    generatePrompt(args[1]);
    break;
  default:
    console.log(`Unknown command: ${command}`);
    console.log('Usage: node orchestrator.js [status|inspect <id>|update <id> <status> <notes>|prompt <id>]');
}
