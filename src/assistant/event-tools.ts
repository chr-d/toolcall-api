import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

const baseUrl = process.env.EVENTS_API_URL ?? "http://localhost:3001";

export class EventToolError extends Error {
  override name = "EventToolError";
}

type EventRecord = {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
};

const upcomingEventsInputSchema = z.strictObject({
  location: z.string().trim().min(1).optional(),
  limit: z.number().int().min(1).max(50).default(10),
});

const eventInputSchema = z.object({
  id: z.number().int().positive(),
});

const createEventInputSchema = z.strictObject({
  title: z.string().trim().min(3),
  date: z.iso.datetime(),
  location: z.string().trim().min(1),
  description: z.string().trim().optional(),
});

const updateEventInputSchema = createEventInputSchema
  .partial()
  .extend({ id: z.number().int().positive() })
  .refine(
    (input) =>
      Object.entries(input).some(
        ([field, value]) => field !== "id" && value !== undefined,
      ),
    "Provide at least one event field to update",
  );

const eventFields = {
  title: {
    type: "string",
    minLength: 3,
    description: "The event title, at least 3 characters.",
  },
  date: {
    type: "string",
    description:
      "The event date and time in UTC. Include seconds and a trailing Z, for example 2026-12-31T19:00:00Z.",
  },
  location: {
    type: "string",
    minLength: 1,
    description: "The event location.",
  },
  description: {
    type: "string",
    description: "The event description.",
  },
};

export const tools: Anthropic.Tool[] = [
  {
    name: "get_upcoming_events",
    description:
      "Get upcoming events from the Events API, sorted by date with the soonest first. Pass location when the user asks about a particular place. The tool filters by location before applying the limit. Each event has an id, title, date (ISO 8601) and location.",
    input_schema: {
      type: "object",
      properties: {
        location: {
          type: "string",
          minLength: 1,
          description:
            "Optional location query. Matches any part of the event's location, ignoring case.",
        },
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 50,
          description:
            "How many events to return, from 1 to 50. Defaults to 10.",
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "get_event",
    description:
      "Get one event by its numeric id, including its full description. Use it when the user wants details about a specific event.",
    input_schema: {
      type: "object",
      properties: {
        id: {
          type: "integer",
          minimum: 1,
          description: "The event id, as returned by get_upcoming_events",
        },
      },
      required: ["id"],
    },
  },
  {
    name: "create_event",
    description: "Create a single new event.",
    input_schema: {
      type: "object",
      properties: eventFields,
      required: ["title", "date", "location"],
      input_examples: [
        {
          title: "New Years Party",
          date: "2026-12-31T19:00:00.000Z",
          location: "Brandenburger Tor, Berlin, Germany",
          description: "Lets celebrate the new year together.",
        },
        {
          title: "Music Festival",
          date: "2027-07-02T22:24:48.713Z",
          location: "Berlin",
        },
      ],
      additionalProperties: false,
    },
  },
  {
    name: "update_event",
    description:
      "Update a single existing event when the user requests a change. Supply its numeric ID and at least one field the user wants changed. Omitted fields stay as they are. If the event ID is unknown, use the read tools to identify the event or ask the user to clarify.",
    input_schema: {
      type: "object",
      properties: {
        id: {
          type: "integer",
          minimum: 1,
          description: "The ID of the existing event.",
        },
        ...eventFields,
      },
      required: ["id"],
      additionalProperties: false,
    },
  },
];

async function fetchEvents<T>(path: string, init?: RequestInit): Promise<T> {
  try {
    const response = await fetch(`${baseUrl}/api/events${path}`, init);
    if (!response.ok) {
      const message =
        response.status >= 500 || response.status === 429
          ? "The events system is unavailable."
          : "The events system could not complete the request.";
      throw new EventToolError(message, {
        cause: new Error(`Events API returned HTTP ${response.status}`),
      });
    }
    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof EventToolError) throw error;
    throw new EventToolError("The events system is unavailable.", {
      cause: error,
    });
  }
}

async function getUpcomingEvents({
  limit,
  location,
}: z.infer<typeof upcomingEventsInputSchema>) {
  const events = await fetchEvents<EventRecord[]>("/upcoming");
  const locationQuery = location?.toLowerCase();
  const matchingEvents = locationQuery
    ? events.filter((event) =>
        event.location.toLowerCase().includes(locationQuery),
      )
    : events;
  return matchingEvents
    .slice(0, limit)
    .map(({ id, title, date, location }) => ({ id, title, date, location }));
}

async function getEvent(id: number) {
  const event = await fetchEvents<EventRecord | null>(`/${id}`);
  if (event === null) throw new EventToolError(`No event with id ${id}`);
  return event;
}

function eventWriteHeaders() {
  const token = process.env.EVENTS_API_TOKEN;
  if (!token) {
    throw new EventToolError("The events system is unavailable.", {
      cause: new Error("EVENTS_API_TOKEN is required to write events"),
    });
  }

  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function createEvent(input: z.infer<typeof createEventInputSchema>) {
  return fetchEvents<EventRecord>("", {
    method: "POST",
    headers: eventWriteHeaders(),
    body: JSON.stringify(input),
  });
}

async function updateEvent({
  id,
  ...changes
}: z.infer<typeof updateEventInputSchema>) {
  const event = await fetchEvents<EventRecord | null>(`/${id}`, {
    method: "PUT",
    headers: eventWriteHeaders(),
    body: JSON.stringify(changes),
  });
  if (event === null) throw new EventToolError(`No event with id ${id}`);
  return event;
}

export async function runTool(name: string, input: unknown): Promise<string> {
  switch (name) {
    case "get_upcoming_events": {
      const filters = upcomingEventsInputSchema.parse(input);
      return JSON.stringify(await getUpcomingEvents(filters));
    }
    case "get_event": {
      const { id } = eventInputSchema.parse(input);
      return JSON.stringify(await getEvent(id));
    }
    case "create_event": {
      const event = await createEvent(createEventInputSchema.parse(input));
      console.log(`create_event created event ${event.id}`);
      return JSON.stringify(event);
    }
    case "update_event":
      return JSON.stringify(
        await updateEvent(updateEventInputSchema.parse(input)),
      );
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
