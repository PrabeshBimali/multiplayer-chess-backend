import client from "./config/redisClient.js";

async function test() {
  client.set("name", "Prabesh", {EX: 20})
  const name: string | null = await client.get("name")
  console.log(name)
}

test()