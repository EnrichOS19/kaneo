import { createFileRoute, redirect } from "@tanstack/react-router";
import { getPendingInvitations } from "@/fetchers/invitation/get-pending-invitations";
import getWorkspaces from "@/fetchers/workspace/get-workspaces";
import { authClient } from "@/lib/auth-client";
import type Workspace from "@/types/workspace";

export const Route = createFileRoute("/_layout/_authenticated/dashboard/")({
  beforeLoad: async () => {
    const workspaces: Workspace[] = await getWorkspaces();
    const invitations = await getPendingInvitations();

    if (invitations && invitations.length > 0 && !workspaces.length) {
      throw redirect({ to: "/invitations" });
    }

    // If user has workspaces, set the active workspace and redirect to all tasks dashboard
    if (workspaces && workspaces.length > 0) {
      const session = await authClient.getSession();
      const activeWorkspaceId = session?.data?.session?.activeOrganizationId;

      // Set active workspace if not already set
      if (
        !activeWorkspaceId ||
        !workspaces.some((ws) => ws.id === activeWorkspaceId)
      ) {
        const firstWorkspace = workspaces[0];
        authClient.organization.setActive({
          organizationId: firstWorkspace.id,
        });
      }

      // Redirect to the all tasks dashboard
      throw redirect({ to: "/dashboard/all-tasks" });
    }

    throw redirect({ to: "/onboarding" });
  },
});
