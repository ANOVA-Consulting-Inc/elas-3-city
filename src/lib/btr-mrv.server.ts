// ELAS-3-CITY BTR_MRV Frameworks - V4.0
// Source: 02_TECH/09_Frameworks_BTR_MRV.docx and Framework_BTR_MRV_R1.docx (R1_BASELINE)
// Purpose: Built-Track-Report (BTR) Monitoring, Reporting and Verification framework for ELAS-3-CITY

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** BTR Measurement Schema */
const btrSchema = z.object({
  btrId: z.string(),
  facet: z.enum(["utilities", "nexus", "barbados"]),
  measurementType: z.enum([
    "energy-flow",
    "water-flow",
    "data-flow",
    "pilot-performance",
    "resource-consumption",
    "emissions-tracking",
  ]),
  timestamp: z.string().datetime(),
  recordedValue: z.number(),
  unit: z.string(),
  baselineValue: z.number().optional(),
  targetValue: z.number().optional,
  variance: z.number().optional,
  status: z.enum(["on-track", "warning", "critical", "off-track"]),
  verificationStatus: z.enum(["pending", "verified", "audited", "disputed"]),
  methodology: z.object({
    measurementMethod: z.string(),
    equipmentUsed: z.array(z.string()).optional(),
    calibrationDate: z.string().datetime().optional(),
    accuracyRange: z.object({
      min: z.number(),
      max: z.number(),
    }).optional(),
  }),
  relatedKPIs: z.array(z.string()),
  r1BaselineReference: z.string(),
  lockValidation: z.object({
    compliant: z.boolean(),
    violations: z.array(z.string()),
  }),
});

/** BTR_MRV Service */
class BTR_MRVService {
  /** Create a BTR measurement record */
  createBTRRecord(record: z.infer<typeof btrSchema>) {
    const validated = btrSchema.parse(record);
    return {
      ...validated,
      recordId: `BTR-${validated.btrId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
  }

  /** Calculate variance from baseline */
  calculateVariance(recorded: number, baseline: number): number {
    if (baseline === 0) {
      return recorded > 0 ? 100 : 0;
    }
    return ((recorded - baseline) / baseline) * 100;
  }

  /** Determine BTR status based on variance */
  determineStatus(variance: number): "on-track" | "warning" | "critical" | "off-track" {
    if (Math.abs(variance) <= 5) return "on-track";
    if (Math.abs(variance) <= 15) return "warning";
    if (Math.abs(variance) <= 30) return "critical";
    return "off-track";
  }

  /** Verify BTR against R1_BASELINE locks */
  verifyBTRLocks(record: any): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    // Check required fields
    if (!record.btrId) {
      violations.push("LOCK-BTR-001: BTR record must have a unique identifier");
    }

    // Validate measurement type for facet
    const validTypesByFacet: Record<string, string[]> = {
      utilities: ["energy-flow", "water-flow", "resource-consumption"],
      nexus: ["data-flow", "emissions-tracking"],
      barbados: ["pilot-performance"],
    };

    const validTypes = validTypesByFacet[record.facet];
    if (validTypes && !validTypes.includes(record.measurementType)) {
      violations.push(`LOCK-BTR-002: Invalid measurementType "${record.measurementType}" for facet ${record.facet}`);
    }

    // Verify baseline comparison if provided
    if (record.baselineValue !== undefined && record.recordedValue !== undefined) {
      const variance = this.calculateVariance(record.recordedValue, record.baselineValue);
      const status = this.determineStatus(variance);

      // Check if variance exceeds acceptable thresholds per lock
      if (record.facet === "utilities" && Math.abs(variance) > 20) {
        violations.push("LOCK-BTR-003: Utilities BTR variance exceeds 20% threshold");
      }
      if (record.facet === "nexus" && Math.abs(variance) > 25) {
        violations.push("LOCK-BTR-004: NEXUS BTR variance exceeds 25% threshold");
      }
    }

    // Verify methodology documentation
    if (!record.methodology.measurementMethod) {
      violations.push("LOCK-BTR-005: BTR record must include measurement methodology");
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }
}

// Export server function for TanStack Start
export const createBTRRecord = createServerFn({ method: "POST" })
  .validator(btrSchema)
  .handler(async ({ data }) => {
    const service = new BTR_MRVService();

    // Verify against architecture locks
    const lockVerification = service.verifyBTRLocks(data);
    if (!lockVerification.valid) {
      throw new Error(`BTR_MRV lock violations: ${lockVerification.violations.join("; ")}`);
    }

    // Create the BTR record
    const record = service.createBTRRecord(data);

    // Add calculated fields
    const enhancedRecord = {
      ...record,
      variance: data.baselineValue !== undefined
        ? service.calculateVariance(data.recordedValue, data.baselineValue)
        : undefined,
      status: data.baselineValue !== undefined
        ? service.determineStatus(undefined as any)
        : undefined,
    };

    return {
      ok: true,
      data: enhancedRecord,
      lockVerification,
      source: "ELAS-3-CITY_BTR_MRV_V4.0",
      r1BaselineReference: "02_TECH/09_Frameworks_BTR_MRV.docx; Framework_BTR_MRV_R1.docx",
    };
  });

// Export schema type
export type { btrSchema };