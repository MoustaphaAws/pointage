import { query } from "./backend/db.mjs";
async function test() {
  const result = await query("SELECT column_name, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = 'configurations'");
  console.log(result.rows);
}
test().catch(console.error).then(() => process.exit(0));
