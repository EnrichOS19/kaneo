import { client } from "@kaneo/libs";

async function getAllTasks() {
  const response = await client.dashboard.tasks.$get();

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error);
  }

  const data = await response.json();

  return data;
}

export default getAllTasks;
