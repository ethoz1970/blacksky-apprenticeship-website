/**
 * Run once to create all community collections + permissions in Directus.
 * Usage: node scripts/setup-community.js
 */

const DIRECTUS_URL = "https://directus-production-21fe.up.railway.app";
const ADMIN_TOKEN  = "bsap_api_2024_xK9mN3pQ7rL";

// Role IDs (from existing setup)
const STUDENT_ROLE_ID = "17d4e32e-b8cc-4beb-9f78-86bc3b20793d";
const TEACHER_ROLE_ID = "1d86ef5e-2b3a-4c1f-8e9d-7a6b5c4d3e2f"; // update if different

async function api(method, path, body) {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${ADMIN_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  if (!res.ok) {
    console.warn(`⚠  ${method} ${path} → ${res.status}`, json?.errors?.[0]?.message || json);
    return null;
  }
  return json?.data ?? json;
}

async function createCollection(name, fields) {
  console.log(`\n📦 Creating collection: ${name}`);
  await api("POST", "/collections", {
    collection: name,
    meta: { icon: "chat", hidden: false },
    schema: { name },
    fields,
  });
}

async function addField(collection, field) {
  console.log(`  + field: ${collection}.${field.field}`);
  return await api("POST", `/fields/${collection}`, field);
}

async function createRelation(rel) {
  console.log(`  → relation: ${rel.collection}.${rel.field} → ${rel.related_collection}`);
  return await api("POST", "/relations", rel);
}

async function createPermission(perm) {
  return await api("POST", "/permissions", perm);
}

// ─── 1. community_posts ───────────────────────────────────────────────────────
async function setupCommunityPosts() {
  await createCollection("community_posts", [
    { field: "id",           type: "integer",   schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true } },
    { field: "date_created", type: "timestamp", meta: { special: ["date-created"], hidden: true }, schema: {} },
    { field: "date_updated", type: "timestamp", meta: { special: ["date-updated"], hidden: true }, schema: {} },
    { field: "content",      type: "text",      meta: { interface: "input-multiline", required: true }, schema: { is_nullable: false } },
    { field: "scope",        type: "string",    meta: { interface: "select-dropdown", options: { choices: [{ text: "Global", value: "global" }, { text: "Class", value: "class" }] } }, schema: { default_value: "global" } },
  ]);

  await addField("community_posts", {
    field: "author",
    type: "uuid",
    meta: { special: ["m2o"], interface: "select-dropdown-m2o", display: "related-values", display_options: { template: "{{first_name}} {{last_name}}" } },
    schema: { is_nullable: true, foreign_key_table: "directus_users", foreign_key_column: "id" },
  });

  await addField("community_posts", {
    field: "class_id",
    type: "integer",
    meta: { special: ["m2o"], interface: "select-dropdown-m2o" },
    schema: { is_nullable: true, foreign_key_table: "classes", foreign_key_column: "id" },
  });

  await addField("community_posts", {
    field: "image",
    type: "uuid",
    meta: { special: ["file"], interface: "file-image" },
    schema: { is_nullable: true, foreign_key_table: "directus_files", foreign_key_column: "id" },
  });

  await addField("community_posts", {
    field: "attachment",
    type: "uuid",
    meta: { special: ["file"], interface: "file" },
    schema: { is_nullable: true, foreign_key_table: "directus_files", foreign_key_column: "id" },
  });

  for (const f of ["link_url", "link_title", "link_description", "link_image"]) {
    await addField("community_posts", {
      field: f, type: "string",
      meta: { interface: "input" },
      schema: { is_nullable: true },
    });
  }

  await createRelation({
    collection: "community_posts", field: "author",
    related_collection: "directus_users",
    meta: { many_collection: "community_posts", many_field: "author", one_collection: "directus_users" },
  });
}

// ─── 2. community_comments ────────────────────────────────────────────────────
async function setupCommunityComments() {
  await createCollection("community_comments", [
    { field: "id",           type: "integer",   schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true } },
    { field: "date_created", type: "timestamp", meta: { special: ["date-created"], hidden: true }, schema: {} },
    { field: "content",      type: "text",      meta: { interface: "input-multiline", required: true }, schema: { is_nullable: false } },
  ]);

  await addField("community_comments", {
    field: "post_id",
    type: "integer",
    meta: { special: ["m2o"], interface: "select-dropdown-m2o" },
    schema: { is_nullable: false, foreign_key_table: "community_posts", foreign_key_column: "id" },
  });

  await addField("community_comments", {
    field: "author",
    type: "uuid",
    meta: { special: ["m2o"], interface: "select-dropdown-m2o", display: "related-values", display_options: { template: "{{first_name}} {{last_name}}" } },
    schema: { is_nullable: true, foreign_key_table: "directus_users", foreign_key_column: "id" },
  });

  await createRelation({
    collection: "community_comments", field: "post_id",
    related_collection: "community_posts",
    meta: { many_collection: "community_comments", many_field: "post_id", one_collection: "community_posts", one_field: "comments" },
  });

  await createRelation({
    collection: "community_comments", field: "author",
    related_collection: "directus_users",
    meta: { many_collection: "community_comments", many_field: "author", one_collection: "directus_users" },
  });
}

// ─── 3. user_connections ─────────────────────────────────────────────────────
async function setupUserConnections() {
  await createCollection("user_connections", [
    { field: "id",           type: "integer",   schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true } },
    { field: "date_created", type: "timestamp", meta: { special: ["date-created"], hidden: true }, schema: {} },
    { field: "status",       type: "string",    meta: { interface: "select-dropdown", options: { choices: [{ text: "Pending", value: "pending" }, { text: "Accepted", value: "accepted" }, { text: "Declined", value: "declined" }] } }, schema: { default_value: "pending" } },
  ]);

  await addField("user_connections", {
    field: "requester",
    type: "uuid",
    meta: { special: ["m2o"], interface: "select-dropdown-m2o", display: "related-values", display_options: { template: "{{first_name}} {{last_name}}" } },
    schema: { is_nullable: true, foreign_key_table: "directus_users", foreign_key_column: "id" },
  });

  await addField("user_connections", {
    field: "recipient",
    type: "uuid",
    meta: { special: ["m2o"], interface: "select-dropdown-m2o", display: "related-values", display_options: { template: "{{first_name}} {{last_name}}" } },
    schema: { is_nullable: true, foreign_key_table: "directus_users", foreign_key_column: "id" },
  });
}

// ─── 4. direct_messages ──────────────────────────────────────────────────────
async function setupDirectMessages() {
  await createCollection("direct_messages", [
    { field: "id",           type: "integer",   schema: { is_primary_key: true, has_auto_increment: true }, meta: { hidden: true } },
    { field: "date_created", type: "timestamp", meta: { special: ["date-created"], hidden: true }, schema: {} },
    { field: "content",      type: "text",      meta: { interface: "input-multiline", required: true }, schema: { is_nullable: false } },
    { field: "read_at",      type: "timestamp", meta: { hidden: true }, schema: { is_nullable: true } },
  ]);

  await addField("direct_messages", {
    field: "connection_id",
    type: "integer",
    meta: { special: ["m2o"], interface: "select-dropdown-m2o" },
    schema: { is_nullable: false, foreign_key_table: "user_connections", foreign_key_column: "id" },
  });

  await addField("direct_messages", {
    field: "sender",
    type: "uuid",
    meta: { special: ["m2o"], interface: "select-dropdown-m2o", display: "related-values", display_options: { template: "{{first_name}} {{last_name}}" } },
    schema: { is_nullable: true, foreign_key_table: "directus_users", foreign_key_column: "id" },
  });
}

// ─── 5. Permissions ───────────────────────────────────────────────────────────
async function setupPermissions() {
  console.log("\n🔐 Setting up permissions...");

  // Fetch all policies so we can find student + teacher policy IDs
  const policies = await api("GET", "/policies?limit=50");
  const policyList = Array.isArray(policies) ? policies : (policies?.data ?? []);
  console.log("Policies found:", policyList.map(p => `${p.name} (${p.id})`).join(", "));

  const studentPolicy = policyList.find(p => p.name?.toLowerCase().includes("student"));
  const teacherPolicy = policyList.find(p => p.name?.toLowerCase().includes("teacher"));

  const policyIds = [
    studentPolicy?.id,
    teacherPolicy?.id,
  ].filter(Boolean);

  if (policyIds.length === 0) {
    console.warn("⚠  Could not find student or teacher policies. Add permissions manually.");
    return;
  }

  const collections = [
    { collection: "community_posts",    fields: "*", readFilter: null,             writeFilter: { author: { _eq: "$CURRENT_USER" } } },
    { collection: "community_comments", fields: "*", readFilter: null,             writeFilter: { author: { _eq: "$CURRENT_USER" } } },
    { collection: "user_connections",   fields: "*", readFilter: { _or: [{ requester: { _eq: "$CURRENT_USER" } }, { recipient: { _eq: "$CURRENT_USER" } }] }, writeFilter: null },
    { collection: "direct_messages",    fields: "*", readFilter: null,             writeFilter: { sender: { _eq: "$CURRENT_USER" } } },
  ];

  for (const policyId of policyIds) {
    for (const col of collections) {
      // READ
      await createPermission({
        policy: policyId,
        collection: col.collection,
        action: "read",
        fields: col.fields,
        permissions: col.readFilter ?? {},
      });
      // CREATE
      await createPermission({
        policy: policyId,
        collection: col.collection,
        action: "create",
        fields: col.fields,
        permissions: {},
      });
      // UPDATE own
      await createPermission({
        policy: policyId,
        collection: col.collection,
        action: "update",
        fields: col.fields,
        permissions: col.writeFilter ?? {},
      });
      // DELETE own
      await createPermission({
        policy: policyId,
        collection: col.collection,
        action: "delete",
        permissions: col.writeFilter ?? {},
      });
    }
  }

  console.log("✅ Permissions created");
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("🚀 Setting up community collections in Directus...\n");
  await setupCommunityPosts();
  await setupCommunityComments();
  await setupUserConnections();
  await setupDirectMessages();
  await setupPermissions();
  console.log("\n✅ Done. Run the portal and test each feature.");
}

main().catch(console.error);
