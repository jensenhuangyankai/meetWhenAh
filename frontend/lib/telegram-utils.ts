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
    const param = typeof launchParams.startParam === 'string' ? launchParams.startParam : "";
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
    // First try the new SDK
    const launchParams = retrieveLaunchParams() as any;
    
    // Try different ways to get user ID from new SDK
    if (launchParams.initDataUnsafe?.user?.id) {
      return launchParams.initDataUnsafe.user.id.toString();
    }
    
    // Fallback to raw initData parsing from new SDK
    if (launchParams.initData && typeof launchParams.initData === 'string') {
      const params = new URLSearchParams(launchParams.initData);
      const userStr = params.get('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.id) {
          return user.id.toString();
        }
      }
    }

    // Fallback to global Telegram WebApp object
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      if (tg.initDataUnsafe?.user?.id) {
        return tg.initDataUnsafe.user.id.toString();
      }
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
    const launchParams = retrieveLaunchParams() as any;
    
    // Try different ways to get username
    if (launchParams.initDataUnsafe?.user?.username) {
      return launchParams.initDataUnsafe.user.username;
    }
    
    // Fallback to raw initData parsing
    if (launchParams.initData && typeof launchParams.initData === 'string') {
      const params = new URLSearchParams(launchParams.initData);
      const userStr = params.get('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.username) {
          return user.username;
        }
      }
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
    // First try the new SDK
    const launchParams = retrieveLaunchParams() as any;
    
    // Try different ways to get first name from new SDK
    if (launchParams.initDataUnsafe?.user?.first_name) {
      return launchParams.initDataUnsafe.user.first_name;
    }
    
    // Fallback to raw initData parsing from new SDK
    if (launchParams.initData && typeof launchParams.initData === 'string') {
      const params = new URLSearchParams(launchParams.initData);
      const userStr = params.get('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.first_name) {
          return user.first_name;
        }
      }
    }

    // Fallback to global Telegram WebApp object
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      if (tg.initDataUnsafe?.user?.first_name) {
        return tg.initDataUnsafe.user.first_name;
      }
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
    const launchParams = retrieveLaunchParams() as any;
    
    // Try different ways to get last name
    if (launchParams.initDataUnsafe?.user?.last_name) {
      return launchParams.initDataUnsafe.user.last_name;
    }
    
    // Fallback to raw initData parsing
    if (launchParams.initData && typeof launchParams.initData === 'string') {
      const params = new URLSearchParams(launchParams.initData);
      const userStr = params.get('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        if (user.last_name) {
          return user.last_name;
        }
      }
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
    const launchParams = retrieveLaunchParams() as any;
    
    // Also get global Telegram WebApp data for comparison
    const globalTg = typeof window !== 'undefined' && (window as any).Telegram?.WebApp;
    
    return {
      userId: getTelegramUserId(),
      username: getTelegramUsername(),
      firstName: getTelegramFirstName(),
      lastName: getTelegramLastName(),
      displayName: getTelegramDisplayName(),
      // New SDK data
      newSdk: {
        launchParams: launchParams,
        initData: launchParams.initData,
        initDataUnsafe: launchParams.initDataUnsafe,
        user: launchParams.initDataUnsafe?.user
      },
      // Global Telegram WebApp data
      globalWebApp: globalTg ? {
        initData: globalTg.initData,
        initDataUnsafe: globalTg.initDataUnsafe,
        user: globalTg.initDataUnsafe?.user,
        version: globalTg.version,
        platform: globalTg.platform
      } : null
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
