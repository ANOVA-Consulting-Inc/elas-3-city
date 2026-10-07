// ELAS-3-CITY GHG Scope 3 Configuration - V4.0
// Source: 02_TECH/08_GHG_Scope3.docx (R1_BASELINE)
// Purpose: Greenhouse Gas Scope 3 emissions tracking and reporting for ELAS-3-CITY

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** GHG Scope 3 Emissions Schema */
const ghgScope3Schema = z.object({
  kpiPassportId: z.string(),
  reportingPeriod: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  scope3Categories: z.array(z.enum([
    "purchased_goods_services",
    "capital_goods",
    "fuel_energy_activities",
    "transportation_distribution",
    "waste",
    "business_travel",
    "employee_commuting",
    "use_of_sold_products",
    "end_of_life_treatment",
    "downstream_transportation",
  ])),
  emissions: z.object({
    co2eKg: z.number(), // CO2 equivalent in kilograms
    co2eTon: z.number(), // CO2 equivalent in metric tons
    breakDown: z.record(z.object({
      category: z.string(),
      valueKg: z.number(),
      percentage: z.number().min(0).max(100),
    })),
  }),
  dataSources: z.array(z.object({
    sourceId: z.string(),
    sourceName: z.string(),
    dataQuality: z.enum(["primary", "secondary", "estimated"]),
    collectionMethod: z.string(),
    lastVerified: z.string().datetime(),
  })),
  verificationStatus: z.enum(["pending", "verified", "audited", "disputed"]),
  r1BaselineReference: z.string(),
  lockValidation: z.object({
    compliant: z.boolean(),
    violations: z.array(z.string()),
  }),
});

/** GHG Scope 3 Service */
class GHGScope3Service {
  /** Create a Scope 3 emissions record */
  createScope3Record(record: z.infer<typeof ghgScope3Schema>) {
    const validated = ghgScope3Schema.parse(record);
    return {
      ...validated,
      recordId: `GHG-S3-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
    };
  }

  /** Calculate total emissions across all categories */
  calculateTotalEmissions(emissionsData: { valueKg: number }[]): number {
    return emissionsData.reduce((total, current) => total + current.valueKg, 0);
  }

  /** Calculate percentage share of each category */
  calculateCategoryPercentages(emissionsData: { valueKg: number; category: string }[]): { category: string; percentage: number }[] {
    const total = this.calculateTotalEmissions(emissionsData.map(d => d.valueKg));
    return emissionsData.map(d => ({
      category: d.category,
      percentage: total > 0 ? (d.valueKg / total) * 100 : 0,
    }));
  }

  /** Verify Scope 3 data against R1_BASELINE locks */
  verifyScope3Locks(record: any): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    // Check all Scope 3 categories are present
    const requiredCategories = [
      "purchased_goods_services",
      "fuel_energy_activities",
      "transportation_distribution",
      "waste",
    ];
    const providedCategories = record.scope3Categories;

    for (const cat of requiredCategories) {
      if (!providedCategories.includes(cat)) {
        violations.push(`LOCK-GHG-001: Missing required Scope 3 category: ${cat}`);
      }
    }

    // Verify emissions data integrity
    if (record.emissions.co2eKg < 0) {
      violations.push("LOCK-GHG-002: Total emissions cannot be negative");
    }

    // Check data source quality
    const lowQualitySources = record.dataSources.filter(
      (ds: { dataQuality: string }) => ds.dataQuality === "estimated"
    );
    if (lowQualitySources.length > record.dataSources.length * 0.5) {
      violations.push("LOCK-GHG-003: More than 50% of data sources are estimated quality");
    }

    // Verify CO2e breakdown sums to total
    const breakdownTotal = this.calculateTotalEmissions(
      record.emissions.breakDown.map((bd: { valueKg: number }) => bd.valueKg)
    );
    if (Math.abs(breakdownTotal - record.emissions.co2eKg) > 0.01 * record.emissions.co2eKg) {
      violations.push("LOCK-GHG-004: CO2e breakdown does not sum to total emissions");
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }
}

// Export server function for TanStack Start
export const createGHGScope3Record = createServerFn({ method: "POST" })
  .validator(ghgScope3Schema)
  .handler(async ({ data }) => {
    const service = new GHGScope3Service();

    // Verify against architecture locks
    const lockVerification = service.verifyScope3Locks(data);
    if (!lockVerification.valid) {
      throw new Error(`GHG Scope 3 lock violations: ${lockVerification.violations.join("; ")}`);
    }

    // Create the Scope 3 record
    const record = service.createScope3Record(data);

    return {
      ok: true,
      data: record,
      lockVerification,
      source: "ELAS-3-CITY_GHG_Scope3_V4.0",
      r1BaselineReference: "02_TECH/08_GHG_Scope3.docx",
    };
  });

// Export schema type
export type { ghgScope3Schema };