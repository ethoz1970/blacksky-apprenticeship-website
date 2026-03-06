// ─────────────────────────────────────────────────────────────────────────────
// PASTE THIS ENTIRE BLOCK into the Directus admin browser console.
// Open Directus admin → F12 → Console tab → paste → Enter
// ─────────────────────────────────────────────────────────────────────────────

const BASE = "";          // empty = uses current origin (Directus admin URL)
const TOKEN = "bsap_api_2024_xK9mN3pQ7rL";

async function dx(method, path, body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) console.warn(`⚠ ${method} ${path}`, j?.errors?.[0]?.message ?? j);
  else console.log(`✅ ${method} ${path}`);
  return j?.data ?? j;
}

// ── 1. community_posts ───────────────────────────────────────────────────────
await dx("POST", "/collections", {
  collection: "community_posts",
  meta: { icon: "forum", hidden: false, singleton: false },
  schema: {},
  fields: [
    { field: "id",           type: "integer",   schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true } },
    { field: "date_created", type: "timestamp", meta: { special: ["date-created"], readonly: true, hidden: true }, schema: {} },
    { field: "date_updated", type: "timestamp", meta: { special: ["date-updated"], readonly: true, hidden: true }, schema: {} },
    { field: "content",      type: "text",      meta: { interface: "input-multiline", required: true }, schema: { is_nullable: false } },
    { field: "scope",        type: "string",    meta: { interface: "select-dropdown", options: { choices: [{ text: "Global", value: "global" }, { text: "Class", value: "class" }] }, default_value: "global" }, schema: { default_value: "global", is_nullable: false } },
    { field: "link_url",     type: "string",    meta: { interface: "input" }, schema: { is_nullable: true } },
    { field: "link_title",   type: "string",    meta: { interface: "input" }, schema: { is_nullable: true } },
    { field: "link_description", type: "text", meta: { interface: "input-multiline" }, schema: { is_nullable: true } },
    { field: "link_image",   type: "string",    meta: { interface: "input" }, schema: { is_nullable: true } },
  ],
});

// author FK
await dx("POST", "/fields/community_posts", {
  field: "author", type: "uuid",
  meta: { special: ["m2o"], interface: "select-dropdown-m2o", display: "related-values", display_options: { template: "{{first_name}} {{last_name}}" } },
  schema: { is_nullable: true, foreign_key_table: "directus_users", foreign_key_column: "id" },
});

// class_id FK
await dx("POST", "/fields/community_posts", {
  field: "class_id", type: "integer",
  meta: { special: ["m2o"], interface: "select-dropdown-m2o" },
  schema: { is_nullable: true, foreign_key_table: "classes", foreign_key_column: "id" },
});

// image file
await dx("POST", "/fields/community_posts", {
  field: "image", type: "uuid",
  meta: { special: ["file"], interface: "file-image" },
  schema: { is_nullable: true, foreign_key_table: "directus_files", foreign_key_column: "id" },
});

// attachment file
await dx("POST", "/fields/community_posts", {
  field: "attachment", type: "uuid",
  meta: { special: ["file"], interface: "file" },
  schema: { is_nullable: true, foreign_key_table: "directus_files", foreign_key_column: "id" },
});

// ── 2. community_comments ────────────────────────────────────────────────────
await dx("POST", "/collections", {
  collection: "community_comments",
  meta: { icon: "comment", hidden: false, singleton: false },
  schema: {},
  fields: [
    { field: "id",           type: "integer", schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true } },
    { field: "date_created", type: "timestamp", meta: { special: ["date-created"], readonly: true, hidden: true }, schema: {} },
    { field: "content",      type: "text", meta: { interface: "input-multiline", required: true }, schema: { is_nullable: false } },
  ],
});

await dx("POST", "/fields/community_comments", {
  field: "post_id", type: "integer",
  meta: { special: ["m2o"], interface: "select-dropdown-m2o" },
  schema: { is_nullable: false, foreign_key_table: "community_posts", foreign_key_column: "id" },
});

await dx("POST", "/fields/community_comments", {
  field: "author", type: "uuid",
  meta: { special: ["m2o"], interface: "select-dropdown-m2o", display: "related-values", display_options: { template: "{{first_name}} {{last_name}}" } },
  schema: { is_nullable: true, foreign_key_table: "directus_users", foreign_key_column: "id" },
});

await dx("POST", "/relations", {
  collection: "community_comments", field: "post_id", related_collection: "community_posts",
  meta: { many_collection: "community_comments", many_field: "post_id", one_collection: "community_posts", one_field: "comments" },
});

// ── 3. user_connections ──────────────────────────────────────────────────────
await dx("POST", "/collections", {
  collection: "user_connections",
  meta: { icon: "people", hidden: false, singleton: false },
  schema: {},
  fields: [
    { field: "id",           type: "integer", schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true } },
    { field: "date_created", type: "timestamp", meta: { special: ["date-created"], readonly: true, hidden: true }, schema: {} },
    { field: "status",       type: "string", meta: { interface: "select-dropdown", options: { choices: [{ text: "Pending", value: "pending" }, { text: "Accepted", value: "accepted" }, { text: "Declined", value: "declined" }] } }, schema: { default_value: "pending", is_nullable: false } },
  ],
});

await dx("POST", "/fields/user_connections", {
  field: "requester", type: "uuid",
  meta: { special: ["m2o"], interface: "select-dropdown-m2o", display: "related-values", display_options: { template: "{{first_name}} {{last_name}}" } },
  schema: { is_nullable: true, foreign_key_table: "directus_users", foreign_key_column: "id" },
});

await dx("POST", "/fields/user_connections", {
  field: "recipient", type: "uuid",
  meta: { special: ["m2o"], interface: "select-dropdown-m2o", display: "related-values", display_options: { template: "{{first_name}} {{last_name}}" } },
  schema: { is_nullable: true, foreign_key_table: "directus_users", foreign_key_column: "id" },
});

// ── 4. direct_messages ───────────────────────────────────────────────────────
await dx("POST", "/collections", {
  collection: "direct_messages",
  meta: { icon: "chat_bubble", hidden: false, singleton: false },
  schema: {},
  fields: [
    { field: "id",           type: "integer", schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true } },
    { field: "date_created", type: "timestamp", meta: { special: ["date-created"], readonly: true, hidden: true }, schema: {} },
    { field: "content",      type: "text", meta: { interface: "input-multiline", required: true }, schema: { is_nullable: false } },
    { field: "read_at",      type: "timestamp", meta: { hidden: true }, schema: { is_nullable: true } },
  ],
});

await dx("POST", "/fields/direct_messages", {
  field: "connection_id", type: "integer",
  meta: { special: ["m2o"], interface: "select-dropdown-m2o" },
  schema: { is_nullable: false, foreign_key_table: "user_connections", foreign_key_column: "id" },
});

await dx("POST", "/fields/direct_messages", {
  field: "sender", type: "uuid",
  meta: { special: ["m2o"], interface: "select-dropdown-m2o", display: "related-values", display_options: { template: "{{first_name}} {{last_name}}" } },
  schema: { is_nullable: true, foreign_key_table: "directus_users", foreign_key_column: "id" },
});

// ── 5. Permissions ───────────────────────────────────────────────────────────
// Get all policies to find student + teacher
const policiesRes = await dx("GET", "/policies?limit=50");
const policies = Array.isArray(policiesRes) ? policiesRes : [];
console.log("Policies:", policies.map(p => `${p.name}: ${p.id}`).join(" | "));

const studentPolicy = policies.find(p => p.name?.toLowerCase().includes("student"));
const teacherPolicy = policies.find(p => p.name?.toLowerCase().includes("teacher"));

for (const policy of [studentPolicy, teacherPolicy].filter(Boolean)) {
  const pid = policy.id;
  console.log(`Setting permissions for policy: ${policy.name} (${pid})`);

  // community_posts — read all, create/update/delete own
  await dx("POST", "/permissions", { policy: pid, collection: "community_posts",    action: "read",   fields: "*", permissions: {} });
  await dx("POST", "/permissions", { policy: pid, collection: "community_posts",    action: "create", fields: "*", permissions: {}, validation: {} });
  await dx("POST", "/permissions", { policy: pid, collection: "community_posts",    action: "update", fields: "*", permissions: { author: { _eq: "$CURRENT_USER" } } });
  await dx("POST", "/permissions", { policy: pid, collection: "community_posts",    action: "delete", fields: "*", permissions: { author: { _eq: "$CURRENT_USER" } } });

  // community_comments — read all, create/update/delete own
  await dx("POST", "/permissions", { policy: pid, collection: "community_comments", action: "read",   fields: "*", permissions: {} });
  await dx("POST", "/permissions", { policy: pid, collection: "community_comments", action: "create", fields: "*", permissions: {}, validation: {} });
  await dx("POST", "/permissions", { policy: pid, collection: "community_comments", action: "update", fields: "*", permissions: { author: { _eq: "$CURRENT_USER" } } });
  await dx("POST", "/permissions", { policy: pid, collection: "community_comments", action: "delete", fields: "*", permissions: { author: { _eq: "$CURRENT_USER" } } });

  // user_connections — read own (requester or recipient), create/update own
  await dx("POST", "/permissions", { policy: pid, collection: "user_connections",   action: "read",   fields: "*", permissions: { _or: [{ requester: { _eq: "$CURRENT_USER" } }, { recipient: { _eq: "$CURRENT_USER" } }] } });
  await dx("POST", "/permissions", { policy: pid, collection: "user_connections",   action: "create", fields: "*", permissions: {}, validation: {} });
  await dx("POST", "/permissions", { policy: pid, collection: "user_connections",   action: "update", fields: "*", permissions: { _or: [{ requester: { _eq: "$CURRENT_USER" } }, { recipient: { _eq: "$CURRENT_USER" } }] } });
  await dx("POST", "/permissions", { policy: pid, collection: "user_connections",   action: "delete", fields: "*", permissions: { requester: { _eq: "$CURRENT_USER" } } });

  // direct_messages — read own, create/update own
  await dx("POST", "/permissions", { policy: pid, collection: "direct_messages",    action: "read",   fields: "*", permissions: { sender: { _eq: "$CURRENT_USER" } } });
  await dx("POST", "/permissions", { policy: pid, collection: "direct_messages",    action: "create", fields: "*", permissions: {}, validation: {} });
  await dx("POST", "/permissions", { policy: pid, collection: "direct_messages",    action: "update", fields: "*", permissions: { sender: { _eq: "$CURRENT_USER" } } });
}

console.log("\n🎉 All done! Collections and permissions created.");
