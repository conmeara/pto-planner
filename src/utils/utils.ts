import { redirect } from "next/navigation";
import { headers } from "next/headers";

/**
 * Redirects to a specified path with an encoded message as a query parameter.
 * @param {('error' | 'success')} type - The type of message, either 'error' or 'success'.
 * @param {string} path - The path to redirect to.
 * @param {string} message - The message to be encoded and added as a query parameter.
 * @returns {never} This function doesn't return as it triggers a redirect.
 */
export function encodedRedirect(
  type: "error" | "success",
  path: string,
  message: string,
) {
  return redirect(`${path}?${type}=${encodeURIComponent(message)}`);
}

export const getURL = () => {
  const headersList = (() => {
    try {
      return headers();
    } catch {
      return null;
    }
  })();
  const origin = headersList?.get("origin");
  const referer = headersList?.get("referer");

  const refererOrigin = (() => {
    if (!referer) return undefined;
    try {
      return new URL(referer).origin;
    } catch {
      return undefined;
    }
  })();

  let url =
    origin ??
    refererOrigin ??
    process.env.NEXT_PUBLIC_SITE_URL ?? // Set this to your site URL in production env.
    process.env.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel.
    "http://localhost:3000/";

  // Make sure to include `https://` when not localhost.
  url = url.includes("http") ? url : `https://${url}`;
  // Make sure to include the trailing slash.
  url = url.charAt(url.length - 1) === "/" ? url : `${url}/`;
  return url;
};
