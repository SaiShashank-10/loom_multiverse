import { StitchClient } from "./stitch-client.js";

// Read-only preflight: no LLM, project creation, or screen-generation charges.
async function main() {
  const client = new StitchClient();
  try {
    console.log("Checking Google Stitch credentials, connection and required tools...");
    await client.connect();
    console.log("Google Stitch is reachable and its required tools are available.");
  } catch (error) {
    console.error(`Google Stitch check failed: ${String(error)}`);
    console.error(
      "Check STITCH_API_KEY in the repository .env and HTTPS access to stitch.googleapis.com. Source generation will not bypass this failure.",
    );
    process.exitCode = 1;
  } finally {
    await client.disconnect();
  }
}
main().catch((error) => {
  console.error(String(error));
  process.exitCode = 1;
});
