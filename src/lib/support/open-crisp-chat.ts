/**
 * Opens the Crisp chat widget (loaded globally via {@link CrispChatScript}).
 * @see https://docs.crisp.chat/guides/chatbox-sdks/web-sdk/do/
 */
export function openCrispChat(): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as { $crisp?: unknown[][] };
  if (!w.$crisp) {
    w.$crisp = [];
  }
  w.$crisp.push(["do", "chat:open"]);
}
