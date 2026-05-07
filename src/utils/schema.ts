import {z} from 'zod';

export function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const properties: Record<string, unknown> = {};
    const required: string[] = [];
    for (const [key, value] of Object.entries(shape)) {
      const child = value as z.ZodTypeAny;
      properties[key] = zodToJsonSchema(child);
      if (!child.isOptional()) required.push(key);
    }
    return {type: 'object', properties, required, additionalProperties: false};
  }
  if (schema instanceof z.ZodString) return {type: 'string', description: schema.description};
  if (schema instanceof z.ZodNumber) return {type: 'number', description: schema.description};
  if (schema instanceof z.ZodBoolean) return {type: 'boolean', description: schema.description};
  if (schema instanceof z.ZodArray) return {type: 'array', items: zodToJsonSchema(schema.element)};
  if (schema instanceof z.ZodOptional || schema instanceof z.ZodNullable) return zodToJsonSchema(schema.unwrap());
  if (schema instanceof z.ZodEnum) return {type: 'string', enum: schema.options};
  return {type: 'object'};
}
