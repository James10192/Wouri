#!/usr/bin/env bun

import { adminFetch } from "../backend/src/lib/admin-api";

async function run() {
  console.log("Admin API smoke test...");

  await adminFetch("/admin/monitoring");
  await adminFetch("/admin/conversations?limit=1");
  await adminFetch("/admin/feedback?limit=1");
  await adminFetch("/admin/knowledge?limit=1");
  await adminFetch("/admin/translations?limit=1");

  console.log("Admin API smoke test passed.");
}

run().catch((error) => {
  console.error("Smoke test failed:", error);
  process.exit(1);
});
