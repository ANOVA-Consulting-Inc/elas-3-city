// ELAS-3-CITY API Integration Setup - V4.0
// Source: 02_TECH/18_API_Integration.docx (R1_BASELINE)
// Purpose: API and event integration setup for Three Facets communication

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** AsyncAPI Event Schema */
const asyncapiEventSchema = z.object({
  event: z.string(),
  channel: z.string(),
  payload: z.object({
    [key: string]: z.any(),
  }),
  metadata: z.object({
    correlationId: z.string(),
    timestamp: z.string().datetime(),
    source: z.string(),
    version: z.string(),
  }),
});

/** OpenAPI Operation Schema */
const openAPISchema = z.object({
  operationId: z.string(),
  path: z.string(),
  method: z.enum(["get", "post", "put", "delete", "patch"]),
  requestBody: z.object({
    [key: string]: z.any(),
  }).optional(),
  responses: z.object({
    [key: string]: z.object({
      description: z.string(),
      content: z.object({
        "application/json": z.object({
          schema: z.any(),
        }),
      }),
    }),
  }),
});

/** API Integration Schema */
const apiIntegrationSchema = z.object({
  facet: z.enum(["utilities", "nexus", "barbados"]),
  integrationType: z.enum(["asyncapi", "openapi", "rest", "graphql"]),
  specification: z.union([asyncapiEventSchema, openAPISchema]),
  endpoint: z.string().url(),
  authentication: z.object({
    type: z.enum(["none", "api-key", "jwt", "oauth2"]),
    config: z.object({ [key: string]: z.any() }),
  }).optional(),
  validation: z.object({
    inputSchema: z.any(),
    outputSchema: z.any(),
    errorHandling: z.enum(["throw", "return", "redirect"]),
  }),
  r1BaselineReference: z.string(),
  lockValidation: z.object({
    compliant: z.boolean(),
    violations: z.array(z.string()),
  }),
});

/** API Integration Service */
class APIIntegrationService {
  /** Validate API specification against R1_BASELINE locks */
  validateAPISpec(spec: any): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    // Check required fields
    if (!spec.facet) {
      violations.push("LOCK-API-001: API specification must specify facet");
    }
    if (!spec.integrationType) {
      violations.push("LOCK-API-002: API specification must specify integration type");
    }
    if (!spec.endpoint) {
      violations.push("LOCK-API-003: API specification must specify endpoint URL");
    }

    // Validate endpoint URL format
    try {
      new URL(spec.endpoint);
    } catch {
      violations.push("LOCK-API-004: API endpoint must be a valid URL");
    }

    // Check authentication requirements per facet
    const requiredAuthByFacet: Record<string, boolean> = {
      utilities: true,
      nexus: true,
      barbados: false, // Pilots may have relaxed auth
    };

    if (requiredAuthByFacet[spec.facet] && !spec.authentication) {
      violations.push(`LOCK-API-005: ${spec.facet} facet APIs require authentication`);
    }

    // Validate specification based on type
    if (spec.integrationType === "asyncapi" && !spec.specification.event) {
      violations.push("LOCK-API-006: AsyncAPI integration must include event specification");
    }
    if (spec.integrationType === "openapi" && !spec.specification.operationId) {
      violations.push("LOCK-API-007: OpenAPI integration must include operationId");
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  /** Check API compliance with architecture locks */
  checkAPILocks(spec: any, lockMap: Record<string, string[]>): { compliant: boolean; violations: string[] } {
    const violations: string[] = [];

    // Get applicable locks for this facet and integration type
    const applicableLocks = lockMap[`${spec.facet}-${spec.integrationType}`] || [];

    for (const lockId of applicableLocks) {
      // Apply lock validation logic
      switch (lockId) {
        case "LOCK-API-001":
        case "LOCK-API-002":
        case "LOCK-API-003":
        case "LOCK-API-004":
        case "LOCK-API-005":
        case "LOCK-API-006":
        case "LOCK-API-007":
          if (violations.includes(lockId)) {
            violations.push(lockId);
          }
          break;
        default:
          // Generic lock validation
          if (!spec.r1BaselineReference) {
            violations.push(`${lockId}: Missing R1_BASELINE reference`);
          }
          break;
      }
    }

    return {
      compliant: violations.length === 0,
      violations,
    };
  }
}

// Export server function for TanStack Start
export const setupAPIIntegration = createServerFn({ method: "POST" })
  .validator(apiIntegrationSchema)
  .handler(async ({ data }) => {
    const service = new APIIntegrationService();

    // Validate API specification
    const specValidation = service.validateAPISpec(data);
    if (!specValidation.valid) {
      throw new Error(`API specification violations: ${specValidation.violations.join("; ")}`);
    }

    // Check architecture lock compliance
    const lockMap: Record<string, string[]> = {
      "utilities-asyncapi": ["LOCK-API-001", "LOCK-API-005"],
      "utilities-openapi": ["LOCK-API-001", "LOCK-API-005"],
      "nexus-asyncapi": ["LOCK-API-001", "LOCK-API-005", "LOCK-API-006"],
      "nexus-openapi": ["LOCK-API-001", "LOCK-API-005", "LOCK-API-007"],
      "barbados-asyncapi": ["LOCK-API-001"],
      "barbados-openapi": ["LOCK-API-001"],
    };

    const lockCompliance = service.checkAPILocks(data, lockMap);
    if (!lockCompliance.compliant) {
      throw new Error(`API lock violations: ${lockCompliance.violations.join("; ")}`);
    }

    return {
      ok: true,
      data: {
        ...data,
        specificationValidation: specValidation,
        lockCompliance,
        configuredAt: new Date().toISOString(),
      },
      source: "ELAS-3-CITY_API_Integration_V4.0",
      r1BaselineReference: "02_TECH/18_API_Integration.docx",
    };
  });

// Export schema type
export type { apiIntegrationSchema };