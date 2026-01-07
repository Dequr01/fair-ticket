// src/lib/offlineQueue.ts
// Simple offline queue for booth operator ticket assignments.
// Uses localStorage to persist pending assignments across page reloads.
// Each queued item contains the eventId, targetAddress, nameHash, studentIdHash.

export interface AssignmentItem {
    eventId: number;
    targetAddress: string;
    nameHash: string; // hex string
    studentIdHash: string; // hex string
}

const STORAGE_KEY = 'offlineTicketAssignments';

export function getQueue(): AssignmentItem[] {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
        return JSON.parse(raw) as AssignmentItem[];
    } catch {
        console.warn('Failed to parse offline queue');
        return [];
    }
}

export function setQueue(queue: AssignmentItem[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export function enqueue(item: AssignmentItem) {
    const q = getQueue();
    q.push(item);
    setQueue(q);
}

export async function processQueue(contract: any) {
    // contract: ethers Contract instance with assignTicket method.
    const q = getQueue();
    if (q.length === 0) return;
    const remaining: AssignmentItem[] = [];
    for (const item of q) {
        try {
            const tx = await contract.assignTicket(
                item.eventId,
                item.targetAddress,
                item.nameHash,
                item.studentIdHash
            );
            await tx.wait();
            console.log('Processed offline assignment', item);
        } catch (e) {
            console.error('Failed to process offline assignment', item, e);
            // Keep it in the queue for later retry.
            remaining.push(item);
        }
    }
    setQueue(remaining);
}
