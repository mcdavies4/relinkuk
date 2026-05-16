import { ResolutionType } from "./supabase";

// Map button IDs to resolution types
export const BUTTON_TO_RESOLUTION: Record<string, ResolutionType> = {
  retry_today: "retry_today",
  safe_place: "safe_place",
  pickup_point: "pickup_point",
  door_code: "door_code",
  concierge: "concierge",
  call_me: "call_me",
  im_home: "im_home",
  delay: "delay",
  neighbour: "neighbour",
};

// Confirmation message sent back to customer after they tap a button
export function getConfirmationMessage(resolution: ResolutionType, merchantName: string): string {
  const messages: Record<ResolutionType, string> = {
    retry_today: `✓ Got it. Your ${merchantName} parcel will be redelivered between 4–6pm today. Your driver has been notified.`,
    safe_place: `✓ Understood. Your driver will leave the parcel in a safe place and send you a photo confirmation.`,
    pickup_point: `✓ No problem. We'll redirect your ${merchantName} parcel to the nearest pickup point. You'll get the location shortly.`,
    door_code: `✓ Thanks — your door code has been sent directly to the driver. They're attempting delivery now.`,
    concierge: `✓ Got it. Your driver will speak to the concierge. They'll be at reception shortly.`,
    call_me: `✓ Your driver will call you now. Please keep your phone close.`,
    im_home: `✓ Perfect — your driver is on the way. We'll send a final alert when they're 5 minutes out.`,
    delay: `✓ Understood. Your ${merchantName} delivery has been pushed back by 1–2 hours. We'll message you 30 mins before the new window.`,
    neighbour: `✓ Got it. Your driver will leave the parcel with a neighbour and drop a note through your door.`,
    no_response: `We weren't able to reach you. Your parcel will be held at the depot. Reply here to arrange redelivery.`,
  };

  return messages[resolution] || `✓ Got it — your delivery preference has been updated.`;
}

// Human-readable label for operator dashboard
export function getResolutionLabel(resolution: ResolutionType): string {
  const labels: Record<ResolutionType, string> = {
    retry_today: "Retry today",
    safe_place: "Safe place",
    pickup_point: "Pickup point",
    door_code: "Door code shared",
    concierge: "Concierge",
    call_me: "Call requested",
    im_home: "Customer home",
    delay: "Delayed 1–2hrs",
    neighbour: "With neighbour",
    no_response: "No response",
  };
  return labels[resolution] || resolution;
}

// Colour for dashboard badge
export function getResolutionColour(resolution: ResolutionType): string {
  const greens = ["retry_today", "safe_place", "door_code", "concierge", "im_home", "neighbour"];
  const ambers = ["pickup_point", "delay", "call_me"];
  const reds = ["no_response"];

  if (greens.includes(resolution)) return "#1D9E75";
  if (ambers.includes(resolution)) return "#D97706";
  if (reds.includes(resolution)) return "#DC2626";
  return "#6B7280";
}
