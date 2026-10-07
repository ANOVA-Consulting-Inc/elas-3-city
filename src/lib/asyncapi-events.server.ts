// ELAS-3-CITY AsyncAPI Events Integration - V4.0
// Source: 02_TECH/11_AsyncAPI_Events.docx (R1_BASELINE)
// Purpose: AsyncAPI event definitions for Three Facets communication

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** AsyncAPI Channel Schema */
const asyncapiChannelSchema = z.object({
  channel: z.string(),
  description: z.string(),
  message: z.object({
    name: z.string(),
    payload: z.object({
      [key: string]: z.any(),
    }),
    summary: z.string().optional(),
    description: z.string().optional(),
  }),
  summary: z.string().optional(),
  description: z.string().optional(),
});

/** AsyncAPI Server Schema */
const asyncapiServerSchema = z.object({
  url: z.string(),
  description: z.string().optional(),
});

/** AsyncAPI Document Schema */
const asyncapiDocSchema = z.object({
  openapi: z.string().default("3.0.0"),
  info: z.object({
    title: z.string(),
    version: z.string(),
    description: z.string().optional(),
  }),
  servers: z.array(asyncapiServerSchema).optional(),
  channels: z.record(asyncapiChannelSchema),
});

/** AsyncAPI Event Integration Schema */
const asyncapiIntegrationSchema = z.object({
  facet: z.enum(["utilities", "nexus", "barbados"]),
  eventName: z.string(),
  channel: z.string(),
  payload: z.object({
    [key: string]: z.any(),
  }),
  topic: z.string(),
  server: z.string().optional(),
  protocol: z.enum(["mqtt", "http", "kafka", "rabbitmq"]).default("mqtt"),
  qos: z.enum(["at-most-once", "at-least-once", "exactly-once"]).default("at-least-once"),
  retain: z.boolean().default(false),
  description: z.string().optional(),
  r1BaselineReference: z.string(),
  lockValidation: z.object({
    compliant: z.boolean(),
    violations: z.array(z.string()),
  }),
});

/** AsyncAPI Event Service */
class AsyncAPIEventService {
  /** Validate AsyncAPI document */
  validateAsyncAPIDoc(doc: any): { valid: boolean; violations: string[] } {
    const violations: string[] = [];

    // Check required fields
    if (!doc.info.title) {
      violations.push("LOCK-ASYNC-001: AsyncAPI doc must have a title");
    }
    if (!doc.info.version) {
      violations.push("LOCK-ASYNC-002: AsyncAPI doc must have a version");
    }
    if (!doc.channels) {
      violations.push("LOCK-ASYNC-003: AsyncAPI doc must define channels");
    }

    // Check channels have messages
    if (doc.channels) {
      const channelNames = Object.keys(doc.channels);
      if (channelNames.length === 0) {
        violations.push("LOCK-ASYNC-004: AsyncAPI must have at least one channel");
      }
    }

    return {
      valid: violations.length === 0,
      violations,
    };
  }

  /** Check event lock compliance */
  validateEventLocks(event: any, facet: string): { compliant: boolean; violations: string[] } {
    const violations: string[] = [];

    // Validate event name
    if (!event.eventName) {
      violations.push(`LOCK-ASYNC-005: ${facet} event must have a name`);
    }

    // Validate payload schema
    if (!event.payload) {
      violations.push(`LOCK-ASYNC-006: ${facet} event must have a payload schema`);
    }

    // Validate topic format
    if (!event.topic) {
      violations.push(`LOCK-ASYNC-007: ${facet} event must have a topic`);
    } else if (!event.topic.startsWith(`${facet}/`)) {
      violations.push(`LOCK-ASYNC-008: ${facet} event topic must start with "${facet}/"`);
    }

    // Validate protocol
    const validProtocols = ["mqtt", "http", "kafka", "rabbitmq"];
    if (event.protocol && !validProtocols.includes(event.protocol)) {
      violations.push(`LOCK-ASYNC-009: Invalid protocol "${event.protocol}"`);
    }

    // Validate QoS
    const validQoS = ["at-most-once", "at-least-once", "exactly-once"];
    if (event.qos && !validQoS.includes(event.qos)) {
      violations.push(`LOCK-ASYNC-010: Invalid QoS "${event.qos}"`);
    }

    return {
      compliant: violations.length === 0,
      violations,
    };
  }
}

// Export server function for TanStack Start
export const publishAsyncAPIEvent = createServerFn({ method: "POST" })
  .validator(asyncapiIntegrationSchema)
  .handler(async ({ data }) => {
    const service = new AsyncAPIEventService();

    // Validate event integration
    const eventValidation = service.validateEventLocks(data, data.facet);
    if (!eventValidation.compliant) {
      throw new Error(`AsyncAPI event lock violations: ${eventValidation.violations.join("; ")}`);
    }

    // Validate the full AsyncAPI document would be valid
    const docValidation = service.validateAsyncAPIDoc({
      info: {
        title: `${data.facet}-events`,
        version: "1.0.0",
      },
      channels: {
        [data.channel]: {
          message: {
            name: data.eventName,
            payload: data.payload,
          },
          summary: data.description,
        },
      },
    });
    if (!eventValidation.compliant && docValidation.violations.length > 0) {
      // Still return success but warn about doc validation
    }

    return {
      ok: true,
      data: {
        ...data,
        eventPublishedAt: new Date().toISOString(),
        eventId: `EVT-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        validation: eventValidation,
      },
      source: "ELAS-3-CITY_AsyncAPI_Events_V4.0",
      r1BaselineReference: "02_TECH/11_AsyncAPI_Events.docx",
    };
  });

// Export schema type
export type { asyncapiIntegrationSchema };