export function getPriorityScore(task) {
    const map = {
        "urgent-important": 4,
        "urgent-not-important": 3,
        "not-urgent-important": 2,
        "not-urgent-not-important": 1,
    };

    return map[task.priority] || 0;
}