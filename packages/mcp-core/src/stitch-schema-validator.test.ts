import { describe, it, expect } from "vitest";
import { StitchSchemaValidator } from "./stitch-schema-validator.js";

describe("Stitch schema compatibility", () => {
  it("repairs the missing recursive ScreenInstance definition without disabling validation", () => {
    const schema = {
      type: "object",
      description: "An instance of a screen on the project. Next ID: 18",
      properties: {
        id: { type: "string" },
        variantScreenInstance: { $ref: "#/$defs/ScreenInstance" },
      },
    } as const;
    const validate = new StitchSchemaValidator().getValidator(schema);
    expect(validate({ id: "one", variantScreenInstance: { id: "two" } }).valid).toBe(true);
    expect(validate({ id: "one", variantScreenInstance: { id: 42 } }).valid).toBe(false);
    expect(schema).not.toHaveProperty("$defs");
  });
  it("does not suppress unrelated missing references", () => {
    expect(() =>
      new StitchSchemaValidator().getValidator({
        type: "object",
        properties: { value: { $ref: "#/$defs/Missing" } },
      }),
    ).toThrow();
  });
  it("preserves validation for normal schemas", () => {
    const validate = new StitchSchemaValidator().getValidator({
      type: "object",
      required: ["screens"],
      properties: { screens: { type: "array" } },
    });
    expect(validate({ screens: [] }).valid).toBe(true);
    expect(validate({ screens: "wrong" }).valid).toBe(false);
  });
});
