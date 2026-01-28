import { useQuery } from "@tanstack/react-query";
import getAllTasks from "@/fetchers/dashboard/get-all-tasks";

export function useGetAllTasks() {
  return useQuery({
    queryKey: ["dashboard", "tasks"],
    queryFn: () => getAllTasks(),
    refetchInterval: 10000,
  });
}
