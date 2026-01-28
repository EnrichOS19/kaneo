import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  CheckCircle2,
  Circle,
  CircleDashed,
  CircleDot,
  Filter,
  FolderKanban,
  User,
  X,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import DashboardLayout from "@/components/common/dashboard-layout";
import PageTitle from "@/components/page-title";
import TaskDetailsSheet from "@/components/task/task-details-sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import icons from "@/constants/project-icons";
import { useUpdateTaskStatus } from "@/hooks/mutations/task/use-update-task-status";
import { useGetAllTasks } from "@/hooks/queries/dashboard/use-get-all-tasks";
import { cn } from "@/lib/cn";
import type { DashboardTask } from "@/types/dashboard";

type AllTasksSearchParams = {
  taskId?: string;
  projectId?: string;
  workspaceId?: string;
};

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/all-tasks",
)({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): AllTasksSearchParams => ({
    taskId: typeof search.taskId === "string" ? search.taskId : undefined,
    projectId:
      typeof search.projectId === "string" ? search.projectId : undefined,
    workspaceId:
      typeof search.workspaceId === "string" ? search.workspaceId : undefined,
  }),
});

type SortField = "title" | "project" | "status" | "assignee" | "dueDate";
type SortDirection = "asc" | "desc";

type Filters = {
  project: string | null;
  status: string | null;
  assignee: string | null;
};

const STATUS_OPTIONS = [
  { id: "to-do", name: "To Do" },
  { id: "in-progress", name: "In Progress" },
  { id: "in-review", name: "In Review" },
  { id: "done", name: "Done" },
];

function getStatusIcon(status: string) {
  switch (status) {
    case "to-do":
      return <Circle className="h-3.5 w-3.5 text-muted-foreground" />;
    case "in-progress":
      return <CircleDashed className="h-3.5 w-3.5 text-blue-500" />;
    case "in-review":
      return <CircleDot className="h-3.5 w-3.5 text-yellow-500" />;
    case "done":
      return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    default:
      return <Circle className="h-3.5 w-3.5 text-muted-foreground" />;
  }
}

function getStatusName(status: string) {
  const statusOption = STATUS_OPTIONS.find((s) => s.id === status);
  return statusOption?.name || status;
}

function RouteComponent() {
  const { taskId, projectId, workspaceId } = Route.useSearch();
  const navigate = useNavigate();
  const { data: tasks, isLoading } = useGetAllTasks();
  const updateTaskStatus = useUpdateTaskStatus();

  const [sortField, setSortField] = useState<SortField>("dueDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [filters, setFilters] = useState<Filters>({
    project: null,
    status: null,
    assignee: null,
  });

  // Get unique projects and assignees for filters
  const { projects, assignees } = useMemo(() => {
    if (!tasks) return { projects: [], assignees: [] };

    const projectsMap = new Map<string, { id: string; name: string }>();
    const assigneesMap = new Map<
      string,
      { id: string; name: string; image: string | null }
    >();

    for (const task of tasks) {
      if (task.project) {
        projectsMap.set(task.project.id, {
          id: task.project.id,
          name: task.project.name,
        });
      }
      if (task.assigneeId && task.assigneeName) {
        assigneesMap.set(task.assigneeId, {
          id: task.assigneeId,
          name: task.assigneeName,
          image: task.assigneeImage,
        });
      }
    }

    return {
      projects: Array.from(projectsMap.values()),
      assignees: Array.from(assigneesMap.values()),
    };
  }, [tasks]);

  // Filter and sort tasks
  const filteredAndSortedTasks = useMemo(() => {
    if (!tasks) return [];

    let filtered = tasks.filter((task) => {
      // Exclude archived and planned tasks from dashboard view
      if (task.status === "archived" || task.status === "planned") {
        return false;
      }

      if (filters.project && task.project?.id !== filters.project) {
        return false;
      }
      if (filters.status && task.status !== filters.status) {
        return false;
      }
      if (filters.assignee && task.assigneeId !== filters.assignee) {
        return false;
      }
      return true;
    });

    // Sort
    filtered = [...filtered].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
        case "project":
          comparison = (a.project?.name || "").localeCompare(
            b.project?.name || "",
          );
          break;
        case "status": {
          const statusOrder = ["to-do", "in-progress", "in-review", "done"];
          comparison =
            statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status);
          break;
        }
        case "assignee":
          comparison = (a.assigneeName || "Unassigned").localeCompare(
            b.assigneeName || "Unassigned",
          );
          break;
        case "dueDate": {
          // Put tasks without due dates at the end
          if (!a.dueDate && !b.dueDate) comparison = 0;
          else if (!a.dueDate) comparison = 1;
          else if (!b.dueDate) comparison = -1;
          else
            comparison =
              new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
          break;
        }
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [tasks, filters, sortField, sortDirection]);

  const hasActiveFilters = Object.values(filters).some((f) => f !== null);

  const clearFilters = () => {
    setFilters({ project: null, status: null, assignee: null });
  };

  const updateFilter = (key: keyof Filters, value: string | null) => {
    setFilters((prev) => ({
      ...prev,
      [key]: prev[key] === value ? null : value,
    }));
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3" />
    ) : (
      <ArrowDown className="h-3 w-3" />
    );
  };

  const handleTaskClick = useCallback(
    (task: DashboardTask) => {
      navigate({
        to: ".",
        search: {
          taskId: task.id,
          projectId: task.projectId,
          workspaceId: task.project?.workspaceId,
        },
        replace: true,
      });
    },
    [navigate],
  );

  const handleCloseTaskSheet = useCallback(() => {
    navigate({
      to: ".",
      search: {},
      replace: true,
    });
  }, [navigate]);

  const handleStatusChange = useCallback(
    (task: DashboardTask, newStatus: string) => {
      updateTaskStatus.mutate({
        ...task,
        status: newStatus,
        dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      } as Parameters<typeof updateTaskStatus.mutate>[0]);
    },
    [updateTaskStatus],
  );

  const handleNavigateToProject = useCallback(
    (task: DashboardTask) => {
      if (task.project) {
        navigate({
          to: "/dashboard/workspace/$workspaceId/project/$projectId/board",
          params: {
            workspaceId: task.project.workspaceId,
            projectId: task.project.id,
          },
        });
      }
    },
    [navigate],
  );

  if (isLoading) {
    return (
      <>
        <PageTitle title="All Tasks" />
        <DashboardLayout title="All Tasks">
          <div className="p-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-foreground font-medium">
                    Task
                  </TableHead>
                  <TableHead className="text-foreground font-medium">
                    Project
                  </TableHead>
                  <TableHead className="text-foreground font-medium">
                    Status
                  </TableHead>
                  <TableHead className="text-foreground font-medium">
                    Assignee
                  </TableHead>
                  <TableHead className="text-foreground font-medium">
                    Due Date
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i}>
                    <TableCell className="py-3">
                      <Skeleton className="h-4 w-48" />
                    </TableCell>
                    <TableCell className="py-3">
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                    <TableCell className="py-3">
                      <Skeleton className="h-6 w-20" />
                    </TableCell>
                    <TableCell className="py-3">
                      <Skeleton className="h-6 w-6 rounded-full" />
                    </TableCell>
                    <TableCell className="py-3">
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DashboardLayout>
      </>
    );
  }

  if (!tasks || tasks.length === 0) {
    return (
      <>
        <PageTitle title="All Tasks" />
        <DashboardLayout title="All Tasks">
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 mx-auto rounded-xl bg-muted flex items-center justify-center">
                <FolderKanban className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">No tasks yet</h3>
                <p className="text-muted-foreground">
                  Tasks from all your projects will appear here.
                </p>
              </div>
            </div>
          </div>
        </DashboardLayout>
      </>
    );
  }

  return (
    <>
      <PageTitle title="All Tasks" />
      <DashboardLayout title="All Tasks">
        <div className="flex flex-col h-full">
          {/* Filter Bar */}
          <div className="bg-card border-b border-border">
            <div className="h-10 flex items-center px-4">
              <div className="flex items-center gap-2">
                {/* Filter Chips */}
                {filters.project && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-6 px-2 text-xs gap-1.5"
                  >
                    <FolderKanban className="h-3 w-3" />
                    <span>
                      Project is{" "}
                      {projects.find((p) => p.id === filters.project)?.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-3 w-3 p-0 ml-1 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateFilter("project", null);
                      }}
                    >
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  </Button>
                )}

                {filters.status && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-6 px-2 text-xs gap-1.5"
                  >
                    {getStatusIcon(filters.status)}
                    <span>Status is {getStatusName(filters.status)}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-3 w-3 p-0 ml-1 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateFilter("status", null);
                      }}
                    >
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  </Button>
                )}

                {filters.assignee && (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="h-6 px-2 text-xs gap-1.5"
                  >
                    <User className="h-3 w-3" />
                    <span>
                      Assignee is{" "}
                      {assignees.find((a) => a.id === filters.assignee)?.name}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-3 w-3 p-0 ml-1 hover:bg-destructive hover:text-destructive-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateFilter("assignee", null);
                      }}
                    >
                      <X className="h-2.5 w-2.5" />
                    </Button>
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground"
                    >
                      <Filter className="h-3 w-3 mr-1" />
                      Filter
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-46" align="start">
                    {hasActiveFilters && (
                      <>
                        <DropdownMenuItem onClick={clearFilters}>
                          <span>Clear all filters</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                      </>
                    )}

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-2">
                        <span>Project</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-48">
                        {projects.map((project) => (
                          <DropdownMenuCheckboxItem
                            key={project.id}
                            checked={filters.project === project.id}
                            onCheckedChange={() =>
                              updateFilter("project", project.id)
                            }
                          >
                            <FolderKanban className="h-3.5 w-3.5" />
                            <span>{project.name}</span>
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-2">
                        <span>Status</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-48">
                        {STATUS_OPTIONS.map((status) => (
                          <DropdownMenuCheckboxItem
                            key={status.id}
                            checked={filters.status === status.id}
                            onCheckedChange={() =>
                              updateFilter("status", status.id)
                            }
                          >
                            {getStatusIcon(status.id)}
                            <span>{status.name}</span>
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="gap-2">
                        <span>Assignee</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-48">
                        {assignees.map((assignee) => (
                          <DropdownMenuCheckboxItem
                            key={assignee.id}
                            checked={filters.assignee === assignee.id}
                            onCheckedChange={() =>
                              updateFilter("assignee", assignee.id)
                            }
                          >
                            <Avatar className="h-5 w-5">
                              <AvatarImage
                                src={assignee.image ?? ""}
                                alt={assignee.name}
                              />
                              <AvatarFallback className="text-xs font-medium border border-border/30">
                                {assignee.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span>{assignee.name}</span>
                          </DropdownMenuCheckboxItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="ml-auto text-xs text-muted-foreground">
                {filteredAndSortedTasks.length} task
                {filteredAndSortedTasks.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead
                    className="text-foreground font-medium cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("title")}
                  >
                    <div className="flex items-center gap-1">
                      Task
                      {getSortIcon("title")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-foreground font-medium cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("project")}
                  >
                    <div className="flex items-center gap-1">
                      Project
                      {getSortIcon("project")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-foreground font-medium cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("status")}
                  >
                    <div className="flex items-center gap-1">
                      Status
                      {getSortIcon("status")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-foreground font-medium cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("assignee")}
                  >
                    <div className="flex items-center gap-1">
                      Assignee
                      {getSortIcon("assignee")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="text-foreground font-medium cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort("dueDate")}
                  >
                    <div className="flex items-center gap-1">
                      Due Date
                      {getSortIcon("dueDate")}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedTasks.map((task) => {
                  const IconComponent = task.project?.icon
                    ? icons[task.project.icon as keyof typeof icons] ||
                      icons.Layout
                    : icons.Layout;

                  const isOverdue =
                    task.dueDate && new Date(task.dueDate) < new Date();

                  return (
                    <TableRow
                      key={task.id}
                      className="cursor-pointer"
                      onClick={() => handleTaskClick(task)}
                    >
                      <TableCell className="py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{task.title}</span>
                          {task.number && (
                            <span className="text-xs text-muted-foreground">
                              #{task.number}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <button
                          type="button"
                          className="flex items-center gap-2 hover:text-primary transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNavigateToProject(task);
                          }}
                        >
                          <IconComponent className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">{task.project?.name}</span>
                        </button>
                      </TableCell>
                      <TableCell className="py-3">
                        <Select
                          value={task.status}
                          onValueChange={(value) =>
                            handleStatusChange(task, value)
                          }
                        >
                          <SelectTrigger
                            className="w-fit h-7 gap-1.5 border-none shadow-none"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <SelectValue>
                              <div className="flex items-center gap-1.5">
                                {getStatusIcon(task.status)}
                                <span className="text-xs">
                                  {getStatusName(task.status)}
                                </span>
                              </div>
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent onClick={(e) => e.stopPropagation()}>
                            {STATUS_OPTIONS.map((status) => (
                              <SelectItem key={status.id} value={status.id}>
                                <div className="flex items-center gap-1.5">
                                  {getStatusIcon(status.id)}
                                  <span>{status.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="py-3">
                        {task.assigneeId ? (
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage
                                src={task.assigneeImage ?? ""}
                                alt={task.assigneeName || ""}
                              />
                              <AvatarFallback className="text-xs font-medium border border-border/30">
                                {task.assigneeName?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{task.assigneeName}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Unassigned
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="py-3">
                        {task.dueDate ? (
                          <div
                            className={cn(
                              "flex items-center gap-1.5 text-sm",
                              isOverdue &&
                                task.status !== "done" &&
                                "text-destructive",
                            )}
                          >
                            <Calendar className="h-3.5 w-3.5" />
                            <span>
                              {format(new Date(task.dueDate), "MMM d, yyyy")}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            No due date
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>

        {taskId && projectId && workspaceId && (
          <TaskDetailsSheet
            taskId={taskId}
            projectId={projectId}
            workspaceId={workspaceId}
            onClose={handleCloseTaskSheet}
          />
        )}
      </DashboardLayout>
    </>
  );
}
