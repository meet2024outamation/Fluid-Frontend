import { z } from "zod";

// Tenant validation schema
export const tenantSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be less than 100 characters"),

  identifier: z
    .string()
    .min(1, "Identifier is required")
    .regex(
      /^[a-zA-Z0-9_-]+$/,
      "Identifier can only contain letters, numbers, hyphens, and underscores"
    )
    .max(50, "Identifier must be less than 50 characters"),

  databaseName: z
    .string()
    .min(1, "Database name is required")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Database name can only contain letters, numbers, and underscores"
    )
    .max(50, "Database name must be less than 50 characters"),

  description: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : val)),

  properties: z
    .string()
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : val)),
});

// User validation schema
export const userSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name must be less than 50 characters"),

  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name must be less than 50 characters"),

  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),

  roleId: z.number().min(1, "Role is required"),

  tenantId: z.number().optional(),

  projectId: z.number().optional(),
});

// Schema field validation schema
export const schemaFieldSchema = z.object({
  fieldName: z
    .string()
    .min(1, "Field name is required")
    .max(100, "Field name must be less than 100 characters")
    .regex(
      /^[a-zA-Z][a-zA-Z0-9_]*$/,
      "Field name must start with a letter and contain only letters, numbers, and underscores"
    ),

  fieldLabel: z
    .string()
    .min(1, "Field label is required")
    .max(255, "Field label must be less than 255 characters"),

  dataType: z.enum(
    [
      "string",
      "number",
      "boolean",
      "date",
      "datetime",
      "decimal",
      "email",
      "url",
      "phone",
      "currency",
      "text",
      "longtext",
    ],
    {
      message: "Please select a valid data type",
    }
  ),

  format: z
    .string()
    .max(100, "Format must be less than 100 characters")
    .optional(),

  isRequired: z.boolean(),

  displayOrder: z
    .number()
    .min(1, "Display order must be greater than 0")
    .int("Display order must be a whole number"),
});

// Global schema validation schema
export const globalSchemaSchema = z.object({
  name: z
    .string()
    .min(1, "Schema name is required")
    .max(100, "Schema name must be less than 100 characters"),

  description: z
    .string()
    .max(500, "Description must be less than 500 characters")
    .nullable()
    .optional()
    .transform((val) => (val === "" ? null : val)),

  schemaFields: z
    .array(schemaFieldSchema)
    .min(1, "At least one schema field is required")
    .refine(
      (fields) => {
        const fieldNames = fields.map((f) => f.fieldName.toLowerCase());
        return new Set(fieldNames).size === fieldNames.length;
      },
      {
        message: "Field names must be unique",
      }
    )
    .refine(
      (fields) => {
        const displayOrders = fields.map((f) => f.displayOrder);
        return new Set(displayOrders).size === displayOrders.length;
      },
      {
        message: "Display orders must be unique",
      }
    ),
});

// Extract types from schemas
export type TenantFormData = z.infer<typeof tenantSchema>;
export type UserFormData = z.infer<typeof userSchema>;
export type SchemaFieldFormData = z.infer<typeof schemaFieldSchema>;
export type GlobalSchemaFormData = z.infer<typeof globalSchemaSchema>;

// Validation helper function
export const validateField = <T>(
  schema: z.ZodSchema<T>,
  data: any,
  fieldName: string
): string | null => {
  try {
    schema.parse(data);
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const fieldError = error.issues.find((err: any) =>
        err.path.includes(fieldName)
      );
      return fieldError?.message || null;
    }
    return null;
  }
};

// Validate specific field with partial data
export const validateSingleField = <T extends Record<string, any>>(
  schema: z.ZodObject<any>,
  fieldName: keyof T,
  value: any
): string | null => {
  try {
    const fieldSchema = schema.shape[fieldName];
    if (fieldSchema) {
      fieldSchema.parse(value);
    }
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return error.issues[0]?.message || null;
    }
    return null;
  }
};

// Validate global schema form data
export const validateGlobalSchema = (
  data: any
): {
  isValid: boolean;
  errors: { [key: string]: string };
} => {
  try {
    globalSchemaSchema.parse(data);
    return { isValid: true, errors: {} };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors: { [key: string]: string } = {};

      error.issues.forEach((issue) => {
        const path = issue.path.join(".");
        errors[path] = issue.message;
      });

      return { isValid: false, errors };
    }
    return { isValid: false, errors: { general: "Validation failed" } };
  }
};

// Validate individual schema field
export const validateSchemaField = (
  fieldData: any,
  index?: number
): { [key: string]: string } => {
  const errors: { [key: string]: string } = {};
  const prefix = index !== undefined ? `field_${index}_` : "";

  try {
    schemaFieldSchema.parse(fieldData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      error.issues.forEach((issue) => {
        const fieldName = String(issue.path[0]);
        errors[`${prefix}${fieldName}`] = issue.message;
      });
    }
  }

  return errors;
};
