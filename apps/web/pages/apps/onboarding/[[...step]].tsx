import type { GetServerSidePropsContext } from "next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import Head from "next/head";
import { usePathname, useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { z } from "zod";

import { appStoreMetadata } from "@calcom/app-store/appStoreMetaData";
import { getLocale } from "@calcom/features/auth/lib/getLocale";
import { getServerSession } from "@calcom/features/auth/lib/getServerSession";
import { useLocale } from "@calcom/lib/hooks/useLocale";
import prisma from "@calcom/prisma";
import type { AppMeta } from "@calcom/types/App";
import { Steps } from "@calcom/ui";

import PageWrapper from "@components/PageWrapper";
import type {
  PersonalAccountProps,
  TeamsProp,
  onSelectParams,
} from "@components/apps/onboarding/AccountsStepCard";
import { AccountsStepCard } from "@components/apps/onboarding/AccountsStepCard";
import type { EventTypeProp } from "@components/apps/onboarding/EventTypesStepCard";
import { EventTypesStepCard } from "@components/apps/onboarding/EventTypesStepCard";
import { OAuthStepCard } from "@components/apps/onboarding/OAuthStepCard";
import { StepFooter } from "@components/apps/onboarding/StepFooter";
import { StepHeader } from "@components/apps/onboarding/StepHeader";

const ERROR_MESSAGES = {
  appNotFound: "App not found",
  userNotAuthed: "User is not logged in",
  userNotFound: "User from session not found",
  userWithoutTeams: "User has no teams on team step",
  noEventTypesFound: "User or teams does not have any event types",
  appNotOAuth: "App does not use OAuth",
  userNotInTeam: "User is not in provided team",
} as const;

const ACCOUNTS_STEP = "accounts";
const OAUTH_STEP = "connect";
const EVENT_TYPES_STEP = "event-types";
/* const CONFIGURE_STEP = "configure";*/

const STEPS = [ACCOUNTS_STEP, OAUTH_STEP, EVENT_TYPES_STEP] as const;
const MAX_NUMBER_OF_STEPS = STEPS.length;

type StepType = (typeof STEPS)[number];

type StepObj = Record<
  StepType,
  {
    getTitle: (appName: string) => string;
    getDescription: (appName: string) => string;
    getStepNumber: (hasTeams: boolean, isOAuth: boolean) => number;
  }
>;

const STEPS_MAP: StepObj = {
  [ACCOUNTS_STEP]: {
    getTitle: () => "Select Account",
    getDescription: (appName) => `Install ${appName} on your personal account or on a team account.`,
    getStepNumber: (hasTeams) => (hasTeams ? 1 : 0),
  },
  [OAUTH_STEP]: {
    getTitle: (appName) => `Install ${appName}`,
    getDescription: (appName) => `Give permissions to connect your Cal.com to ${appName}.`,
    getStepNumber: (hasTeams, isOAuth) => (hasTeams ? 1 : 0) + (isOAuth ? 1 : 0),
  },
  [EVENT_TYPES_STEP]: {
    getTitle: () => "Select Event Type",
    getDescription: (appName) => `On which event type do you want to install ${appName}?`,
    getStepNumber: (hasTeams, isOAuth) => 1 + (hasTeams ? 1 : 0) + (isOAuth ? 1 : 0),
  },
  /* [CONFIGURE_STEP]: {
    getTitle: (appName) => `Configure ${appName}`,
    getDescription: () => "Finalise the App setup. You can change these settings later.",
    getStepNumber: (hasTeams, isOAuth) => 2 + (hasTeams ? 1 : 0) + (isOAuth ? 1 : 0),
  }, */
};

type OnboardingPageProps = {
  hasTeams: boolean;
  appMetadata: AppMeta;
  step: StepType;
  teams: TeamsProp;
  personalAccount: PersonalAccountProps;
  eventTypes?: EventTypeProp[];
  teamId?: number;
  userName: string;
};

const getRedirectUrl = (slug: string, step: StepType, teamId?: number) => {
  return `/apps/onboarding/${step}?slug=${slug}${teamId ? `&teamId=${teamId}` : ""}`;
};

const OnboardingPage = ({
  hasTeams,
  step,
  teams,
  personalAccount,
  appMetadata,
  eventTypes,
  teamId,
  userName,
}: OnboardingPageProps) => {
  const pathname = usePathname();
  const router = useRouter();
  const stepObj = STEPS_MAP[step];
  const nbOfSteps = MAX_NUMBER_OF_STEPS - (hasTeams ? 0 : 1) - (appMetadata.isOAuth ? 0 : 1);
  const { t } = useLocale();

  const handleSelectAccount = ({ type, id: teamId }: onSelectParams) => {
    if (appMetadata.isOAuth) {
      router.push(getRedirectUrl(appMetadata.slug, OAUTH_STEP, teamId));
      return;
    }

    fetch(`/api/integrations/${appMetadata.slug}/add${teamId ? `?teamId=${teamId}` : ""}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }).then(() => {
      if (type === "personal") {
        router.push(getRedirectUrl(appMetadata.slug, EVENT_TYPES_STEP));
        return;
      }

      if (type === "team") {
        router.push(getRedirectUrl(appMetadata.slug, EVENT_TYPES_STEP, teamId));
        return;
      }
    });
  };

  const handleSelectEventType = (id: number) => {
    router.push(`/event-types/${id}?tabName=apps&slug=${appMetadata.slug}`);
    return;
  };

  const handleOAuth = async () => {
    const state = JSON.stringify({
      slug: appMetadata.slug,
      teamId: teamId,
    });

    const res = await fetch(`/api/integrations/${appMetadata.slug}/add?state=${state}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const oAuthUrl = (await res.json())?.url;
    // call App add endpoint, redirect user to returned URL to start app OAuth flow
    // callback endpoint for oauth app should send back to event-types step
    // use state.returnTo
    router.push(getRedirectUrl(appMetadata.slug, EVENT_TYPES_STEP, teamId));
  };

  /* const handleSaveSettings = (data: Record<string, unknown>) => {
    return;
  }; */

  return (
    <div
      key={pathname}
      className="dark:bg-brand dark:text-brand-contrast text-emphasis min-h-screen"
      data-testid="onboarding"
      style={
        {
          "--cal-brand": "#111827",
          "--cal-brand-emphasis": "#101010",
          "--cal-brand-text": "white",
          "--cal-brand-subtle": "#9CA3AF",
        } as CSSProperties
      }>
      <Head>
        <title>Install {appMetadata?.name ?? ""}</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <div className="mx-auto py-6 sm:px-4 md:py-24">
        <div className="relative">
          <div className="sm:mx-auto sm:w-full sm:max-w-[600px]">
            <StepHeader
              title={stepObj.getTitle(appMetadata.name)}
              subtitle={stepObj.getDescription(appMetadata.name)}>
              <Steps
                maxSteps={nbOfSteps}
                currentStep={stepObj.getStepNumber(hasTeams, appMetadata.isOAuth ?? false)}
                disableNavigation
              />
            </StepHeader>
            {step === ACCOUNTS_STEP && (
              <AccountsStepCard
                teams={teams}
                personalAccount={personalAccount}
                onSelect={handleSelectAccount}
              />
            )}
            {step === OAUTH_STEP && (
              <OAuthStepCard
                description={appMetadata.description}
                name={appMetadata.name}
                logo={appMetadata.logo}
                onClick={handleOAuth}
              />
            )}
            {step === EVENT_TYPES_STEP && eventTypes && Boolean(eventTypes?.length) && (
              <EventTypesStepCard
                eventTypes={eventTypes}
                onSelect={handleSelectEventType}
                userName={userName}
              />
            )}
            {/* {step === CONFIGURE_STEP && (
              <ConfigureStepCard slug={appMetadata.slug} eventType={4} onSave={handleSaveSettings} />
            )} */}
            <StepFooter />
          </div>
        </div>
      </div>
    </div>
  );
};

export const getServerSideProps = async (context: GetServerSidePropsContext) => {
  try {
    const { req, res, query, params } = context;
    const stepsEnum = z.enum(STEPS);
    const parsedAppSlug = z.coerce.string().parse(query?.slug);
    const parsedStepParam = z.coerce.string().parse(params?.step);
    const parsedTeamIdParam = z.coerce.number().optional().parse(query?.teamId);
    //const parsedEventTypeIdParam = z.coerce.number().optional().parse(query?.eventTypeId);

    stepsEnum.parse(parsedStepParam);
    const session = await getServerSession({ req, res });
    const locale = await getLocale(context.req);
    let eventTypes: EventTypeProp[] = [];
    if (!session?.user?.id) throw new Error(ERROR_MESSAGES.userNotAuthed);

    const user = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },
      select: {
        id: true,
        avatar: true,
        name: true,
        username: true,
        teams: {
          select: {
            accepted: true,
            team: {
              select: {
                id: true,
                name: true,
                logo: true,
              },
            },
          },
        },
      },
    });

    if (!user) {
      throw new Error(ERROR_MESSAGES.userNotFound);
    }

    const userAcceptedTeams = user.teams
      .filter((team) => team.accepted)
      .map((team) => ({ ...team.team, accepted: team.accepted }));
    const hasTeams = Boolean(userAcceptedTeams.length);

    if (parsedTeamIdParam) {
      const isUserMemberOfTeam = userAcceptedTeams.some((team) => team.id === parsedTeamIdParam);
      if (!isUserMemberOfTeam) {
        throw new Error(ERROR_MESSAGES.userNotInTeam);
      }
    }

    if (!hasTeams && parsedStepParam === ACCOUNTS_STEP) {
      throw new Error(ERROR_MESSAGES.userWithoutTeams);
    }
    if (parsedStepParam === EVENT_TYPES_STEP) {
      eventTypes = (
        await prisma.eventType.findMany({
          select: {
            id: true,
            description: true,
            durationLimits: true,
            metadata: true,
            length: true,
            title: true,
            position: true,
            recurringEvent: true,
            requiresConfirmation: true,
            team: { select: { slug: true } },
            slug: true,
          },
          where: parsedTeamIdParam ? { teamId: parsedTeamIdParam } : { userId: user.id },
        })
      ).sort((eventTypeA, eventTypeB) => {
        return eventTypeB.position - eventTypeA.position;
      });
      if (eventTypes.length === 0) {
        throw new Error(ERROR_MESSAGES.noEventTypesFound);
      }
    }

    const app = await prisma.app.findUnique({
      where: { slug: parsedAppSlug, enabled: true },
      select: { slug: true, keys: true, enabled: true, dirName: true },
    });
    if (!app) throw new Error(ERROR_MESSAGES.appNotFound);

    const appMetadata = appStoreMetadata[app.dirName as keyof typeof appStoreMetadata];

    if (parsedStepParam === OAUTH_STEP && !appMetadata.isOAuth) {
      throw new Error(ERROR_MESSAGES.appNotOAuth);
    }

    const appInstalls = await prisma.credential.findMany({
      where: {
        OR: [
          {
            appId: parsedAppSlug,
            userId: session.user.id,
          },
          {
            appId: parsedAppSlug,
            userId: session.user.id,
            teamId: { in: userAcceptedTeams.map(({ id }) => id) },
          },
        ],
      },
    });

    const personalAccount = {
      id: user.id,
      name: user.name,
      avatar: user.avatar,
      alreadyInstalled: appInstalls.some((install) => !Boolean(install.teamId) && install.userId === user.id),
    };

    const teamsWithIsAppInstalled = hasTeams
      ? userAcceptedTeams.map((team) => ({
          ...team,
          alreadyInstalled: appInstalls.some(
            (install) => Boolean(install.teamId) && install.userId === user.id && install.teamId === team.id
          ),
        }))
      : [];
    return {
      props: {
        ...(await serverSideTranslations(locale, ["common"])),
        hasTeams,
        app,
        appMetadata,
        step: parsedStepParam,
        teams: teamsWithIsAppInstalled,
        personalAccount,
        eventTypes,
        teamId: parsedTeamIdParam ?? null,
        userName: user.username,
      } as OnboardingPageProps,
    };
  } catch (err) {
    const { query } = context;

    if (err instanceof z.ZodError) {
      console.info("Zod Parse Error", err.message);
      return { redirect: { permanent: false, destination: "/apps" } };
    }

    if (err instanceof Error) {
      console.info("Redirect Error", err.message);
      switch (err.message) {
        case ERROR_MESSAGES.userNotAuthed:
          return { redirect: { permanent: false, destination: "/auth/login" } };
        case ERROR_MESSAGES.userNotFound:
          return { redirect: { permanent: false, destination: "/auth/login" } };
        case ERROR_MESSAGES.appNotFound:
          return { redirect: { permanent: false, destination: "/apps" } };
        case ERROR_MESSAGES.appNotOAuth:
          return { redirect: { permanent: false, destination: "/apps" } };
        case ERROR_MESSAGES.userNotInTeam:
          return { redirect: { permanent: false, destination: "/apps" } };
        case ERROR_MESSAGES.noEventTypesFound:
          return { redirect: { permanent: false, destination: "/apps/installed" } };
        case ERROR_MESSAGES.userWithoutTeams:
          return {
            redirect: { permanent: false, destination: `/apps/onboarding/install?slug=${query?.slug}` },
          };
        default:
          return {
            redirect: { permanent: false, destination: `/apps` },
          };
      }
    }
  }
};

OnboardingPage.isThemeSupported = false;
OnboardingPage.PageWrapper = PageWrapper;

export default OnboardingPage;
