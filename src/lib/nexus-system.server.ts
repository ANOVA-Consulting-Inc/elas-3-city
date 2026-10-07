// ELAS-3-CITY NEXUS System Configuration - V4.0
// Source: 02_TECH/02_NEXUS_Configuration.docx and 02_TECH/13_NEXUS_System.docx (R1_BASELINE)
// Purpose: Networked Ecosystem Intelligence System configuration for Three Facets

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** NEXUS System Schema */
const nexusSystemSchema = z.object({
  systemId: z.string(),
  facet: z.enum(["utilities", "nexus", "barbados"]),
  name: z.string(),
  version: z.string(),
  status: z.enum(["initializing", "active", "degraded", "offline", "maintenance"]),
  capabilities: z.array(z.object({
    name: z.string(),
    description: z.string(),
    endpoints: z.array(z.string()),
  })),
  dataSources: z.array(z.object({
    name: z.string(),
    type: z.enum(["sensor", "api", "database", "file", "event"]),
    source: z.string(),
    connectionString: z.string().url().optional(),
  })),
  integrationPoints: z.array(z.object({
    name: z.string(),
    connectedFacet: z.enum(["utilities", "nexus", "barbados"]),
    protocol: z.enum(["asyncapi", "rest", "graphql", "mqtt"]),
    topic: z.string(),
  })),
  kpiMetrics: z.array(z.object({
    name: z.string(),
    unit: z.string(),
    target: z.number(),
    current: z.number(),
    status: z.enum(["healthy", "warning", "critical"]),
  })),
  r1BaselineReference: z.string(),
  lockValidation: z.object({
    compliant: z.boolean(),
    violations: z.array(z.string()),
  }),
});

/** NEXUS Service */
class NEXUSService {
  /** Create a NEXUS system configuration */
  createSystem(config: z.infer<typeof nexusSystemSchema>) {
    const validated = nexusSystemSchema.parse(config);
    return {
      ...validated,
      systemId: `NEXUS-${validated.systemId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
  }

  /** Check NEXUS system lock compliance */
  validateSystemLocks(system: any): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    // Validate systemId
    if (!system.systemId) {
      violations.push("LOCK-NEX-001: NEXUS system must have a unique systemId");
    }

    // Validate facet is specified
    if (!system.facet) {
      violations.push("LOCK-NEX-002: NEXUS system must specify facet");
    }

    // Validate system name
    if (!system.name) {
      violations.push("LOCK-NEX-003: NEXUS system must have a name");
    }

    // Validate version
    if (!system.version) {
      violations.push("LOCK-NEX-004: NEXUS system must have a version");
    }

    // Validate status
    const validStatuses = ["initializing", "active", "degraded", "offline", "maintenance"];
    if (system.status && !validStatuses.includes(system.status)) {
      violations.push(`LOCK-NEX-005: Invalid NEXUS status "${system.status}"`);
    }

    // Validate capabilities exist
    if (!system.capabilities || system.capabilities.length === 0) {
      violations.push("LOCK-NEX-006: NEXUS system must have capabilities defined");
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }
}

// Export server function for TanStack Start
export const configureNEXUSSystem = createServerFn({ method: "POST" })
  .validator(nexusSystemSchema)
  .handler(async ({ data }) => {
    const service = new NEXUSService();

    // Validate against lock protocols
    const lockValidation = service.validateSystemLocks(data);
    if (!lockValidation.valid) {
      throw new Error(`NEXUS system lock violations: ${lockValidation.violations.join("; ")}`);
    }

    // Create the NEXUS system configuration
    const system = service.createSystem(data);

    return {
      ok: true,
      data: {
        ...data,
        systemConfiguredAt: new Date().toISOString(),
        systemId: system.systemId,
        lockValidation,
      },
      source: "ELAS-3-CITY_NEXUS_System_V4.0",
      r1BaselineReference: "02_TECH/13_NEXUS_System.docx; 02_TECH/02_NEXUS_Configuration.docx",
    };
  });

// Export schema type
export type { nexusSystemSchema };