import type { client } from "@kaneo/libs";
import type { InferResponseType } from "hono/client";

export type DashboardTask = InferResponseType<
  (typeof client)["dashboard"]["tasks"]["$get"]
>[number];
