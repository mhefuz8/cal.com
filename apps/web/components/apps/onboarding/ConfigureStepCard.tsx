import type { FC } from "react";
import React from "react";

import { EventTypeAppCard } from "@calcom/app-store/_components/EventTypeAppCardInterface";
import { trpc } from "@calcom/trpc";
import { StepCard } from "@calcom/ui";

type ConfigureStepCardProps = {
  slug: string;
  teamId?: number;
  eventType: number;
  onSave: (data: Record<string, unknown>) => void;
};

export const ConfigureStepCard: FC<ConfigureStepCardProps> = ({ slug, teamId, eventType, onSave }) => {
  const { data: eventTypeApps, isLoading } = trpc.viewer.integrations.useQuery({
    extendsFeature: "EventType",
    teamId,
    appId: slug,
  });

  const app = eventTypeApps?.items[0];

  return !!app ? (
    <StepCard>
      <EventTypeAppCard
        app={app}
        switchChecked={true}
        eventType={4}
        getAppData={() => {
          return;
        }}
        setAppData={() => {
          return;
        }}
      />
    </StepCard>
  ) : (
    <></>
  );
};
{
}
