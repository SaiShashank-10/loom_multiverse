import { AjvJsonSchemaValidator } from "@modelcontextprotocol/sdk/validation/ajv";
import type {
  JsonSchemaType,
  JsonSchemaValidator,
} from "@modelcontextprotocol/sdk/validation/types.js";

/** Google upload_design_md currently omits the definition for its recursive root.
 * Restore that definition, not a permissive placeholder. Keep all field validation.
 * Other server schemas and other missing references retain normal AJV behavior.
 */
export class StitchSchemaValidator extends AjvJsonSchemaValidator {
  override getValidator<T>(schema: JsonSchemaType): JsonSchemaValidator<T> {
    const instanceRef = schema.properties?.variantScreenInstance;
    if (
      schema.type === "object" &&
      schema.description?.startsWith("An instance of a screen on the project.") &&
      instanceRef &&
      typeof instanceRef === "object" &&
      instanceRef.$ref === "#/$defs/ScreenInstance" &&
      !schema.$defs?.ScreenInstance
    ) {
      const root = structuredClone(schema);
      return super.getValidator<T>({ ...root, $defs: { ...root.$defs, ScreenInstance: root } });
    }
    return super.getValidator<T>(schema);
  }
}
