import { retrieveLaunchParams } from '@telegram-apps/sdk';

interface QueryParams {
  group_id: string;
  chat_id: string;
  message_thread_id: string;
}

/**
 * Gets parameters from Telegram WebApp launch parameters
 * Returns empty object if running in SSR or if launch parameters aren't available
 */
export function getTelegramLaunchParams(): QueryParams {
  if (typeof window === "undefined") {
    return {
      group_id: "",
      chat_id: "",
      message_thread_id: "",
    };
  }

  try {
    const launchParams = retrieveLaunchParams();
    const param = launchParams.tgWebAppStartParam || "";
    const [uuid, chatId, messageThreadId] = param.split("_");

    return {
      group_id: uuid,
      chat_id: chatId,
      message_thread_id: messageThreadId,
    };
  } catch (error) {
    console.error("Error parsing Telegram launch params:", error);
    return { group_id: "", chat_id: "", message_thread_id: "" };
  }
}

export function buildQueryString(params: QueryParams): string {
  // Skip execution during SSR
  if (typeof window === "undefined") {
    return "";
  }

  const searchParams = new URLSearchParams();

  if (params.group_id) searchParams.append("group_id", params.group_id);

  return searchParams.toString();
}

/**
 * Gets the Telegram user ID from the launch parameters
 * Returns undefined if running in SSR or if user ID is not available
 */
export function getTelegramUserId(): string | undefined {
  // Early return during SSR
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const launchParams = retrieveLaunchParams();
    const initData = launchParams.initData as any;

    // Get user ID from initData.user.id
    if (initData?.user?.id) {
      return initData.user.id.toString();
    }

    return undefined;
  } catch (error) {
    console.error("Error getting Telegram user ID:", error);
    return undefined;
  }
}

/**
 * Gets the Telegram username from the launch parameters
 * Returns undefined if running in SSR or if username is not available
 */
export function getTelegramUsername(): string | undefined {
  // Early return during SSR
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const launchParams = retrieveLaunchParams();
    const initData = launchParams.initData as any;

    // Get username from initData.user.username
    if (initData?.user?.username) {
      return initData.user.username;
    }

    return undefined;
  } catch (error) {
    console.error("Error getting Telegram username:", error);
    return undefined;
  }
}

/**
 * Gets the Telegram user's first name from the launch parameters
 * Returns undefined if running in SSR or if first name is not available
 */
export function getTelegramFirstName(): string | undefined {
  // Early return during SSR
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const launchParams = retrieveLaunchParams();
    const initData = launchParams.initData as any;

    // Get first name from initData.user.firstName (or first_name)
    if (initData?.user?.firstName) {
      return initData.user.firstName;
    }
    if (initData?.user?.first_name) {
      return initData.user.first_name;
    }

    return undefined;
  } catch (error) {
    console.error("Error getting Telegram first name:", error);
    return undefined;
  }
}

/**
 * Gets the Telegram user's last name from the launch parameters
 * Returns undefined if running in SSR or if last name is not available
 */
export function getTelegramLastName(): string | undefined {
  // Early return during SSR
  if (typeof window === "undefined") {
    return undefined;
  }

  try {
    const launchParams = retrieveLaunchParams();
    const initData = launchParams.initData as any;

    // Get last name from initData.user.lastName (or last_name)
    if (initData?.user?.lastName) {
      return initData.user.lastName;
    }
    if (initData?.user?.last_name) {
      return initData.user.last_name;
    }

    return undefined;
  } catch (error) {
    console.error("Error getting Telegram last name:", error);
    return undefined;
  }
}

/**
 * Gets a formatted display name for the user
 * Combines first name and last name, falls back to username, then to 'Unknown User'
 */
export function getTelegramDisplayName(): string {
  const firstName = getTelegramFirstName();
  const lastName = getTelegramLastName();
  const username = getTelegramUsername();

  if (firstName) {
    return lastName ? `${firstName} ${lastName}` : firstName;
  }

  if (username) {
    return username;
  }

  return 'Unknown User';
}

/**
 * Gets all available Telegram user data for debugging
 */
export function getTelegramUserDebugInfo() {
  if (typeof window === "undefined") {
    return { error: "SSR - window not available" };
  }

  try {
    const launchParams = retrieveLaunchParams();
    return {
      userId: getTelegramUserId(),
      username: getTelegramUsername(),
      firstName: getTelegramFirstName(),
      lastName: getTelegramLastName(),
      displayName: getTelegramDisplayName(),
      launchParams: launchParams,
      initData: launchParams.initData,
      user: (launchParams.initData as any)?.user
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
