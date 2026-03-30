import { useEffect, useState } from "react";
import { db } from "./firebase";
import { collection, getDocs } from "firebase/firestore";

import TaskForm from "./components/TaskForm.jsx";
import ScheduleView from "./components/ScheduleView.jsx";

import { scheduleTasks } from "./logic/scheduler";

function App() {
    const [tasks, setTasks] = useState([]);
    const [schedule, setSchedule] = useState([]);

    const timeBlocks = [
        { id: 1, duration: 60 },
        { id: 2, duration: 120 },
        { id: 3, duration: 90 },
    ];

    async function loadTasks() {
        const snapshot = await getDocs(collection(db, "tasks"));
        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        setTasks(data);

        const result = scheduleTasks(data, timeBlocks);
        setSchedule(result);
    }

    useEffect(() => {
        loadTasks();
    }, []);

    return (
        <div>
            <h1>Smart Planner</h1>
            <TaskForm onTaskAdded={loadTasks}/>
            <ScheduleView schedule={schedule} tasks={tasks} />
        </div>
    );
}

export default App;