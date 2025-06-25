import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../lib/supabase";
import {
  getInitialWeeks,
  getMoreWeeks,
  getPreviousWeeks,
  formatDateForDB,
  isToday,
  getStartOfWeek,
  getWeekDates,
} from "../utils/dateUtils";

export default function HabitTracker() {
  const [habits, setHabits] = useState([]);
  const [completions, setCompletions] = useState({});
  const [selectedHabitId, setSelectedHabitId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newHabitName, setNewHabitName] = useState("");
  const [loading, setLoading] = useState(true);
  const [weeks, setWeeks] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);

  const scrollRef = useRef(null);
  const selectedHabit = habits.find((h) => h.id === selectedHabitId);
  const isViewAll = selectedHabitId === "view-all";

  // Get 4 weeks for view all (3 weeks before current + current week)
  const getViewAllWeeks = () => {
    const today = new Date();
    const currentWeekStart = getStartOfWeek(today);
    const weeks = [];

    for (let i = -3; i <= 0; i++) {
      const weekStart = new Date(currentWeekStart);
      weekStart.setDate(currentWeekStart.getDate() + i * 7);
      weeks.push(getWeekDates(weekStart));
    }

    return weeks;
  };

  useEffect(() => {
    fetchHabits();
    fetchCompletions();
    setWeeks(getInitialWeeks());
  }, []);

  useEffect(() => {
    // Auto-select View All by default, or first habit if no habits exist
    if (habits.length > 0 && !selectedHabitId) {
      setSelectedHabitId("view-all");
    }
  }, [habits, selectedHabitId]);

  // Infinite scroll handler
  const handleScroll = useCallback(
    (e) => {
      if (loadingMore || isViewAll) return;

      const element = e.target;
      const threshold = 200; // Load more when 200px from bottom

      if (
        element.scrollTop + element.clientHeight >=
        element.scrollHeight - threshold
      ) {
        setLoadingMore(true);
        const lastWeek = weeks[weeks.length - 1];
        const lastWeekStart = lastWeek[0]; // First date of last week
        const moreWeeks = getMoreWeeks(lastWeekStart, 8);
        setWeeks((prev) => [...prev, ...moreWeeks]);
        setLoadingMore(false);
      }
    },
    [weeks, loadingMore, isViewAll]
  );

  async function fetchHabits() {
    try {
      const { data, error } = await supabase
        .from("habits")
        .select("*")
        .order("created_at", { ascending: true });

      if (error) throw error;
      setHabits(data || []);
    } catch (error) {
      console.error("Error fetching habits:", error);
    }
  }

  async function fetchCompletions() {
    try {
      const { data, error } = await supabase
        .from("habit_completions")
        .select("*");

      if (error) throw error;

      // Convert to lookup object: {habitId-date: completed}
      const completionsMap = {};
      data?.forEach((completion) => {
        const key = `${completion.habit_id}-${completion.date}`;
        completionsMap[key] = completion.completed;
      });

      setCompletions(completionsMap);
    } catch (error) {
      console.error("Error fetching completions:", error);
    } finally {
      setLoading(false);
    }
  }

  async function addHabit() {
    if (!newHabitName.trim()) return;

    try {
      const { data, error } = await supabase
        .from("habits")
        .insert([{ name: newHabitName.trim() }])
        .select();

      if (error) throw error;

      const newHabit = data[0];
      setHabits([...habits, newHabit]);
      setSelectedHabitId(newHabit.id);
      setNewHabitName("");
      setShowAddModal(false);
    } catch (error) {
      console.error("Error adding habit:", error);
    }
  }

  async function toggleCompletion(habitId, date) {
    const dateStr = formatDateForDB(date);
    const key = `${habitId}-${dateStr}`;
    const currentState = completions[key] || false;
    const newState = !currentState;

    try {
      const { error } = await supabase
        .from("habit_completions")
        .upsert(
          { habit_id: habitId, date: dateStr, completed: newState },
          { onConflict: "habit_id,date" }
        );

      if (error) throw error;

      setCompletions({
        ...completions,
        [key]: newState,
      });
    } catch (error) {
      console.error("Error toggling completion:", error);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-[#4169e1] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const viewAllWeeks = getViewAllWeeks();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Fixed Header */}
      <div
        className="sticky top-0 bg-white border-b border-gray-100 z-10"
        style={{ padding: "20px 16px" }}
      >
        <div className="flex items-stretch gap-4">
          {habits.length > 0 ? (
            <>
              <select
                value={selectedHabitId || ""}
                onChange={(e) => setSelectedHabitId(e.target.value)}
                className="flex-1 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#4169e1] focus:border-transparent bg-white text-gray-900 font-semibold shadow-sm"
                style={{ padding: "18px 20px", fontSize: "18px" }}
              >
                <option value="view-all">View All</option>
                {habits.map((habit) => (
                  <option key={habit.id} value={habit.id}>
                    {habit.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-[#4169e1] text-white rounded-2xl hover:bg-[#2c4bc9] focus:outline-none focus:ring-2 focus:ring-[#4169e1] focus:ring-offset-2 font-bold transition-colors shadow-md"
                style={{
                  padding: "18px 28px",
                  fontSize: "20px",
                  minWidth: "90px",
                }}
              >
                +
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full bg-[#4169e1] text-white rounded-2xl hover:bg-[#2c4bc9] focus:outline-none focus:ring-2 focus:ring-[#4169e1] focus:ring-offset-2 font-bold transition-colors shadow-md"
              style={{ padding: "18px 20px", fontSize: "18px" }}
            >
              Add Your First Habit
            </button>
          )}
        </div>
      </div>

      {/* Calendar Content */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto"
      >
        {isViewAll && habits.length > 0 ? (
          /* View All Layout - Individual calendars for each habit */
          <div style={{ padding: "16px 12px" }}>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "20px" }}
            >
              {habits.map((habit) => (
                <div key={habit.id}>
                  {/* Habit Name */}
                  <div
                    style={{
                      fontSize: "16px",
                      fontWeight: "600",
                      marginBottom: "12px",
                      color: "#374151",
                    }}
                  >
                    {habit.name}
                  </div>

                  {/* 4x7 Calendar Grid for this habit */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {viewAllWeeks.map((week, weekIndex) => (
                      <div
                        key={weekIndex}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(7, 1fr)",
                          gap: "6px",
                        }}
                      >
                        {week.map((date, dayIndex) => {
                          const dateStr = formatDateForDB(date);
                          const key = `${habit.id}-${dateStr}`;
                          const isCompleted = completions[key] || false;
                          const today = isToday(date);

                          return (
                            <button
                              key={dayIndex}
                              onClick={() => toggleCompletion(habit.id, date)}
                              className={`
                                aspect-square rounded-lg text-xs font-medium transition-all duration-200 min-h-[40px]
                                ${
                                  isCompleted
                                    ? "habit-complete shadow-sm"
                                    : "habit-incomplete"
                                }
                                ${
                                  today
                                    ? "ring-2 ring-[#4169e1] ring-offset-1"
                                    : ""
                                }
                                hover:scale-105 active:scale-95
                              `}
                              title={`${
                                habit.name
                              } - ${date.toLocaleDateString()}`}
                            >
                              {date.getDate()}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : selectedHabit ? (
          /* Single Habit Layout */
          <div style={{ padding: "16px 12px" }}>
            {/* Calendar Grid */}
            <div
              style={{ display: "flex", flexDirection: "column", gap: "10px" }}
            >
              {weeks.map((week, weekIndex) => (
                <div
                  key={weekIndex}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(7, 1fr)",
                    gap: "8px",
                  }}
                >
                  {week.map((date, dayIndex) => {
                    const dateStr = formatDateForDB(date);
                    const key = `${selectedHabit.id}-${dateStr}`;
                    const isCompleted = completions[key] || false;
                    const today = isToday(date);

                    return (
                      <button
                        key={dayIndex}
                        onClick={() => toggleCompletion(selectedHabit.id, date)}
                        className={`
                          aspect-square rounded-xl text-sm font-medium transition-all duration-200 min-h-[48px]
                          ${
                            isCompleted
                              ? "habit-complete shadow-md"
                              : "habit-incomplete"
                          }
                          ${today ? "ring-2 ring-[#4169e1] ring-offset-2" : ""}
                          hover:scale-105 active:scale-95
                        `}
                        title={`${
                          selectedHabit.name
                        } - ${date.toLocaleDateString()}`}
                      >
                        {date.getDate()}
                      </button>
                    );
                  })}
                </div>
              ))}

              {/* Loading indicator for infinite scroll */}
              {loadingMore && (
                <div className="flex justify-center py-8">
                  <div className="w-6 h-6 border-2 border-[#4169e1] border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center px-6">
            <div className="text-center text-gray-500">
              <p className="text-lg">No habits yet</p>
              <p className="text-sm mt-1">Add your first habit above!</p>
            </div>
          </div>
        )}
      </div>

      {/* Add Habit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-6 z-50">
          <div
            className="bg-white rounded-3xl w-full max-w-md shadow-2xl"
            style={{ padding: "32px" }}
          >
            <h2 className="text-2xl font-bold mb-6 text-gray-900 text-center">
              Add New Habit
            </h2>
            <input
              type="text"
              value={newHabitName}
              onChange={(e) => setNewHabitName(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && addHabit()}
              placeholder="Enter habit name"
              className="w-full border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-0 focus:border-[#4169e1] text-gray-900 transition-colors"
              style={{
                padding: "16px 20px",
                fontSize: "16px",
                marginBottom: "24px",
              }}
              autoFocus
            />
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewHabitName("");
                }}
                className="flex-1 border-2 border-gray-300 text-gray-700 rounded-2xl hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 font-semibold transition-all"
                style={{ padding: "14px 24px", fontSize: "16px" }}
              >
                Cancel
              </button>
              <button
                onClick={addHabit}
                disabled={!newHabitName.trim()}
                className="flex-1 bg-[#4169e1] text-white rounded-2xl hover:bg-[#2c4bc9] focus:outline-none focus:ring-2 focus:ring-[#4169e1] focus:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed font-semibold transition-all shadow-lg hover:shadow-xl"
                style={{ padding: "14px 24px", fontSize: "16px" }}
              >
                Add Habit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
