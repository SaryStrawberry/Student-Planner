import { useState } from "react";
import { db } from "../firebase";
import { collection, addDoc } from "firebase/firestore";

export default function TaskForm() {
    const [task, setTask] = useState({
        topic: "",
        name: "",
        duration: "",
        deadline: "",
        priority: "urgent-important",
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        await addDoc(collection(db, "tasks"), {
            ...task,
            remainingTime: Number(task.duration),
        });

        alert("Task added");
    };

    return (
        <form onSubmit={handleSubmit}>
            <input placeholder="Topic/Course"
                   onChange={e => setTask({...task, topic: e.target.value})} />

            <input placeholder="Task name"
                   onChange={e => setTask({...task, name: e.target.value})} />

            <input type="number" placeholder="Minutes"
                   onChange={e => setTask({...task, duration: e.target.value})} />

            <input type="date"
                   onChange={e => setTask({...task, deadline: e.target.value})} />

            <select onChange={e => setTask({...task, priority: e.target.value})}>
                <option value="urgent-important">Urgent & Important</option>
                <option value="urgent-not-important">Urgent & Not Important</option>
                <option value="not-urgent-important">Not Urgent & Important</option>
                <option value="not-urgent-not-important">Not Urgent & Not Important</option>
            </select>

            <button type="submit">Add Task</button>
        </form>
    );
}