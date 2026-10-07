// ELAS-3-CITY KPI Measurement Framework - V4.0
// Source: 02_TECH/07_KPI_Measurement.docx (R1_BASELINE)
// Purpose: KPI measurement passports and calculation frameworks for Three Facets

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** KPI Measurement Passport Schema */
const kpiPassportSchema = z.object({
  kpiId: z.string(),
  facet: z.enum(["utilities", "nexus", "barbados"]),
  category: z.enum([
    "energy-consumption",
    "energy-renewable",
    "water-consumption",
    "water-quality",
    "telecom-uptime",
    "telecom-connectivity",
    "nexus-aggregate",
    "nexus-anomaly",
    "barbados-pilot",
    "barbados-validation",
  ]),
  name: z.string(),
  description: z.string(),
  unit: z.string(),
  value: z.number(),
  timestamp: z.string().datetime(),
  target: z.number().optional(),
  threshold: z.object({
    min: z.number(),
    max: z.number(),
    warning: z.number(),
  }).optional(),
  status: z.enum(["healthy", "warning", "critical"]),
  facetSpecific: z.object({
    energy: z.object({
      renewablePercentage: z.number().min(0).max(100),
      gridStability: z.number().min(0).max(1),
    }).optional(),
    water: z.object({
      purityIndex: z.number().min(0).max(100),
      reservoirHealth: z.number().min(0).max(1),
    }).optional(),
    telecom: z.object({
      latencyMs: z.number().min(0),
      packetLoss: z.number().min(0).max(1),
    }).optional(),
  }).optional(),
});

/** KPI Measurement Service */
class KPIMeasurementService {
  /** Create a KPI measurement passport */
  createPassport(measurement: z.infer<typeof kpiPassportSchema>) {
    const validated = kpiPassportSchema.parse(measurement);
    return {
      ...validated,
      createdAt: new Date().toISOString(),
      passportId: `KPI-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  /** Fetch KPI measurements from Supabase */
  async fetchKPIs(facet: "utilities" | "nexus" | "barbados", category?: string) {
    // Placeholder - would integrate with Supabase
    return [];
  }

  /** Calculate KPI trends over time */
  calculateTrend(values: number[]): { direction: "up" | "down" | "stable"; changePercentage: number } {
    if (values.length < 2) {
      return { direction: "stable", changePercentage: 0 };
    }

    const first = values[0];
    const last = values[values.length - 1];

    if (first === 0) {
      return { direction: last > 0 ? "up" : "stable", changePercentage: 0 };
    }

    const changePercentage = ((last - first) / first) * 100;

    if (changePercentage > 5) return { direction: "up", changePercentage };
    if (changePercentage < -5) return { direction: "down", changePercentage };
    return { direction: "stable", changePercentage };
  }

  /** Validate KPI against architecture locks */
  validateKPILocks(kpi: any): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    // Validate value is a number
    if (typeof kpi.value !== "number" || isNaN(kpi.value)) {
      violations.push("LOCK-KPI-001: KPI value must be a valid number");
    }

    // Validate timestamp
    if (!kpi.timestamp || isNaN(new Date(kpi.timestamp).getTime())) {
      violations.push("LOCK-KPI-002: KPI timestamp must be valid datetime");
    }

    // Validate facet-specific bounds
    if (kpi.facet === "utilities") {
      if (kpi.category?.startsWith("energy") && (kpi.value < 0)) {
        violations.push("LOCK-KPI-003: Energy KPI value cannot be negative");
      }
      if (kpi.category === "water-consumption" && kpi.value < 0) {
        violations.push("LOCK-KPI-004: Water KPI value cannot be negative");
      }
      if (kpi.category === "telecom-uptime" && (kpi.value < 0 || kpi.value > 100)) {
        violations.push("LOCK-KPI-005: Telecom KPI must be in [0-100] range");
      }
    }

    // Validate NEXUS KPIs
    if (kpi.facet === "nexus") {
      if (kpi.category === "nexus-aggregate" && kpi.value < 0) {
        violations.push("LOCK-KPI-006: NEXUS aggregate KPI value cannot be negative");
      }
    }

    // Validate BARBADOS KPIs
    if (kpi.facet === "barbados") {
      if (kpi.category === "barbados-pilot" && !kpi.facetSpecific) {
        violations.push("LOCK-KPI-007: BARBADOS pilot KPI requires facetSpecific data");
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }
}

// Export server function for TanStack Start
export const createKPIPassport = createServerFn({ method: "POST" })
  .validator(kpiPassportSchema)
  .handler(async ({ data }) => {
    const service = new KPIMeasurementService();

    // Validate against lock protocols
    const lockValidation = service.validateKPILocks(data);
    if (!lockValidation.valid) {
      throw new Error(`KPI lock violations: ${lockValidation.violations.join("; ")}`);
    }

    // Create the passport
    const passport = service.createPassport(data);

    return {
      ok: true,
      data: passport,
      lockValidation,
      source: "ELAS-3-CITY_KPI_Measurement_V4.0",
      r1BaselineReference: "02_TECH/07_KPI_Measurement.docx",
    };
  });

// Export schema type
export type { kpiPassportSchema };