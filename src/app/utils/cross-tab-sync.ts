export const USER_DATA_MUTATION_CHANNEL_NAME = "vision-board-user-data-v1";

export interface UserDataMutationPayload {
  at: number;
  source: string;
}

export const userDataMutationSource = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

let userDataMutationChannel: BroadcastChannel | null | undefined;

function getUserDataMutationChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") return null;
  if (userDataMutationChannel === undefined) {
    userDataMutationChannel = new BroadcastChannel(USER_DATA_MUTATION_CHANNEL_NAME);
  }
  return userDataMutationChannel;
}

function isUserDataMutationPayload(value: unknown): value is UserDataMutationPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<UserDataMutationPayload>;
  return typeof payload.at === "number" && typeof payload.source === "string";
}

export function postUserDataMutation(payload: UserDataMutationPayload): void {
  getUserDataMutationChannel()?.postMessage(payload);
}

export function subscribeUserDataMutation(handler: (payload: UserDataMutationPayload) => void): () => void {
  const channel = getUserDataMutationChannel();
  if (!channel) return () => undefined;

  const listener = (event: MessageEvent<unknown>) => {
    if (isUserDataMutationPayload(event.data)) {
      handler(event.data);
    }
  };

  channel.addEventListener("message", listener);
  return () => channel.removeEventListener("message", listener);
}
