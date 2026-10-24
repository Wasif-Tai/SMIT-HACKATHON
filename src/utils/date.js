import { dayKey } from "./store.js";

export const dateToday = () => dayKey();

export const dayName = (date) =>
  new Date(`${date}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
  });
