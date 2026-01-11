#!/usr/bin/env bun

/**
 * Wouri Bot - Service Health Monitoring with Slack/Discord Alerts
 *
 * Usage:
 *   bun run scripts/monitor-health.ts
 *
 * Environment variables required:
 *   ADMIN_API_KEY - Admin API key
 *   API_BASE_URL - Backend URL (default: http://localhost:4456)
 *   SLACK_WEBHOOK_URL - Slack incoming webhook URL (optional)
 *   DISCORD_WEBHOOK_URL - Discord webhook URL (optional)
 *   ALERT_THRESHOLD_MS - Alert if latency exceeds this (default: 5000)
 */

import { adminFetch } from "../backend/src/lib/admin-api";

interface ServiceStatus {
  status: "ok" | "error";
  latency_ms: number;
}

interface MonitoringResponse {
  data: {
    services: Record<string, ServiceStatus>;
  };
}

interface Alert {
  severity: "critical" | "warning" | "info";
  service: string;
  message: string;
  latency?: number;
}

const ALERT_THRESHOLD_MS = parseInt(process.env.ALERT_THRESHOLD_MS || "5000");
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
const DISCORD_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

async function sendSlackAlert(alert: Alert) {
  if (!SLACK_WEBHOOK_URL) return;

  const emoji = alert.severity === "critical" ? "🚨" : alert.severity === "warning" ? "⚠️" : "ℹ️";
  const color = alert.severity === "critical" ? "#FF0000" : alert.severity === "warning" ? "#FFA500" : "#00FF00";

  const payload = {
    attachments: [
      {
        color,
        title: `${emoji} Wouri Bot - ${alert.severity.toUpperCase()}`,
        text: alert.message,
        fields: [
          {
            title: "Service",
            value: alert.service,
            short: true,
          },
          {
            title: "Latency",
            value: alert.latency ? `${alert.latency}ms` : "N/A",
            short: true,
          },
          {
            title: "Timestamp",
            value: new Date().toISOString(),
            short: false,
          },
        ],
        footer: "Wouri Bot Monitoring",
        ts: Math.floor(Date.now() / 1000),
      },
    ],
  };

  try {
    const response = await fetch(SLACK_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("❌ Failed to send Slack alert:", await response.text());
    }
  } catch (error) {
    console.error("❌ Error sending Slack alert:", error);
  }
}

async function sendDiscordAlert(alert: Alert) {
  if (!DISCORD_WEBHOOK_URL) return;

  const emoji = alert.severity === "critical" ? "🚨" : alert.severity === "warning" ? "⚠️" : "✅";
  const color = alert.severity === "critical" ? 0xff0000 : alert.severity === "warning" ? 0xffa500 : 0x00ff00;

  const payload = {
    embeds: [
      {
        title: `${emoji} Wouri Bot - ${alert.severity.toUpperCase()}`,
        description: alert.message,
        color,
        fields: [
          {
            name: "Service",
            value: alert.service,
            inline: true,
          },
          {
            name: "Latency",
            value: alert.latency ? `${alert.latency}ms` : "N/A",
            inline: true,
          },
        ],
        timestamp: new Date().toISOString(),
        footer: {
          text: "Wouri Bot Monitoring",
        },
      },
    ],
  };

  try {
    const response = await fetch(DISCORD_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.error("❌ Failed to send Discord alert:", await response.text());
    }
  } catch (error) {
    console.error("❌ Error sending Discord alert:", error);
  }
}

async function sendAlert(alert: Alert) {
  console.log(`\n${alert.severity.toUpperCase()}: ${alert.message}`);

  // Send to Slack
  if (SLACK_WEBHOOK_URL) {
    await sendSlackAlert(alert);
  }

  // Send to Discord
  if (DISCORD_WEBHOOK_URL) {
    await sendDiscordAlert(alert);
  }
}

async function checkHealth() {
  console.log("🔍 Checking service health...");

  try {
    const response: MonitoringResponse = await adminFetch("/admin/monitoring");

    const services = response.data.services;
    const alerts: Alert[] = [];

    for (const [serviceName, status] of Object.entries(services)) {
      // Check if service is down
      if (status.status === "error") {
        alerts.push({
          severity: "critical",
          service: serviceName,
          message: `Service ${serviceName} is DOWN`,
          latency: status.latency_ms,
        });
      }
      // Check if latency is too high
      else if (status.latency_ms > ALERT_THRESHOLD_MS) {
        alerts.push({
          severity: "warning",
          service: serviceName,
          message: `Service ${serviceName} has high latency: ${status.latency_ms}ms (threshold: ${ALERT_THRESHOLD_MS}ms)`,
          latency: status.latency_ms,
        });
      }
      // Service is healthy
      else {
        console.log(`✅ ${serviceName}: OK (${status.latency_ms}ms)`);
      }
    }

    const hasCritical = alerts.some((alert) => alert.severity === "critical");

    // Send alerts
    if (alerts.length > 0) {
      console.log(`\n⚠️ Found ${alerts.length} issue(s):`);
      for (const alert of alerts) {
        await sendAlert(alert);
      }
    } else {
      console.log("\n✅ All services are healthy!");

      // Optionally send success notification
      if (process.env.ALERT_ON_SUCCESS === "true") {
        await sendAlert({
          severity: "info",
          service: "All Services",
          message: "All services are healthy",
        });
      }
    }

    return !hasCritical;
  } catch (error: any) {
    console.error("❌ Failed to check health:", error.message);

    await sendAlert({
      severity: "critical",
      service: "Monitoring",
      message: `Failed to check health: ${error.message}`,
    });

    return false;
  }
}

async function main() {
  console.log("==========================================");
  console.log("🏥 WOURI BOT - HEALTH MONITORING");
  console.log("==========================================");
  console.log(`Alert threshold: ${ALERT_THRESHOLD_MS}ms`);
  console.log(`Slack alerts: ${SLACK_WEBHOOK_URL ? "✅ Enabled" : "❌ Disabled"}`);
  console.log(`Discord alerts: ${DISCORD_WEBHOOK_URL ? "✅ Enabled" : "❌ Disabled"}`);
  console.log("==========================================\n");

  const isHealthy = await checkHealth();

  console.log("\n==========================================");
  console.log(isHealthy ? "✅ Health check completed" : "⚠️ Health check found critical issues");
  console.log("==========================================\n");

  process.exit(isHealthy ? 0 : 1);
}

main();
