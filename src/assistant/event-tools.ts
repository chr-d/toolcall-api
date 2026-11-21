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

const upcomingEventsInputSchema = z.object({
  limit: z.number().int().min(1).max(50).default(10),
});

const eventInputSchema = z.object({
  id: z.number().int(),
});

const createEventInputSchema = z.object({
  title: z.string().min(3),
  date: z.iso.datetime(),
  location: z.string(),
  description: z.string().optional(),
});

type CreateEventInput = z.infer<typeof createEventInputSchema>;

export const tools: Anthropic.Tool[] = [
  {
    name: "get_upcoming_events",
    description:
      "Get upcoming events from the Events API, sorted by date with the soonest first. Each event has an id, title, date (ISO 8601) and location (free text, usually venue, city and country). Use it for any question about what is on, where or when.",
    input_schema: {
      type: "object",
      properties: {
        limit: {
          type: "integer",
          minimum: 1,
          maximum: 50,
          description:
            "How many events to return, from 1 to 50. Defaults to 10.",
        },
      },
      required: [],
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
      properties: {
        title: {
          type: "string",
          description: "The event title.",
        },
        date: {
          type: "string",
          description: "The event date and UTC time in ISO 8601 format.",
        },
        location: {
          type: "string",
          description: "The event location.",
        },
        description: {
          type: "string",
          description: "An optional description of the event.",
        },
      },
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

async function getUpcomingEvents(limit: number) {
  const events = await fetchEvents<EventRecord[]>("/upcoming");
  return events
    .slice(0, limit)
    .map(({ id, title, date, location }) => ({ id, title, date, location }));
}

async function getEvent(id: number) {
  const event = await fetchEvents<EventRecord | null>(`/${id}`);
  if (event === null) throw new EventToolError(`No event with id ${id}`);
  return event;
}

async function createEvent(input: CreateEventInput) {
  const token = process.env.EVENTS_API_TOKEN;
  if (!token) {
    throw new EventToolError("The events system is unavailable.", {
      cause: new Error("EVENTS_API_TOKEN is required to create events"),
    });
  }

  return fetchEvents<EventRecord>("", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(input),
  });
}

export async function runTool(name: string, input: unknown): Promise<string> {
  switch (name) {
    case "get_upcoming_events": {
      const { limit } = upcomingEventsInputSchema.parse(input);
      return JSON.stringify(await getUpcomingEvents(limit));
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
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
