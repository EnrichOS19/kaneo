import { and, eq, inArray } from "drizzle-orm";
import db from "../../database";
import {
  labelTable,
  projectTable,
  taskTable,
  userTable,
  workspaceUserTable,
} from "../../database/schema";

async function getAllTasks(userId: string) {
  // Get all workspaces the user has access to
  const userWorkspaces = await db.query.workspaceUserTable.findMany({
    where: eq(workspaceUserTable.userId, userId),
  });

  const workspaceIds = userWorkspaces.map((wu) => wu.workspaceId);

  if (workspaceIds.length === 0) {
    return [];
  }

  // Get all projects from user's workspaces
  const projects = await db.query.projectTable.findMany({
    where: inArray(projectTable.workspaceId, workspaceIds),
  });

  const projectIds = projects.map((p) => p.id);

  if (projectIds.length === 0) {
    return [];
  }

  // Get all tasks from these projects (excluding archived)
  const tasks = await db
    .select({
      id: taskTable.id,
      title: taskTable.title,
      number: taskTable.number,
      description: taskTable.description,
      status: taskTable.status,
      priority: taskTable.priority,
      dueDate: taskTable.dueDate,
      position: taskTable.position,
      createdAt: taskTable.createdAt,
      userId: taskTable.userId,
      projectId: taskTable.projectId,
      assigneeName: userTable.name,
      assigneeId: userTable.id,
      assigneeImage: userTable.image,
      projectName: projectTable.name,
      projectSlug: projectTable.slug,
      projectIcon: projectTable.icon,
      workspaceId: projectTable.workspaceId,
    })
    .from(taskTable)
    .leftJoin(userTable, eq(taskTable.userId, userTable.id))
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(
      and(
        inArray(taskTable.projectId, projectIds),
        // Exclude archived tasks from the dashboard view
        // Users can still see them in individual project views
      ),
    )
    .orderBy(taskTable.createdAt);

  // Get labels for all tasks
  const taskIds = tasks.map((task) => task.id);

  const labelsData =
    taskIds.length > 0
      ? await db
          .select({
            id: labelTable.id,
            name: labelTable.name,
            color: labelTable.color,
            taskId: labelTable.taskId,
          })
          .from(labelTable)
          .where(inArray(labelTable.taskId, taskIds))
      : [];

  const taskLabelsMap = new Map<
    string,
    Array<{ id: string; name: string; color: string }>
  >();
  for (const label of labelsData) {
    if (label.taskId) {
      if (!taskLabelsMap.has(label.taskId)) {
        taskLabelsMap.set(label.taskId, []);
      }
      taskLabelsMap.get(label.taskId)?.push({
        id: label.id,
        name: label.name,
        color: label.color,
      });
    }
  }

  // Return tasks with labels and project info
  return tasks.map((task) => ({
    ...task,
    labels: taskLabelsMap.get(task.id) || [],
    project: {
      id: task.projectId,
      name: task.projectName,
      slug: task.projectSlug,
      icon: task.projectIcon,
      workspaceId: task.workspaceId,
    },
  }));
}

export default getAllTasks;
