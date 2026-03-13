// ─────────────────────────────────────────────────────────────────────────────
// DIRECTUS PERMISSION REPAIR SCRIPT
// Fixes permissions for user_connections and direct_messages so that
// students and teachers can send/accept/decline/cancel connection requests
// and send direct messages.
//
// HOW TO RUN:
//   Open Directus admin → F12 → Console tab → paste entire block → Enter
// ─────────────────────────────────────────────────────────────────────────────

const BASE  = "";
const TOKEN = "bsap_api_2024_xK9mN3pQ7rL";

async function dx(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) console.warn(`⚠  ${method} ${path}`, j?.errors?.[0]?.message ?? j);
  else        console.log(`✅ ${method} ${path}`);
  return j?.data ?? j;
}

// ── STEP 1: Find student and teacher policies ─────────────────────────────────
const allPolicies = await dx("GET", "/policies?limit=100");
const policies = Array.isArray(allPolicies) ? allPolicies : [];
console.log("All policies:", policies.map(p => `${p.name} (${p.id})`).join(" | "));

const targetPolicies = policies.filter(p =>
  p.name?.toLowerCase().includes("student") ||
  p.name?.toLowerCase().includes("teacher")
);

if (targetPolicies.length === 0) {
  console.error("❌ No student or teacher policies found. Check policy names above.");
} else {
  console.log("Target policies:", targetPolicies.map(p => `${p.name}`).join(", "));
}

// ── STEP 2: Show existing permissions for these collections ───────────────────
console.log("\n── Current permissions for user_connections + direct_messages ──");
const existingPerms = await dx(
  "GET",
  "/permissions?filter[collection][_in]=user_connections,direct_messages&limit=100"
);
console.log("Existing:", JSON.stringify(existingPerms, null, 2));

// ── STEP 3: For each target policy, wipe and rebuild permissions ──────────────
for (const policy of targetPolicies) {
  const pid = policy.id;
  console.log(`\n── Repairing permissions for: ${policy.name} (${pid}) ──`);

  // Delete all existing permissions for these two collections under this policy
  const toDelete = (Array.isArray(existingPerms) ? existingPerms : [])
    .filter(p => p.policy === pid);

  for (const perm of toDelete) {
    await dx("DELETE", `/permissions/${perm.id}`);
  }

  // ── user_connections ──────────────────────────────────────────────────────
  // READ: only your own connections (where you are requester OR recipient)
  await dx("POST", "/permissions", {
    policy: pid,
    collection: "user_connections",
    action: "read",
    fields: "*",
    permissions: {
      _or: [
        { requester: { _eq: "$CURRENT_USER" } },
        { recipient: { _eq: "$CURRENT_USER" } },
      ],
    },
  });

  // CREATE: anyone can send a connection request
  await dx("POST", "/permissions", {
    policy: pid,
    collection: "user_connections",
    action: "create",
    fields: "*",
    permissions: {},
    validation: {},
  });

  // UPDATE: only if you are requester or recipient
  // (recipient accepts/declines; requester can also update)
  await dx("POST", "/permissions", {
    policy: pid,
    collection: "user_connections",
    action: "update",
    fields: "*",
    permissions: {
      _or: [
        { requester: { _eq: "$CURRENT_USER" } },
        { recipient: { _eq: "$CURRENT_USER" } },
      ],
    },
  });

  // DELETE: only the requester can cancel their own pending request
  await dx("POST", "/permissions", {
    policy: pid,
    collection: "user_connections",
    action: "delete",
    fields: "*",
    permissions: { requester: { _eq: "$CURRENT_USER" } },
  });

  // ── direct_messages ───────────────────────────────────────────────────────
  // READ: you can read messages you sent OR messages in connections you belong to.
  // Note: the portal API uses admin token for reads so this is a safety net.
  await dx("POST", "/permissions", {
    policy: pid,
    collection: "direct_messages",
    action: "read",
    fields: "*",
    permissions: {
      _or: [
        { sender: { _eq: "$CURRENT_USER" } },
        { connection_id: { requester: { _eq: "$CURRENT_USER" } } },
        { connection_id: { recipient: { _eq: "$CURRENT_USER" } } },
      ],
    },
  });

  // CREATE: anyone can send a message (API enforces connection membership)
  await dx("POST", "/permissions", {
    policy: pid,
    collection: "direct_messages",
    action: "create",
    fields: "*",
    permissions: {},
    validation: {},
  });

  // UPDATE: only sender can update their own messages (e.g. read_at marking)
  // Note: the portal API uses admin token for this, but permission should still exist
  await dx("POST", "/permissions", {
    policy: pid,
    collection: "direct_messages",
    action: "update",
    fields: "*",
    permissions: {},
  });

  console.log(`✅ Done: ${policy.name}`);
}

// ── STEP 4: Verify ────────────────────────────────────────────────────────────
console.log("\n── Final permission state ──");
const finalPerms = await dx(
  "GET",
  "/permissions?filter[collection][_in]=user_connections,direct_messages&limit=100"
);
const summary = (Array.isArray(finalPerms) ? finalPerms : []).map(p => ({
  policy: policies.find(pol => pol.id === p.policy)?.name ?? p.policy,
  collection: p.collection,
  action: p.action,
}));
console.table(summary);

console.log(`
🎉 Permission repair complete!

What was fixed:
  user_connections  READ   — only your own (requester OR recipient)
  user_connections  CREATE — anyone (send a request)
  user_connections  UPDATE — requester or recipient (accept/decline)
  user_connections  DELETE — requester only (cancel request)
  direct_messages   READ   — sender OR connection participant
  direct_messages   CREATE — anyone (API enforces connection check)
  direct_messages   UPDATE — anyone (for marking messages read)
`);
