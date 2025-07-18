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
  const [newHabitIsPositive, setNewHabitIsPositive] = useState(true);
  const [newHabitCategory, setNewHabitCategory] = useState("");
  const [newHabitOrder, setNewHabitOrder] = useState("");
  const [loading, setLoading] = useState(true);
  const [weeks, setWeeks] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [collapsedHabits, setCollapsedHabits] = useState(new Set());

  const scrollRef = useRef(null);
  const selectedHabit = habits.find((h) => h.id === selectedHabitId);
  const isViewAll = selectedHabitId === "view-all";

  // Group habits by category and sort
  const groupedHabits = () => {
    const groups = {};
    habits.forEach((habit) => {
      const category = habit.category || "Other";
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(habit);
    });

    // Sort habits within each category by order field, then positive first, then alphabetically
    Object.keys(groups).forEach((category) => {
      groups[category].sort((a, b) => {
        // First sort by order field (if both have it)
        if (a.order !== undefined && b.order !== undefined) {
          if (a.order !== b.order) {
            return a.order - b.order;
          }
        }
        // If only one has order, prioritize it
        if (a.order !== undefined && b.order === undefined) return -1;
        if (a.order === undefined && b.order !== undefined) return 1;

        // Then sort by type: positive (true) before negative (false)
        if (a.is_positive !== b.is_positive) {
          return b.is_positive - a.is_positive;
        }
        // Finally sort alphabetically within each type
        return a.name.localeCompare(b.name);
      });
    });

    return groups;
  };

  // Sort habits for dropdown: positive first (alphabetized), then negative (alphabetized)
  const sortedHabits = [...habits].sort((a, b) => {
    // First sort by type: positive (true) before negative (false)
    if (a.is_positive !== b.is_positive) {
      return b.is_positive - a.is_positive; // true (1) - false (0) = 1, false (0) - true (1) = -1
    }
    // Then sort alphabetically within each type
    return a.name.localeCompare(b.name);
  });

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

  // Set all habits as collapsed by default when habits are first loaded
  useEffect(() => {
    if (habits.length > 0 && collapsedHabits.size === 0) {
      const currentSortedHabits = [...habits].sort((a, b) => {
        if (a.is_positive !== b.is_positive) {
          return b.is_positive - a.is_positive;
        }
        return a.name.localeCompare(b.name);
      });
      setCollapsedHabits(new Set(currentSortedHabits.map((habit) => habit.id)));
    }
  }, [habits, collapsedHabits.size]);

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
        .insert([
          {
            name: newHabitName.trim(),
            is_positive: newHabitIsPositive,
            category: newHabitCategory.trim() || null,
            order: newHabitOrder.trim() ? parseInt(newHabitOrder) : null,
          },
        ])
        .select();

      if (error) throw error;

      const newHabit = data[0];
      setHabits([...habits, newHabit]);
      setSelectedHabitId(newHabit.id);
      setNewHabitName("");
      setNewHabitIsPositive(true);
      setNewHabitCategory("");
      setNewHabitOrder("");
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

  // Toggle collapse state for a habit
  const toggleHabitCollapse = (habitId) => {
    setCollapsedHabits((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(habitId)) {
        newSet.delete(habitId);
      } else {
        newSet.add(habitId);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-2 border-[#4169e1] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const viewAllWeeks = getViewAllWeeks();
  const habitGroups = groupedHabits();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Fixed Header - Hidden */}
      <div style={{ display: "none" }}>
        <div className="flex items-stretch gap-4">
          {habits.length > 0 ? (
            <>
              <select
                value={selectedHabitId || ""}
                onChange={(e) => setSelectedHabitId(e.target.value)}
                className="flex-1 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#4169e1] focus:border-transparent bg-white text-gray-900 font-semibold shadow-sm"
                style={{ padding: "12px 20px", fontSize: "16px" }}
              >
                <option value="view-all">View All</option>
                {sortedHabits.map((habit) => (
                  <option key={habit.id} value={habit.id}>
                    {habit.name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-[#4169e1] text-white rounded-2xl hover:bg-[#2c4bc9] focus:outline-none focus:ring-2 focus:ring-[#4169e1] focus:ring-offset-2 font-bold transition-colors shadow-md"
                style={{
                  padding: "12px 24px",
                  fontSize: "18px",
                  minWidth: "80px",
                }}
              >
                +
              </button>
            </>
          ) : (
            <button
              onClick={() => setShowAddModal(true)}
              className="w-full bg-[#4169e1] text-white rounded-2xl hover:bg-[#2c4bc9] focus:outline-none focus:ring-2 focus:ring-[#4169e1] focus:ring-offset-2 font-bold transition-colors shadow-md"
              style={{ padding: "12px 20px", fontSize: "16px" }}
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
          /* View All Layout - Grouped by category */
          <div style={{ padding: "16px 12px" }}>
            <div
              style={{ display: "flex", flexDirection: "column", gap: "24px" }}
            >
              {(() => {
                const categoryOrder = ["morning", "work", "other", "negative"];
                const sortedCategories = Object.entries(habitGroups).sort(
                  ([a], [b]) => {
                    const aIndex = categoryOrder.indexOf(a.toLowerCase());
                    const bIndex = categoryOrder.indexOf(b.toLowerCase());

                    // If both categories are in the predefined order, sort by that order
                    if (aIndex !== -1 && bIndex !== -1) {
                      return aIndex - bIndex;
                    }

                    // If only one is in the predefined order, prioritize it
                    if (aIndex !== -1) return -1;
                    if (bIndex !== -1) return 1;

                    // If neither is in the predefined order, sort alphabetically
                    return a.localeCompare(b);
                  }
                );

                // Filter out work category on weekends (Saturday = 6, Sunday = 0)
                const today = new Date();
                const dayOfWeek = today.getDay();
                const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                const filteredCategories = sortedCategories.filter(
                  ([category]) => {
                    if (isWeekend && category.toLowerCase() === "work") {
                      return false;
                    }
                    return true;
                  }
                );

                return filteredCategories.map(([category, categoryHabits]) => (
                  <div
                    key={category}
                    className="category-group"
                    style={{
                      marginBottom: "20px",
                      backgroundColor: "#fafafa",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                      }}
                    >
                      {categoryHabits.map((habit) => (
                        <div key={habit.id}>
                          {/* 4x7 Calendar Grid for this habit - show current week when collapsed, all weeks when expanded */}
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px",
                            }}
                          >
                            {(collapsedHabits.has(habit.id)
                              ? [viewAllWeeks[3]]
                              : viewAllWeeks
                            ).map((week, weekIndex) => (
                              <div
                                key={weekIndex}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "12px",
                                }}
                              >
                                {/* Clickable emoji for expand/collapse */}
                                <button
                                  onClick={() => toggleHabitCollapse(habit.id)}
                                  style={{
                                    fontSize: "32px",
                                    width: "40px",
                                    height: "40px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    flexShrink: 0,
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    borderRadius: "8px",
                                    transition: "all 0.2s ease",
                                  }}
                                  className="hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#4169e1] focus:ring-offset-1"
                                  title={
                                    collapsedHabits.has(habit.id)
                                      ? `Expand ${habit.name}`
                                      : `Collapse ${habit.name}`
                                  }
                                >
                                  {[...habit.name][0]}
                                </button>

                                {/* Week row */}
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(7, 1fr)",
                                    gap: "6px",
                                    flex: 1,
                                  }}
                                >
                                  {week.map((date, dayIndex) => {
                                    const dateStr = formatDateForDB(date);
                                    const key = `${habit.id}-${dateStr}`;
                                    const isCompleted =
                                      completions[key] || false;
                                    const today = isToday(date);
                                    const habitType = habit.is_positive
                                      ? "positive"
                                      : "negative";

                                    return (
                                      <button
                                        key={dayIndex}
                                        onClick={() =>
                                          toggleCompletion(habit.id, date)
                                        }
                                        className={`
                                        aspect-square rounded-lg text-xs font-medium transition-all duration-200 min-h-[40px]
                                        ${
                                          isCompleted
                                            ? `habit-complete ${habitType} shadow-sm`
                                            : `habit-incomplete ${habitType}`
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
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
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
                    const habitType = selectedHabit.is_positive
                      ? "positive"
                      : "negative";

                    return (
                      <button
                        key={dayIndex}
                        onClick={() => toggleCompletion(selectedHabit.id, date)}
                        className={`
                          aspect-square rounded-xl text-sm font-medium transition-all duration-200 min-h-[48px]
                          ${
                            isCompleted
                              ? `habit-complete ${habitType} shadow-md`
                              : `habit-incomplete ${habitType}`
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

                  {/* Loading indicator for infinite scroll */}
                  {loadingMore && (
                    <div className="flex justify-center py-8">
                      <div className="w-6 h-6 border-2 border-[#4169e1] border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  )}
                </div>
              ))}
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
                marginBottom: "16px",
              }}
              autoFocus
            />

            {/* Category Input */}
            <input
              type="text"
              value={newHabitCategory}
              onChange={(e) => setNewHabitCategory(e.target.value)}
              placeholder="Enter category (optional)"
              className="w-full border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-0 focus:border-[#4169e1] text-gray-900 transition-colors"
              style={{
                padding: "16px 20px",
                fontSize: "16px",
                marginBottom: "16px",
              }}
            />

            {/* Order Input */}
            <input
              type="number"
              value={newHabitOrder}
              onChange={(e) => setNewHabitOrder(e.target.value)}
              placeholder="Enter order (optional)"
              className="w-full border-2 border-gray-200 rounded-2xl focus:outline-none focus:ring-0 focus:border-[#4169e1] text-gray-900 transition-colors"
              style={{
                padding: "16px 20px",
                fontSize: "16px",
                marginBottom: "16px",
              }}
            />

            {/* Positive/Negative Toggle */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Habit Type
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setNewHabitIsPositive(true)}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                    newHabitIsPositive
                      ? "bg-green-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  ✓ Positive
                  <div className="text-xs opacity-80 mt-1">
                    Good habit to build
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setNewHabitIsPositive(false)}
                  className={`flex-1 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                    !newHabitIsPositive
                      ? "bg-red-500 text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  ✗ Negative
                  <div className="text-xs opacity-80 mt-1">
                    Bad habit to break
                  </div>
                </button>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewHabitName("");
                  setNewHabitCategory("");
                  setNewHabitOrder("");
                  setNewHabitIsPositive(true);
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
