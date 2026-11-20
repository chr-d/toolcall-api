import type Anthropic from "@anthropic-ai/sdk";

const baseUrl = process.env.EVENTS_API_URL ?? "http://localhost:3001";

type EventRecord = {
  id: number;
  title: string;
  description: string;
  date: string;
  location: string;
};

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
];

async function getUpcomingEvents(limit: number) {
  const response = await fetch(`${baseUrl}/api/events/upcoming`);
  if (!response.ok) throw new Error(`Events API returned ${response.status}`);
  const events = (await response.json()) as EventRecord[];
  return events
    .slice(0, limit)
    .map(({ id, title, date, location }) => ({ id, title, date, location }));
}

async function getEvent(id: number) {
  const response = await fetch(`${baseUrl}/api/events/${id}`);
  if (!response.ok) throw new Error(`Events API returned ${response.status}`);
  const event = (await response.json()) as EventRecord | null;
  if (!event) throw new Error(`No event with id ${id}`);
  return event;
}

export async function runTool(name: string, input: unknown): Promise<string> {
  switch (name) {
    case "get_upcoming_events": {
      const { limit = 10 } = input as { limit?: number };
      return JSON.stringify(await getUpcomingEvents(limit));
    }
    case "get_event": {
      const { id } = input as { id: number };
      return JSON.stringify(await getEvent(id));
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}
