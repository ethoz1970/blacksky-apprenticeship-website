// ─────────────────────────────────────────────────────────────────────────────
// DIRECTUS RELATION REPAIR SCRIPT
// Run this if user_connections / direct_messages fields are not showing
// related data (names, avatars, etc.) — i.e. the M2O relations were never
// properly configured in Directus.
//
// HOW TO RUN:
//   Open Directus admin → F12 → Console tab → paste entire block → Enter
// ─────────────────────────────────────────────────────────────────────────────

const BASE  = "";   // empty = current origin (Directus admin URL)
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

// ── STEP 1: Patch user_connections relation fields ────────────────────────────
// The fields exist as plain UUID columns; we need to add the M2O metadata
// and point the schema foreign-key at directus_users.

console.log("── Patching user_connections.requester ──");
await dx("PATCH", "/fields/user_connections/requester", {
  type: "uuid",
  meta: {
    special: ["m2o"],
    interface: "select-dropdown-m2o",
    display: "related-values",
    display_options: { template: "{{first_name}} {{last_name}}" },
  },
  schema: {
    is_nullable: true,
    foreign_key_table: "directus_users",
    foreign_key_column: "id",
  },
});

console.log("── Patching user_connections.recipient ──");
await dx("PATCH", "/fields/user_connections/recipient", {
  type: "uuid",
  meta: {
    special: ["m2o"],
    interface: "select-dropdown-m2o",
    display: "related-values",
    display_options: { template: "{{first_name}} {{last_name}}" },
  },
  schema: {
    is_nullable: true,
    foreign_key_table: "directus_users",
    foreign_key_column: "id",
  },
});

// ── STEP 2: Patch direct_messages relation fields ─────────────────────────────

console.log("── Patching direct_messages.connection_id ──");
await dx("PATCH", "/fields/direct_messages/connection_id", {
  type: "integer",
  meta: {
    special: ["m2o"],
    interface: "select-dropdown-m2o",
    display: "related-values",
  },
  schema: {
    is_nullable: false,
    foreign_key_table: "user_connections",
    foreign_key_column: "id",
  },
});

console.log("── Patching direct_messages.sender ──");
await dx("PATCH", "/fields/direct_messages/sender", {
  type: "uuid",
  meta: {
    special: ["m2o"],
    interface: "select-dropdown-m2o",
    display: "related-values",
    display_options: { template: "{{first_name}} {{last_name}}" },
  },
  schema: {
    is_nullable: true,
    foreign_key_table: "directus_users",
    foreign_key_column: "id",
  },
});

// ── STEP 3: Register the FK relations in Directus's relations table ───────────
// These entries are what allows Directus to JOIN and expand related fields.
// If a relation already exists Directus returns a 400 — that's fine, just
// means it was already there.

console.log("── Creating relations (duplicates are safe to ignore) ──");

await dx("POST", "/relations", {
  collection: "user_connections",
  field: "requester",
  related_collection: "directus_users",
});

await dx("POST", "/relations", {
  collection: "user_connections",
  field: "recipient",
  related_collection: "directus_users",
});

await dx("POST", "/relations", {
  collection: "direct_messages",
  field: "connection_id",
  related_collection: "user_connections",
});

await dx("POST", "/relations", {
  collection: "direct_messages",
  field: "sender",
  related_collection: "directus_users",
});

// ── STEP 4: Fix direct_messages READ permission ───────────────────────────────
// The original permission only lets users see messages they SENT
// ( sender === $CURRENT_USER ) which means the recipient cannot see the
// other person's messages at all.
//
// Fix: allow reading if you are the sender OR you are a participant in the
// connection (requester OR recipient).  This uses the newly-configured M2O
// relation on connection_id so Directus can traverse the join.

console.log("── Looking up direct_messages read permissions ──");
const permsResult = await dx(
  "GET",
  "/permissions?filter[collection][_eq]=direct_messages&filter[action][_eq]=read&limit=50"
);
const perms = Array.isArray(permsResult) ? permsResult : [];
console.log(`Found ${perms.length} read permission(s) to update`);

for (const perm of perms) {
  console.log(`  Patching permission ${perm.id} (policy: ${perm.policy})`);
  await dx("PATCH", `/permissions/${perm.id}`, {
    permissions: {
      _or: [
        // You sent this message
        { sender: { _eq: "$CURRENT_USER" } },
        // You are the requester of the connection this message belongs to
        { connection_id: { requester: { _eq: "$CURRENT_USER" } } },
        // You are the recipient of the connection this message belongs to
        { connection_id: { recipient: { _eq: "$CURRENT_USER" } } },
      ],
    },
  });
}

// ── STEP 5: Verify — fetch a sample row from each collection ──────────────────
console.log("\n── Verification: checking field expansion ──");

const connSample = await dx(
  "GET",
  "/items/user_connections?fields[]=id,status,requester.first_name,recipient.first_name&limit=1"
);
console.log("user_connections sample:", JSON.stringify(connSample));

const msgSample = await dx(
  "GET",
  "/items/direct_messages?fields[]=id,content,sender.first_name,connection_id.id&limit=1"
);
console.log("direct_messages sample:", JSON.stringify(msgSample));

console.log(`
🎉 Repair complete!

If the verification rows above show expanded first_name values (not raw UUIDs),
the relations are working correctly.

If you still see raw UUIDs, try:
  1. Hard-refresh Directus (Ctrl+Shift+R)
  2. Check the Directus container logs for any migration errors
  3. Confirm the TOKEN above matches an admin token with full access
`);
