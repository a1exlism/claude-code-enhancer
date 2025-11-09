import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const baseUrl = process.env.API_BASE_URL ?? "https://example.com";

  const { data } = await axios.get(baseUrl);
  console.log("Fetched data:", data);
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exitCode = 1;
});
