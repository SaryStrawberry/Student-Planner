export default function ScheduleView({ schedule, tasks }) {
    return (
        <div>
            <h2>Weekly Schedule</h2>

            {schedule.map((item, i) => {
                const task = tasks.find(t => t.id === item.taskId);

                return (
                    <div key={i}>
                        <strong>{task?.name}</strong> - {item.duration} min
                    </div>
                );
            })}
        </div>
    );
}