const QUEUE_KEY = 'ob_offline_queue';

export const getQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch {
    return [];
  }
};

export const getQueueCount = () => {
  return getQueue().length;
};

// action: 'INSERT' | 'UPDATE' | 'DELETE'
// payload format for INSERT: { ...data }
// payload format for UPDATE: { update: { ...data }, match: { key: value } }
// payload format for DELETE: { match: { key: value } }
export const enqueueSyncTask = (table, action, payload) => {
  const queue = getQueue();
  queue.push({
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    table,
    action,
    payload,
    timestamp: new Date().toISOString()
  });
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event('offline_sync_updated'));
};

export const processSyncQueue = async (supabase) => {
  if (!navigator.onLine) return;

  const queue = getQueue();
  if (queue.length === 0) return;

  let remainingQueue = [...queue];
  let hasErrors = false;

  for (let i = 0; i < queue.length; i++) {
    const task = queue[i];
    try {
      let query = supabase.from(task.table);

      if (task.action === 'INSERT') {
        const { error } = await query.insert(task.payload);
        if (error) throw error;
      } else if (task.action === 'UPDATE') {
        let updateQuery = query.update(task.payload.update);
        for (const [key, value] of Object.entries(task.payload.match)) {
          updateQuery = updateQuery.eq(key, value);
        }
        const { error } = await updateQuery;
        if (error) throw error;
      } else if (task.action === 'DELETE') {
        let deleteQuery = query.delete();
        for (const [key, value] of Object.entries(task.payload.match)) {
          deleteQuery = deleteQuery.eq(key, value);
        }
        const { error } = await deleteQuery;
        if (error) throw error;
      }

      // Success! Remove from remaining queue
      remainingQueue = remainingQueue.filter(t => t.id !== task.id);
    } catch (err) {
      console.error("Failed to sync task in background:", task, err);
      hasErrors = true;
      // We keep it in the queue if it fails due to network.
      // If it's a hard validation error from Supabase (e.g. 400), we might want to drop it,
      // but for safety in this version we will keep it until manual intervention or next sync.
    }
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(remainingQueue));
  window.dispatchEvent(new Event('offline_sync_updated'));
  
  if (!hasErrors && remainingQueue.length === 0 && queue.length > 0) {
    console.log("Offline sync complete!");
  }
};

export const safeSupabaseExecute = async (supabase, table, action, payload) => {
  if (!navigator.onLine) {
    enqueueSyncTask(table, action, payload);
    return { data: null, error: null, queued: true };
  }

  try {
    let query = supabase.from(table);
    let result;

    if (action === 'INSERT') {
      result = await query.insert(payload);
    } else if (action === 'UPDATE') {
      let updateQuery = query.update(payload.update);
      for (const [key, value] of Object.entries(payload.match)) {
        updateQuery = updateQuery.eq(key, value);
      }
      result = await updateQuery;
    } else if (action === 'DELETE') {
      let deleteQuery = query.delete();
      for (const [key, value] of Object.entries(payload.match)) {
        deleteQuery = deleteQuery.eq(key, value);
      }
      result = await deleteQuery;
    }

    if (result.error && (result.error.message.includes('fetch') || result.error.message.includes('Failed to fetch') || result.error.message.includes('Network'))) {
      throw new Error("Network Error");
    }

    return { ...result, queued: false };
  } catch (err) {
    // If it's a network error, queue it
    console.warn("Network error during execution, falling back to offline queue...", err);
    enqueueSyncTask(table, action, payload);
    return { data: null, error: null, queued: true };
  }
};
