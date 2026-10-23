"use client";

import { useCallback, useEffect, useState } from "react";

const MAX_RECENT_DOCUMENTS = 6;
const STORAGE_PREFIX = "unpile-recently-viewed-user-";

function storageKey(demoUserId) {
  return `${STORAGE_PREFIX}${demoUserId}`;
}

function readIds(demoUserId) {
  try {
    const value = window.localStorage.getItem(storageKey(demoUserId));
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => Number.isInteger(Number(id))).map(Number).slice(0, MAX_RECENT_DOCUMENTS) : [];
  } catch {
    return [];
  }
}

function writeIds(demoUserId, ids) {
  try {
    window.localStorage.setItem(storageKey(demoUserId), JSON.stringify(ids));
  } catch {
    // Browser storage can be disabled or unavailable; recent history is optional.
  }
}

export default function useRecentlyViewed(demoUserId) {
  const [recentIds, setRecentIds] = useState([]);

  useEffect(() => {
    setRecentIds(readIds(demoUserId));
  }, [demoUserId]);

  const recordViewed = useCallback((documentId) => {
    const id = Number(documentId);
    if (!Number.isInteger(id) || id < 1) return;
    setRecentIds((current) => {
      const next = [id, ...current.filter((existingId) => existingId !== id)].slice(0, MAX_RECENT_DOCUMENTS);
      writeIds(demoUserId, next);
      return next;
    });
  }, [demoUserId]);

  return { recentIds, recordViewed };
}
