/**
 * Listmonk — newsletter subscription.
 *
 * Listmonk is the shared broadcast platform (one install, one list per
 * property); Mautic stays the behavioural funnel. A blog newsletter signup
 * belongs in the list that will actually send to it.
 */

import { getListmonkApiUrl, requireEnv } from "@/lib/env";

function authHeader(): string {
  const user = requireEnv("LISTMONK_API_USER");
  const token = requireEnv("LISTMONK_API_PASSWORD");
  return `token ${user}:${token}`;
}

function listId(): number {
  const raw = requireEnv("LISTMONK_NEWSLETTER_LIST_ID");
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`LISTMONK_NEWSLETTER_LIST_ID must be a positive integer, got "${raw}"`);
  }
  return id;
}

async function call(
  path: string,
  init: { method: string; body?: unknown }
): Promise<{ status: number; text: string }> {
  const res = await fetch(`${getListmonkApiUrl()}${path}`, {
    method: init.method,
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  return { status: res.status, text: await res.text().catch(() => "") };
}

/** Find an existing subscriber id by email, or null. */
async function findSubscriberId(email: string): Promise<number | null> {
  // SQL-expression query param; the email is single-quoted into it, so any
  // quote in the address would break out of the literal.
  const query = `subscribers.email='${email.replace(/'/g, "''")}'`;
  const { status, text } = await call(
    `/api/subscribers?per_page=1&query=${encodeURIComponent(query)}`,
    { method: "GET" }
  );
  if (status !== 200) {
    throw new Error(`Listmonk subscriber lookup failed ${status}: ${text.slice(0, 200)}`);
  }
  const parsed = JSON.parse(text) as { data?: { results?: Array<{ id: number }> } };
  return parsed.data?.results?.[0]?.id ?? null;
}

/**
 * Subscribe an address to the ImageCrafter newsletter list.
 *
 * Idempotent: listmonk 409s on a duplicate address (it is a shared install, so
 * the address may already exist from another property), in which case the
 * existing subscriber is added to our list instead.
 *
 * Throws on any other failure — a signup that silently did not subscribe is
 * worse than a visible error.
 */
export async function subscribeToNewsletter(params: {
  email: string;
  name?: string;
}): Promise<{ subscriberId: number; alreadyExisted: boolean }> {
  const { email, name } = params;
  const list = listId();

  const created = await call("/api/subscribers", {
    method: "POST",
    body: {
      email,
      name: name || email.split("@")[0],
      status: "enabled",
      lists: [list],
      preconfirm_subscriptions: true,
    },
  });

  if (created.status === 200) {
    const parsed = JSON.parse(created.text) as { data?: { id?: number } };
    const id = parsed.data?.id;
    if (!id) {
      throw new Error(`Listmonk create returned no subscriber id: ${created.text.slice(0, 200)}`);
    }
    return { subscriberId: id, alreadyExisted: false };
  }

  if (created.status !== 409) {
    throw new Error(`Listmonk create failed ${created.status}: ${created.text.slice(0, 200)}`);
  }

  const existingId = await findSubscriberId(email);
  if (!existingId) {
    throw new Error(`Listmonk reported a duplicate for ${email} but no subscriber matched`);
  }

  const added = await call("/api/subscribers/lists", {
    method: "PUT",
    body: {
      ids: [existingId],
      action: "add",
      target_list_ids: [list],
      status: "confirmed",
    },
  });
  if (added.status !== 200) {
    throw new Error(`Listmonk add-to-list failed ${added.status}: ${added.text.slice(0, 200)}`);
  }

  return { subscriberId: existingId, alreadyExisted: true };
}
