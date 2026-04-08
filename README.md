# Student Planner & Budget — Modular React App Guide

This guide walks you through every component of the app, how they connect, and what you need to learn to build each one. Think of it as your roadmap — you can build in any order, but the sections are sequenced logically.

---

## 1. Project Setup & Architecture

### What you'll learn
- How to scaffold a React app with Vite
- How to organize a modular file structure
- What dependencies you'll need and why

### Steps

**1.1 — Scaffold the project**
```bash
npm create vite@latest student-planner -- --template react
cd student-planner
npm install
```

**1.2 — Install dependencies**
```bash
npm install d3          # For charts
npm install papaparse   # For CSV read/write
npm install date-fns    # For date calculations (days left, sorting)
```

**1.3 — File structure to build toward**
```
src/
├── App.jsx                  # Root layout: 2/3 + 1/3 split
├── main.jsx                 # Entry point
├── index.css                # Global styles

├── data/
│   └── useTaskStore.js      # Central state (all tasks live here)

├── components/
│   ├── Dashboard/
│   │   ├── Dashboard.jsx         # Wraps charts + table
│   │   ├── PieChart.jsx          # D3 pie: tasks by course
│   │   ├── BarChart.jsx          # D3 bar: status counts
│   │   └── TaskTable.jsx         # Sortable task rows + dropdowns
│   │
│   ├── Sidebar/
│   │   ├── Sidebar.jsx           # Wraps TaskInput + TodoList
│   │   ├── TaskInput.jsx         # Form to add a task
│   │   └── TodoList.jsx          # Eisenhower-sorted checklist
│   │
│   └── shared/
│       └── StatusDropdown.jsx    # Reusable status selector
```

**Key concept — why modular?**
Each component owns one responsibility. `TaskTable` doesn't know about `TodoList`. Both just receive tasks as props and send updates up to a shared store. This is called "lifting state up" and is a core React pattern.

---

## 2. The Data Layer — `useTaskStore.js`

### What you'll learn
- React's `useState` and `useReducer` hooks
- How to use `localStorage` to persist data across page refreshes
- How to read/write CSV with PapaParse
- How to structure a task object

### The task data model
Every task is a plain JavaScript object:
```js
{
  id: "uuid-1234",           // unique identifier
  className: "French",       // e.g. "French", "Web 2"
  assignment: "Test 1",      // assignment/project name
  weight: 15,                // % weight (optional)
  status: "Not started",     // "Not started" | "In progress" | "Completed"
  dueDate: "2026-04-30",     // ISO date string
  importance: "High",        // "Low" | "Medium" | "High"
  duration: "1hr",           // optional estimate
  createdAt: 1712000000000   // timestamp for tie-breaking
}
```

**2.1 — State with `useState`**

In `useTaskStore.js`, export a custom hook:
```js
import { useState, useEffect } from "react";
import Papa from "papaparse";

export function useTaskStore() {
  const [tasks, setTasks] = useState(() => {
    // Load from localStorage on first render
    const saved = localStorage.getItem("tasks");
    return saved ? JSON.parse(saved) : [];
  });

  // Persist to localStorage whenever tasks change
  useEffect(() => {
    localStorage.setItem("tasks", JSON.stringify(tasks));
  }, [tasks]);

  function addTask(task) {
    setTasks(prev => [...prev, { ...task, id: crypto.randomUUID() }]);
  }

  function updateTaskStatus(id, newStatus) {
    setTasks(prev =>
      prev.map(t => t.id === id ? { ...t, status: newStatus } : t)
    );
  }

  function exportCSV() {
    const csv = Papa.unparse(tasks);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tasks.csv";
    a.click();
  }

  return { tasks, addTask, updateTaskStatus, exportCSV };
}
```

**Key concept — why a custom hook?**
Rather than scattering `useState` across components, one hook owns all task logic. Any component that calls `useTaskStore()` gets the same data and the same functions. This is the React equivalent of a single source of truth.

**Important caveat:** Because each component that calls `useTaskStore()` gets its own independent state, you need to call the hook ONCE — at the top of `App.jsx` — and pass the results down as props. Alternatively, use React Context (see below).

**2.2 — Upgrading to React Context (optional but recommended)**

Context lets any deeply-nested component access tasks without prop-drilling:
```js
// TaskContext.jsx
import { createContext, useContext } from "react";
import { useTaskStore } from "./useTaskStore";

const TaskContext = createContext();

export function TaskProvider({ children }) {
  const store = useTaskStore();
  return <TaskContext.Provider value={store}>{children}</TaskContext.Provider>;
}

export function useTasks() {
  return useContext(TaskContext);
}
```

Wrap `App.jsx` in `<TaskProvider>` and any child can call `useTasks()`.

---

## 3. Root Layout — `App.jsx`

### What you'll learn
- CSS Grid and Flexbox for layout
- How to compose components
- Passing context/props to children

**3.1 — The 2/3 + 1/3 split**

In `App.jsx`:
```jsx
import Dashboard from "./components/Dashboard/Dashboard";
import Sidebar from "./components/Sidebar/Sidebar";
import { TaskProvider } from "./data/TaskContext";

export default function App() {
  return (
    <TaskProvider>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", height: "100vh" }}>
        <Dashboard />
        <Sidebar />
      </div>
    </TaskProvider>
  );
}
```

CSS Grid `gridTemplateColumns: "2fr 1fr"` means the left column takes 2 parts and the right takes 1 part of the total width. This is the entire layout in one line.

---

## 4. Task Input Form — `TaskInput.jsx`

### What you'll learn
- Controlled inputs (`value` + `onChange`)
- Form validation
- Calling context functions to mutate state

**4.1 — Controlled inputs**

Each field in the form is "controlled" — React owns its value:
```jsx
const [form, setForm] = useState({
  className: "",
  assignment: "",
  importance: "Medium",
  status: "Not started",
  dueDate: "",
  weight: "",
});

function handleChange(e) {
  setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
}

// In JSX:
<input name="className" value={form.className} onChange={handleChange} />
```

The `[e.target.name]` trick uses the input's `name` attribute as the key, so one `handleChange` handles all fields.

**4.2 — Submit handler**
```jsx
const { addTask } = useTasks();

function handleSubmit(e) {
  e.preventDefault();  // prevent page reload
  if (!form.assignment || !form.dueDate) return; // basic validation
  addTask(form);
  setForm({ className: "", assignment: "", importance: "Medium", status: "Not started", dueDate: "", weight: "" });
}
```

**4.3 — Field list**
| Field | Input type | Options |
|---|---|---|
| Class name | `<input type="text">` | free text |
| Assignment | `<input type="text">` | free text |
| Weight (%) | `<input type="number">` | 0–100 |
| Importance | `<select>` | Low, Medium, High |
| Status | `<select>` | Not started, In progress, Completed |
| Due Date | `<input type="date">` | date picker |

---

## 5. The Dashboard — `Dashboard.jsx`

### What you'll learn
- How to derive data from state for charts
- Passing derived data as props to D3 components

`Dashboard.jsx` is mostly a layout wrapper. It reads tasks, does the math, and hands results to children:

```jsx
import { useTasks } from "../../data/TaskContext";
import PieChart from "./PieChart";
import BarChart from "./BarChart";
import TaskTable from "./TaskTable";

export default function Dashboard() {
  const { tasks } = useTasks();

  // Count tasks per class for pie chart
  const classCounts = tasks.reduce((acc, t) => {
    acc[t.className] = (acc[t.className] || 0) + 1;
    return acc;
  }, {});

  // Count tasks per status for bar chart
  const statusCounts = {
    "Not started": tasks.filter(t => t.status === "Not started").length,
    "In progress": tasks.filter(t => t.status === "In progress").length,
    "Completed":   tasks.filter(t => t.status === "Completed").length,
  };

  return (
    <div>
      <div style={{ display: "flex", gap: "1rem" }}>
        <PieChart data={classCounts} />
        <BarChart data={statusCounts} />
      </div>
      <TaskTable />
    </div>
  );
}
```

---

## 6. D3 Pie Chart — `PieChart.jsx`

### What you'll learn
- How D3 integrates with React via `useRef` and `useEffect`
- D3's `pie()`, `arc()`, and `scaleOrdinal()` functions
- The "D3 owns the DOM node" pattern

**The core pattern for D3 in React:**
React renders a `<div>` with a `ref`. D3 attaches an `<svg>` to that div inside a `useEffect`. React never touches the SVG — D3 does.

```jsx
import { useRef, useEffect } from "react";
import * as d3 from "d3";

export default function PieChart({ data }) {
  const ref = useRef();

  useEffect(() => {
    // data = { French: 6, "Web 2": 7, Prog2: 7, ... }
    const entries = Object.entries(data); // [["French", 6], ["Web 2", 7], ...]
    const width = 300, height = 300, radius = Math.min(width, height) / 2;

    // Clear previous render
    d3.select(ref.current).selectAll("*").remove();

    const svg = d3.select(ref.current)
      .append("svg")
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

    const color = d3.scaleOrdinal(d3.schemeTableau10);

    const pie = d3.pie().value(d => d[1]);         // use count as value
    const arc = d3.arc().innerRadius(0).outerRadius(radius - 10);

    svg.selectAll("path")
      .data(pie(entries))
      .enter()
      .append("path")
      .attr("d", arc)
      .attr("fill", d => color(d.data[0]))
      .attr("stroke", "white")
      .style("stroke-width", "2px");

    // Labels
    const labelArc = d3.arc().innerRadius(radius * 0.6).outerRadius(radius * 0.6);
    svg.selectAll("text")
      .data(pie(entries))
      .enter()
      .append("text")
      .attr("transform", d => `translate(${labelArc.centroid(d)})`)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .text(d => `${d.data[0]} ${((d.data[1] / entries.reduce((s, e) => s + e[1], 0)) * 100).toFixed(1)}%`);

  }, [data]); // Re-runs whenever data changes

  return <div ref={ref} />;
}
```

**Critical insight:** The `[data]` dependency array in `useEffect` means D3 redraws the chart every time your task list changes. Always clear with `.selectAll("*").remove()` first, otherwise shapes stack on top of each other.

---

## 7. D3 Bar Chart — `BarChart.jsx`

### What you'll learn
- D3 scales: `scaleBand` (categorical X axis) and `scaleLinear` (numeric Y axis)
- D3 axes with `axisBottom` and `axisLeft`

```jsx
import { useRef, useEffect } from "react";
import * as d3 from "d3";

export default function BarChart({ data }) {
  // data = { "Not started": 12, "In progress": 2, "Completed": 21 }
  const ref = useRef();

  useEffect(() => {
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };
    const width = 300 - margin.left - margin.right;
    const height = 250 - margin.top - margin.bottom;

    d3.select(ref.current).selectAll("*").remove();

    const svg = d3.select(ref.current)
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const categories = Object.keys(data);
    const values = Object.values(data);

    const x = d3.scaleBand()
      .domain(categories)
      .range([0, width])
      .padding(0.3);

    const y = d3.scaleLinear()
      .domain([0, d3.max(values)])
      .nice()
      .range([height, 0]);

    // Bars
    svg.selectAll("rect")
      .data(categories)
      .enter()
      .append("rect")
      .attr("x", d => x(d))
      .attr("y", d => y(data[d]))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(data[d]))
      .attr("fill", d =>
        d === "Completed" ? "#4ade80" :
        d === "In progress" ? "#facc15" : "#f87171"
      );

    // Axes
    svg.append("g").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
    svg.append("g").call(d3.axisLeft(y).ticks(5));

  }, [data]);

  return <div ref={ref} />;
}
```

---

## 8. Task Table — `TaskTable.jsx`

### What you'll learn
- Sorting arrays in React
- Rendering dynamic table rows
- Conditional styling based on data

**8.1 — Sorting logic**

Tasks are shown ordered by due date, but completed tasks always sink to the bottom:
```js
const { tasks, updateTaskStatus } = useTasks();

const sortedTasks = [...tasks].sort((a, b) => {
  // Completed tasks go to the bottom
  if (a.status === "Completed" && b.status !== "Completed") return 1;
  if (b.status === "Completed" && a.status !== "Completed") return -1;
  // Otherwise sort by due date
  return new Date(a.dueDate) - new Date(b.dueDate);
});
```

**8.2 — Days left calculation**
```js
import { differenceInDays } from "date-fns";

function daysLeft(dueDate) {
  return differenceInDays(new Date(dueDate), new Date());
}
```

**8.3 — Rendering the table**
```jsx
<table>
  <thead>
    <tr>
      <th>Class</th><th>Assignment</th><th>Weight</th>
      <th>Status</th><th>Due Date</th><th>Days Left</th>
    </tr>
  </thead>
  <tbody>
    {sortedTasks.map(task => (
      <tr key={task.id}
        style={{ opacity: task.status === "Completed" ? 0.6 : 1 }}>
        <td>{task.className}</td>
        <td>{task.assignment}</td>
        <td>{task.weight ? `${task.weight}%` : "—"}</td>
        <td>
          <StatusDropdown
            value={task.status}
            onChange={newStatus => updateTaskStatus(task.id, newStatus)}
          />
        </td>
        <td>{task.dueDate}</td>
        <td style={{ color: daysLeft(task.dueDate) < 0 ? "red" : "inherit" }}>
          {daysLeft(task.dueDate)}
        </td>
      </tr>
    ))}
  </tbody>
</table>
```

---

## 9. Status Dropdown — `StatusDropdown.jsx`

### What you'll learn
- Controlled `<select>` elements
- Conditional styles on a component level

This is a small reusable component used in both the table and (optionally) the to-do list:

```jsx
const STATUS_OPTIONS = ["Not started", "In progress", "Completed"];

const STATUS_COLORS = {
  "Not started": "#f87171",
  "In progress": "#facc15",
  "Completed":   "#4ade80",
};

export default function StatusDropdown({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        backgroundColor: STATUS_COLORS[value],
        border: "none",
        borderRadius: "4px",
        padding: "2px 6px",
        fontWeight: "bold",
        cursor: "pointer",
      }}
    >
      {STATUS_OPTIONS.map(opt => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}
```

Because it's a separate component, both `TaskTable` and `TodoList` can import and use it — no duplication.

---

## 10. To-Do List — `TodoList.jsx`

### What you'll learn
- The Eisenhower Matrix algorithm
- Derived state (computing a filtered, sorted list from raw tasks)
- Checkbox interactions that update shared state

**10.1 — The Eisenhower Matrix Algorithm**

The Eisenhower Matrix classifies tasks by urgency (due soon?) and importance (High/Medium/Low). Tasks are ranked in this order:

| Quadrant | Urgency | Importance | Score |
|---|---|---|---|
| Q1 — Do First | Urgent | High | 1 |
| Q2 — Schedule | Not Urgent | High | 2 |
| Q3 — Delegate | Urgent | Low/Medium | 3 |
| Q4 — Eliminate | Not Urgent | Low/Medium | 4 |

"Urgent" = due within 7 days.

```js
import { differenceInDays } from "date-fns";

function eisenhowerScore(task) {
  const days = differenceInDays(new Date(task.dueDate), new Date());
  const urgent = days <= 7;
  const important = task.importance === "High";

  if (urgent && important)   return 1; // Q1: Do First
  if (!urgent && important)  return 2; // Q2: Schedule
  if (urgent && !important)  return 3; // Q3: Delegate
  return 4;                            // Q4: Eliminate
}
```

**10.2 — Filtering and sorting**
```js
const { tasks, updateTaskStatus } = useTasks();

const todoTasks = tasks
  .filter(t => t.status !== "Completed")        // hide completed
  .sort((a, b) => {
    const scoreDiff = eisenhowerScore(a) - eisenhowerScore(b);
    if (scoreDiff !== 0) return scoreDiff;
    // Tie-break: earlier due date first
    return new Date(a.dueDate) - new Date(b.dueDate);
  });
```

**10.3 — Rendering with checkboxes**
```jsx
{todoTasks.map(task => (
  <div key={task.id} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
    <input
      type="checkbox"
      checked={task.status === "Completed"}
      onChange={() => updateTaskStatus(task.id, "Completed")}
    />
    <span>
      <strong>{task.assignment}</strong> — {task.className}
    </span>
    <small style={{ color: "gray" }}>{task.dueDate}</small>
  </div>
))}
```

When the checkbox fires `updateTaskStatus(id, "Completed")`, it updates the shared state. Because both `TodoList` and `TaskTable` read from the same store, they both update simultaneously — no extra code needed.

---

## 11. Sidebar — `Sidebar.jsx`

### What you'll learn
- Overflow scrolling for fixed-height panels
- Composing two components in a column layout

```jsx
import TaskInput from "./TaskInput";
import TodoList from "./TodoList";

export default function Sidebar() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100vh",
      borderLeft: "1px solid #e5e7eb",
      overflow: "hidden",
    }}>
      {/* Task input takes natural height */}
      <div style={{ padding: "1rem", borderBottom: "1px solid #e5e7eb" }}>
        <TaskInput />
      </div>

      {/* To-do list fills remaining space and scrolls */}
      <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
        <TodoList />
      </div>
    </div>
  );
}
```

---

## 12. CSV Export

### What you'll learn
- How PapaParse converts JSON arrays to CSV strings
- How to trigger a file download from the browser

This is already wired into `useTaskStore`. Add an export button anywhere:

```jsx
const { exportCSV } = useTasks();

<button onClick={exportCSV}>Export to CSV</button>
```

To import a CSV back in (loading from file):
```js
import Papa from "papaparse";

function importCSV(file, setTasks) {
  Papa.parse(file, {
    header: true,          // use first row as keys
    skipEmptyLines: true,
    complete: (results) => {
      setTasks(results.data);
    }
  });
}
```

---

## 13. How Everything Connects — Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    TaskContext (global state)            │
│  tasks[]    addTask()    updateTaskStatus()   exportCSV()│
└────┬──────────────┬────────────────┬───────────┬────────┘
     │              │                │           │
     ▼              ▼                ▼           ▼
  Dashboard      PieChart         BarChart   TaskTable
  (reads tasks)  (classCounts)   (statusCounts) (sorted rows)
                                                    │
                                               StatusDropdown
                                               (updateTaskStatus)

┌─────────────────────────────────────────────────────────┐
│                    Sidebar                              │
├──────────────────────┬──────────────────────────────────┤
│    TaskInput         │    TodoList                      │
│    (addTask)         │    (eisenhower sort + checkbox)  │
└──────────────────────┴──────────────────────────────────┘
```

The arrows go: user action → context function → state updates → all components re-render with new data.

---

## 14. Suggested Build Order

1. ✅ Set up Vite project and install deps
2. ✅ Build `useTaskStore.js` with hardcoded sample tasks to test with
3. ✅ Build `App.jsx` layout (just two colored boxes at first)
4. ✅ Build `TaskInput.jsx` — verify `addTask` works in console
5. ✅ Build `TaskTable.jsx` — verify tasks appear and status dropdown works
6. ✅ Build `StatusDropdown.jsx` and wire into the table
7. ✅ Build `BarChart.jsx` — use static data first, then connect to real tasks
8. ✅ Build `PieChart.jsx` — same approach
9. ✅ Build `TodoList.jsx` with Eisenhower sorting
10. ✅ Build `Sidebar.jsx` to compose input + todo
11. ✅ Add CSV export button
12. ✅ Style everything

---

## 15. Key React Concepts to Study

| Concept | Where it's used | Resource |
|---|---|---|
| `useState` | All components | react.dev/learn/state-a-components-memory |
| `useEffect` | D3 charts, localStorage sync | react.dev/reference/react/useEffect |
| `useContext` | TaskContext | react.dev/learn/passing-data-deeply-with-context |
| `useRef` | D3 SVG mounting | react.dev/reference/react/useRef |
| Custom hooks | `useTaskStore` | react.dev/learn/reusing-logic-with-custom-hooks |
| Array methods | Sorting, filtering tasks | MDN: `.sort()`, `.filter()`, `.reduce()` |
| CSS Grid | App layout | css-tricks.com/snippets/css/complete-guide-grid |
| D3 basics | Charts | d3js.org (start with "Scales" and "Selections") |

---

*Good luck! Start with step 1 of the build order and don't move on until each piece works. The whole app is just these 12 components — each one is learnable on its own.*
