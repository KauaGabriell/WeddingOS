import type { EventDto } from "./api";

export const fallbackEvents: EventDto[] = [
  {
    id: "fallback-bridal-shower",
    slug: "cha-de-panela",
    name: "Cha de Panela",
    eventType: "bridal_shower",
    startsAt: "2026-06-06T18:30:00-03:00",
    location: {
      venueName: "Espaco Kaun",
      addressLine: "Rua 2 Parque dos Pirineus",
      addressNumber: null,
      neighborhood: null,
      city: "Anapolis",
      state: "GO",
      postalCode: null,
      latitude: null,
      longitude: null,
      mapUrl: null,
    },
    notes: null,
    isActive: true,
    createdAt: "2026-05-07T00:00:00.000Z",
    updatedAt: "2026-05-07T00:00:00.000Z",
  },
  {
    id: "fallback-wedding",
    slug: "casamento",
    name: "Casamento",
    eventType: "wedding",
    startsAt: "2026-09-05T16:00:00-03:00",
    location: {
      venueName: "BR-153, Km 7 - s/n - Zona Rural",
      addressLine: "Anapolis - GO, 75000-000",
      addressNumber: null,
      neighborhood: null,
      city: "Anapolis",
      state: "GO",
      postalCode: null,
      latitude: null,
      longitude: null,
      mapUrl: "https://maps.app.goo.gl/6kTvoXDFNRuNTy8r8",
    },
    notes: null,
    isActive: true,
    createdAt: "2026-05-07T00:00:00.000Z",
    updatedAt: "2026-05-07T00:00:00.000Z",
  },
];

export function sortEventsByStart(events: EventDto[]) {
  return [...events].sort(
    (left, right) => new Date(left.startsAt).getTime() - new Date(right.startsAt).getTime(),
  );
}

export function getEventTypeLabel(eventType: EventDto["eventType"]) {
  return eventType === "wedding" ? "Casamento" : "Cha de panela";
}

export function formatEventDay(dateInput: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(dateInput));
}

export function formatEventMonth(dateInput: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    month: "short",
    timeZone: "America/Sao_Paulo",
  })
    .format(new Date(dateInput))
    .replace(".", "");
}

export function formatEventTime(dateInput: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(dateInput));
}

export function formatFullDate(dateInput: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(dateInput));
}

export function formatEventWeekday(dateInput: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(dateInput));
}

export function formatLocation(event: EventDto) {
  const location = event.location;

  if (isPendingLocation(event)) {
    return "Local a confirmar";
  }

  return [location.venueName, location.addressLine].filter(Boolean).join(", ");
}

export function formatLocationMeta(event: EventDto) {
  if (isPendingLocation(event)) {
    return "Endereco em confirmacao";
  }

  const { addressNumber, city, neighborhood, state } = event.location;

  return [neighborhood, addressNumber, city, state].filter(Boolean).join(" • ");
}

export function getEventMapUrl(event: EventDto) {
  if (event.location.mapUrl) {
    return event.location.mapUrl;
  }

  if (isPendingLocation(event)) {
    return null;
  }

  const search = [
    event.location.venueName,
    event.location.addressLine,
    event.location.addressNumber,
    event.location.neighborhood,
    event.location.city,
    event.location.state,
  ]
    .filter(Boolean)
    .join(", ");

  if (!search) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(search)}`;
}

function isPendingLocation(event: EventDto) {
  const joinedLocation = [
    event.location.venueName,
    event.location.addressLine,
    event.location.city,
    event.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return joinedLocation.includes("confirmar");
}
