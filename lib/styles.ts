export const statusColors = {
  OK: {
    bg: "bg-driscoll-lightgreen/10",
    text: "text-driscoll-lightgreen",
    border: "border-driscoll-lightgreen/30",
    dot: "bg-driscoll-lightgreen",
  },
  RISK: {
    bg: "bg-driscoll-yellow/20",
    text: "text-driscoll-darkgreen",
    border: "border-driscoll-yellow",
    dot: "bg-driscoll-yellow",
  },
  FAIL: {
    bg: "bg-driscoll-red/10",
    text: "text-driscoll-red",
    border: "border-driscoll-red/30",
    dot: "bg-driscoll-red",
  },
  PENDIENTE: {
    bg: "bg-gray-100",
    text: "text-gray-600",
    border: "border-gray-300",
    dot: "bg-gray-400",
  },
};

export const severityColors = {
  HIGH: {
    bg: "bg-driscoll-red/10",
    text: "text-driscoll-red",
    border: "border-driscoll-red/30",
  },
  MEDIUM: {
    bg: "bg-driscoll-yellow/20",
    text: "text-driscoll-darkgreen",
    border: "border-driscoll-yellow",
  },
  LOW: {
    bg: "bg-driscoll-lightgreen/10",
    text: "text-driscoll-lightgreen",
    border: "border-driscoll-lightgreen/30",
  },
};

export const buttonStyles = {
  primary: "bg-driscoll-yellow text-driscoll-green hover:bg-driscoll-yellow/90 font-semibold px-4 py-2 rounded-lg transition-colors shadow-md",
  secondary: "bg-driscoll-green text-white hover:bg-driscoll-darkgreen font-semibold px-4 py-2 rounded-lg transition-colors",
  outline: "border-2 border-driscoll-green text-driscoll-green hover:bg-driscoll-green hover:text-white font-semibold px-4 py-2 rounded-lg transition-colors",
  danger: "bg-driscoll-red text-white hover:bg-driscoll-red/90 font-semibold px-4 py-2 rounded-lg transition-colors",
  ghost: "text-driscoll-green hover:bg-driscoll-green/10 font-medium px-4 py-2 rounded-lg transition-colors",
};
