# Directus Setup Guide — Review Workflow & Student Accounts

This guide covers the one-time Directus configuration needed to power the application review workflow: when you approve or reject an application in Directus, it automatically creates a student account and sends the right email.

---

## Step 1 — Add `reviewed_at` field to Applications

The webhook route stamps the application with a `reviewed_at` date when you act on it.

1. Go to **Settings → Data Model → applications**
2. Click **+ Create Field**
3. Type: `Timestamp`, Field name: `reviewed_at`
4. Leave nullable (no default)
5. Save

---

## Step 2 — Create the Student Role

Students log into Directus admin to access course materials. They should only see what you give them.

1. Go to **Settings → Roles & Permissions**
2. Click **+ Create Role**
3. Name: `Student`
4. Under **App Access**, enable: ✅ App Access
5. Under **Permissions**, find your `classes` (courses) collection and set:
   - **Read**: ✅ (all items)
   - Create / Update / Delete: ❌
6. Make sure `applications` and `directus_users` have **no permissions** for this role
7. Save the role
8. **Copy the Role ID** — go to the URL bar, it'll be a UUID like `a1b2c3d4-...`

---

## Step 3 — Add env vars to your hosting (Vercel / Railway)

Add these to your Next.js project's environment variables:

| Variable | Value |
|---|---|
| `WEBHOOK_SECRET` | Any random string — generate one at [randomkeygen.com](https://randomkeygen.com) |
| `DIRECTUS_STUDENT_ROLE_ID` | The UUID you copied from Step 2 |

Then redeploy your Next.js app so it picks up the new vars.

---

## Step 4 — Create the Directus Flow

This is the automation that fires when you change an application's status.

1. Go to **Settings → Flows**
2. Click **+ Create Flow**
3. Name it: `Review Application`
4. **Trigger:** `Event Hook`
   - Scope: `items.update`
   - Collection: `applications`
   - Check ✅ **Run script after event** (so you have access to the new values)
5. Click the **+** to add an operation → choose **Condition**
   - Name: `Status changed?`
   - Rule (JSON):
     ```json
     {
       "$trigger.payload.status": {
         "_in": ["approved", "rejected"]
       }
     }
     ```
6. On the **✅ resolve** branch, add another operation → choose **Webhook / Request**
   - Name: `Notify site`
   - Method: `POST`
   - URL: `https://your-site.vercel.app/api/review-application`
   - Headers:
     ```
     Content-Type: application/json
     x-webhook-secret: YOUR_WEBHOOK_SECRET
     ```
   - Body:
     ```json
     {
       "key": "{{$trigger.keys[0]}}",
       "payload": {
         "status": "{{$trigger.payload.status}}"
       }
     }
     ```
7. Save the Flow and toggle it **Active**

---

## Step 5 — Test the full flow

1. Submit a test application at `/apply`
2. Go to **Content → Applications** in Directus
3. Open the application and change `status` from `pending` → `approved`
4. Save — within a few seconds the Flow should fire
5. Check: the applicant email should receive the welcome email with login details
6. Check: a new user should appear in **User Management** with the Student role

To test rejection, change a different application to `rejected` and verify the rejection email arrives.

---

## How students log in

Students visit your Directus admin URL directly:
`https://directus-production-21fe.up.railway.app/admin`

They log in with the email they applied with and the temporary password from their welcome email. They'll see only the content you've given their role access to (course materials).

You can customize the Directus admin theme under **Settings → Project Settings** — set your project name to "Blacksky Up" and adjust colors to match the brand.

---

## Troubleshooting

**Flow fired but no email arrived** — check your Vercel/Railway logs for the `/api/review-application` route. The most common cause is a missing or wrong `WEBHOOK_SECRET`.

**"Failed to create student account"** — the user may already exist (they applied before). The route handles `RECORD_NOT_UNIQUE` gracefully and still sends the email.

**Student can see too much** — revisit the role permissions in Step 2 and tighten the collection access.
