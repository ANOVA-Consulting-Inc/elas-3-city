// ELAS-3-CITY Data Exchange Integration - V4.0
// Source: 02_TECH/10_Data_Exchange.docx (R1_BASELINE)
// Purpose: Data exchange protocols between Three Facets (Utilities | NEXUS | BARBADOS)

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Data Exchange Message Schema */
const dataExchangeSchema = z.object({
  messageId: z.string(),
  sourceFacet: z.enum(["utilities", "nexus", "barbados"]),
  destinationFacet: z.enum(["utilities", "nexus", "barbados"]),
  messageType: z.enum([
    "sensor-data",
    "kpi-update",
    "anomaly-alert",
    "control-command",
    "status-report",
    "pilot-result",
    "configuration-update",
  ]),
  payload: z.object({
    [key: string]: z.any(),
  }),
  timestamp: z.string().datetime(),
  ttl: z.number().min(1).max(3600), // Time to live in seconds
  priority: z.enum(["low", "normal", "high", "critical"]),
  correlationId: z.string().optional(),
  schemaVersion: z.string().default("1.0.0"),
});

/** Data Exchange Service */
class DataExchangeService {
  /** Validate data exchange message */
  validateMessage(message: z.infer<typeof dataExchangeSchema>) {
    return dataExchangeSchema.parse(message);
  }

  /** Check message route validity between facets */
  validateRoute(source: "utilities" | "nexus" | "barbados", destination: "utilities" | "nexus" | "barbados"): boolean {
    // Define valid data exchange routes
    const validRoutes: Array<{ source: string; destination: string }> = [
      { source: "utilities", destination: "nexus" }, // Sensor data → Intelligence
      { source: "nexus", destination: "utilities" }, // Intelligence → Control commands
      { source: "barbados", destination: "nexus" }, // Pilot results → Intelligence
      { source: "nexus", destination: "barbados" }, // Intelligence → Pilot data
      { source: "utilities", destination: "barbados" }, // Utilities data → Pilot tests
      { source: "barbados", destination: "utilities" }, // Pilot feedback → Utilities
    ];

    return validRoutes.some(
      (route) => route.source === source && route.destination === destination
    );
  }

  /** Check exchange message against architecture locks */
  validateExchangeLocks(message: any): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    // Validate message ID
    if (!message.messageId) {
      violations.push("LOCK-DEX-001: Data exchange message must have a unique message ID");
    }

    // Validate source/destination facets
    const validFacets = ["utilities", "nexus", "barbados"];
    if (!validFacets.includes(message.sourceFacet)) {
      violations.push("LOCK-DEX-002: Invalid source facet specified");
    }
    if (!validFacets.includes(message.destinationFacet)) {
      violations.push("LOCK-DEX-003: Invalid destination facet specified");
    }

    // Validate message type for route
    const validTypesByRoute: Record<string, string[]> = {
      "utilities-to-nexus": ["sensor-data", "kpi-update", "status-report"],
      "nexus-to-utilities": ["control-command", "status-report"],
      "barbados-to-nexus": ["pilot-result", "anomaly-alert"],
      "nexus-to-barbados": ["configuration-update", "status-report"],
      "utilities-to-barbados": ["sensor-data", "kpi-update"],
      "barbados-to-utilities": ["pilot-result", "feedback"],
    };

    const routeKey = `${message.sourceFacet}-to-${message.destinationFacet}`;
    const validTypes = validTypesByRoute[routeKey];
    if (validTypes && !validTypes.includes(message.messageType)) {
      violations.push(`LOCK-DEX-004: Message type "${message.messageType}" invalid for route ${routeKey}`);
    }

    // Validate TTL
    if (message.ttl > 3600) {
      violations.push("LOCK-DEX-005: Message TTL exceeds maximum 3600 seconds");
    }
    if (message.ttl < 1) {
      violations.push("LOCK-DEX-006: Message TTL must be at least 1 second");
    }

    // Validate priority
    const validPriorities = ["low", "normal", "high", "critical"];
    if (!validPriorities.includes(message.priority)) {
      violations.push("LOCK-DEX-007: Invalid priority level specified");
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }
}

// Export server function for TanStack Start
export const exchangeData = createServerFn({ method: "POST" })
  .validator(dataExchangeSchema)
  .handler(async ({ data }) => {
    const service = new DataExchangeService();

    // Validate exchange message
    const messageValidation = service.validateMessage(data);
    if (!messageValidation.ok) {
      throw new Error(`Data exchange validation failed`);
    }

    // Check architecture lock compliance
    const lockValidation = service.validateExchangeLocks(data);
    if (!lockValidation.valid) {
      throw new Error(`Data exchange lock violations: ${lockValidation.violations.join("; ")}`);
    }

    // Validate route
    const routeValid = service.validateRoute(data.sourceFacet, data.destinationFacet);
    if (!routeValid) {
      throw new Error(`Invalid data exchange route: ${data.sourceFacet} → ${data.destinationFacet}`);
    }

    return {
      ok: true,
      data: {
        ...data,
        messageProcessedAt: new Date().toISOString(),
        serviceValidation: messageValidation,
        lockValidation,
      },
      source: "ELAS-3-CITY_Data_Exchange_V4.0",
      r1BaselineReference: "02_TECH/10_Data_Exchange.docx",
    };
  });

// Export schema type
export type { dataExchangeSchema };