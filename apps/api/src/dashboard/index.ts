import { Hono } from "hono";
import { describeRoute, resolver } from "hono-openapi";
import * as v from "valibot";
import getAllTasks from "./controllers/get-all-tasks";

const dashboardTaskSchema = v.object({
  id: v.string(),
  title: v.string(),
  number: v.nullable(v.number()),
  description: v.nullable(v.string()),
  status: v.string(),
  priority: v.nullable(v.string()),
  dueDate: v.nullable(v.string()),
  position: v.nullable(v.number()),
  createdAt: v.string(),
  userId: v.nullable(v.string()),
  projectId: v.string(),
  assigneeName: v.nullable(v.string()),
  assigneeId: v.nullable(v.string()),
  assigneeImage: v.nullable(v.string()),
  labels: v.array(
    v.object({
      id: v.string(),
      name: v.string(),
      color: v.string(),
    }),
  ),
  project: v.object({
    id: v.string(),
    name: v.string(),
    slug: v.string(),
    icon: v.nullable(v.string()),
    workspaceId: v.string(),
  }),
});

const dashboard = new Hono<{
  Variables: {
    userId: string;
  };
}>().get(
  "/tasks",
  describeRoute({
    operationId: "getAllTasks",
    tags: ["Dashboard"],
    description: "Get all tasks across all workspaces the user has access to",
    responses: {
      200: {
        description: "List of all tasks with project information",
        content: {
          "application/json": {
            schema: resolver(v.array(dashboardTaskSchema)),
          },
        },
      },
    },
  }),
  async (c) => {
    const userId = c.get("userId");
    const tasks = await getAllTasks(userId);
    return c.json(tasks);
  },
);

export default dashboard;
