import type { NextApiRequest } from "next";

import { HttpError } from "@calcom/lib/http-error";
import { defaultHandler, defaultResponder } from "@calcom/lib/server";
import prisma from "@calcom/prisma";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

import { getCalendar } from "../../_utils/getCalendar";

async function postHandler(req: NextApiRequest) {
  // 1. validate request
  if (req.headers["x-goog-channel-token"] !== process.env.CRON_API_KEY) {
    throw new HttpError({ statusCode: 403, message: "Invalid API key" });
  }

  /**
   * TODO: Handle resubscription when channel expires
    "x-goog-channel-expiration": "Tue, 24 Oct 2023 03:34:14 GMT",
   */
  const selectedCalendar = await prisma.selectedCalendar.findFirst({
    where: {
      metadata: {
        path: ["id"],
        equals: req.headers["x-goog-channel-id"],
      },
    },
    select: {
      credential: {
        select: {
          ...credentialForCalendarServiceSelect,
          selectedCalendars: {
            orderBy: {
              externalId: "asc",
            },
          },
        },
      },
    },
  });
  if (!selectedCalendar) throw new HttpError({ statusCode: 404, message: "No calendar found" });
  const { credential } = selectedCalendar;
  if (!credential) throw new HttpError({ statusCode: 404, message: "No credential found" });
  const { selectedCalendars } = credential;
  const calendar = await getCalendar(credential);
  const date = new Date();
  await calendar?.fetchAvailabilityAndSetCache?.({
    dateFrom: new Date().toISOString(),
    // Cache 2 months in advance
    dateTo: new Date(date.getFullYear(), date.getMonth() + 1, 0, 0, 0, 0, 0).toISOString(),
    selectedCalendars,
  });

  return { message: "ok" };
}

export default defaultHandler({
  POST: Promise.resolve({ default: defaultResponder(postHandler) }),
});
