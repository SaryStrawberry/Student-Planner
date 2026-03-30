import { getPriorityScore } from "./priority";

export function scheduleTasks(tasks, timeBlocks) {
    // Sort by priority + earliest deadline
    const sorted = [...tasks].sort((a, b) => {
        const pDiff = getPriorityScore(b) - getPriorityScore(a);
        if (pDiff !== 0) return pDiff;

        return new Date(a.deadline) - new Date(b.deadline);
    });

    const schedule = [];

    let taskIndex = 0;

    for (let block of timeBlocks) {
        let remaining = block.duration;

        while (remaining > 0 && taskIndex < sorted.length) {
            let task = sorted[taskIndex];

            if (task.remainingTime <= 0) {
                taskIndex++;
                continue;
            }

            const workTime = Math.min(task.remainingTime, remaining);

            schedule.push({
                blockId: block.id,
                taskId: task.id,
                duration: workTime,
            });

            task.remainingTime -= workTime;
            remaining -= workTime;

            if (task.remainingTime <= 0) {
                taskIndex++;
            }
        }
    }

    return schedule;
}