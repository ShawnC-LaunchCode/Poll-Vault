/**
 * Centralized color palette for charts and visualizations
 * Provides consistent theming across all analytics components
 */

export const chartColors = {
  // Yes/No question colors
  yesNo: {
    yes: "#10b981", // green-500
    no: "#ef4444",  // red-500
  },

  // Multiple choice and radio colors
  multipleChoice: [
    "#3b82f6", // blue-500
    "#10b981", // green-500
    "#f59e0b", // amber-500
    "#ef4444", // red-500
    "#8b5cf6", // violet-500
    "#ec4899", // pink-500
    "#14b8a6", // teal-500
    "#f97316", // orange-500
    "#6366f1", // indigo-500
    "#84cc16", // lime-500
  ],

  // Rating/scale colors
  rating: {
    primary: "#10b981",    // green-500
    secondary: "#3b82f6",  // blue-500
    gradient: ["#ef4444", "#f59e0b", "#eab308", "#84cc16", "#10b981"], // red to green
  },

  // Text analysis colors
  text: {
    primary: "#6366f1",    // indigo-500
    secondary: "#8b5cf6",  // violet-500
    cloud: "#818cf8",      // indigo-400
  },

  // Chart backgrounds and borders
  backgrounds: {
    card: "#ffffff",
    muted: "#f3f4f6",      // gray-100
    border: "#e5e7eb",     // gray-200
  },

  // Interactive states
  states: {
    hover: "#f9fafb",      // gray-50
    focus: "#3b82f6",      // blue-500
    success: "#10b981",    // green-500
    warning: "#f59e0b",    // amber-500
    error: "#ef4444",      // red-500
  }
} as const;

/**
 * Get color by index for multiple choice questions
 * Cycles through colors if index exceeds array length
 */
export function getMultipleChoiceColor(index: number): string {
  return chartColors.multipleChoice[index % chartColors.multipleChoice.length];
}

/**
 * Get rating color based on value (1-5 scale)
 * Returns gradient colors from red (low) to green (high)
 */
export function getRatingColor(value: number, maxValue: number = 5): string {
  const index = Math.min(Math.floor((value / maxValue) * chartColors.rating.gradient.length), chartColors.rating.gradient.length - 1);
  return chartColors.rating.gradient[index];
}
