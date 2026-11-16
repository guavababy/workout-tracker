export const MUSCLE_GROUPS = ['All', 'Chest', 'Back', 'Shoulders', 'Biceps', 'Triceps', 'Legs', 'Core', 'Cardio']

export const DEFAULT_EXERCISES = [
  // Chest
  { name: 'Bench Press', muscle_group: 'Chest', category: 'Barbell' },
  { name: 'Incline Bench Press', muscle_group: 'Chest', category: 'Barbell' },
  { name: 'Decline Bench Press', muscle_group: 'Chest', category: 'Barbell' },
  { name: 'Dumbbell Press', muscle_group: 'Chest', category: 'Dumbbell' },
  { name: 'Incline Dumbbell Press', muscle_group: 'Chest', category: 'Dumbbell' },
  { name: 'Dumbbell Flye', muscle_group: 'Chest', category: 'Dumbbell' },
  { name: 'Cable Crossover', muscle_group: 'Chest', category: 'Cable' },
  { name: 'Push-Up', muscle_group: 'Chest', category: 'Bodyweight' },
  { name: 'Chest Dips', muscle_group: 'Chest', category: 'Bodyweight' },

  // Back
  { name: 'Deadlift', muscle_group: 'Back', category: 'Barbell' },
  { name: 'Barbell Row', muscle_group: 'Back', category: 'Barbell' },
  { name: 'Pull-Up', muscle_group: 'Back', category: 'Bodyweight' },
  { name: 'Chin-Up', muscle_group: 'Back', category: 'Bodyweight' },
  { name: 'Lat Pulldown', muscle_group: 'Back', category: 'Cable' },
  { name: 'Seated Cable Row', muscle_group: 'Back', category: 'Cable' },
  { name: 'Single-Arm Dumbbell Row', muscle_group: 'Back', category: 'Dumbbell' },
  { name: 'T-Bar Row', muscle_group: 'Back', category: 'Machine' },
  { name: 'Face Pull', muscle_group: 'Back', category: 'Cable' },
  { name: 'Hyperextension', muscle_group: 'Back', category: 'Bodyweight' },

  // Shoulders
  { name: 'Overhead Press', muscle_group: 'Shoulders', category: 'Barbell' },
  { name: 'Dumbbell Shoulder Press', muscle_group: 'Shoulders', category: 'Dumbbell' },
  { name: 'Arnold Press', muscle_group: 'Shoulders', category: 'Dumbbell' },
  { name: 'Lateral Raise', muscle_group: 'Shoulders', category: 'Dumbbell' },
  { name: 'Front Raise', muscle_group: 'Shoulders', category: 'Dumbbell' },
  { name: 'Rear Delt Flye', muscle_group: 'Shoulders', category: 'Dumbbell' },
  { name: 'Cable Lateral Raise', muscle_group: 'Shoulders', category: 'Cable' },

  // Biceps
  { name: 'Barbell Curl', muscle_group: 'Biceps', category: 'Barbell' },
  { name: 'Dumbbell Curl', muscle_group: 'Biceps', category: 'Dumbbell' },
  { name: 'Hammer Curl', muscle_group: 'Biceps', category: 'Dumbbell' },
  { name: 'Incline Dumbbell Curl', muscle_group: 'Biceps', category: 'Dumbbell' },
  { name: 'Preacher Curl', muscle_group: 'Biceps', category: 'Machine' },
  { name: 'Cable Curl', muscle_group: 'Biceps', category: 'Cable' },
  { name: 'Concentration Curl', muscle_group: 'Biceps', category: 'Dumbbell' },

  // Triceps
  { name: 'Tricep Pushdown', muscle_group: 'Triceps', category: 'Cable' },
  { name: 'Overhead Tricep Extension', muscle_group: 'Triceps', category: 'Cable' },
  { name: 'Skull Crushers', muscle_group: 'Triceps', category: 'Barbell' },
  { name: 'Close-Grip Bench Press', muscle_group: 'Triceps', category: 'Barbell' },
  { name: 'Tricep Dips', muscle_group: 'Triceps', category: 'Bodyweight' },
  { name: 'Diamond Push-Up', muscle_group: 'Triceps', category: 'Bodyweight' },
  { name: 'Kickback', muscle_group: 'Triceps', category: 'Dumbbell' },

  // Legs
  { name: 'Squat', muscle_group: 'Legs', category: 'Barbell' },
  { name: 'Front Squat', muscle_group: 'Legs', category: 'Barbell' },
  { name: 'Romanian Deadlift', muscle_group: 'Legs', category: 'Barbell' },
  { name: 'Leg Press', muscle_group: 'Legs', category: 'Machine' },
  { name: 'Leg Curl', muscle_group: 'Legs', category: 'Machine' },
  { name: 'Leg Extension', muscle_group: 'Legs', category: 'Machine' },
  { name: 'Hip Thrust', muscle_group: 'Legs', category: 'Barbell' },
  { name: 'Lunge', muscle_group: 'Legs', category: 'Bodyweight' },
  { name: 'Bulgarian Split Squat', muscle_group: 'Legs', category: 'Dumbbell' },
  { name: 'Goblet Squat', muscle_group: 'Legs', category: 'Dumbbell' },
  { name: 'Calf Raise', muscle_group: 'Legs', category: 'Machine' },
  { name: 'Seated Calf Raise', muscle_group: 'Legs', category: 'Machine' },
  { name: 'Step-Up', muscle_group: 'Legs', category: 'Dumbbell' },

  // Core
  { name: 'Plank', muscle_group: 'Core', category: 'Bodyweight' },
  { name: 'Crunch', muscle_group: 'Core', category: 'Bodyweight' },
  { name: 'Leg Raise', muscle_group: 'Core', category: 'Bodyweight' },
  { name: 'Hanging Leg Raise', muscle_group: 'Core', category: 'Bodyweight' },
  { name: 'Russian Twist', muscle_group: 'Core', category: 'Bodyweight' },
  { name: 'Cable Crunch', muscle_group: 'Core', category: 'Cable' },
  { name: 'Ab Wheel Rollout', muscle_group: 'Core', category: 'Bodyweight' },
  { name: 'Side Plank', muscle_group: 'Core', category: 'Bodyweight' },

  // Cardio
  { name: 'Running', muscle_group: 'Cardio', category: 'Cardio' },
  { name: 'Cycling', muscle_group: 'Cardio', category: 'Cardio' },
  { name: 'Jump Rope', muscle_group: 'Cardio', category: 'Cardio' },
  { name: 'Rowing', muscle_group: 'Cardio', category: 'Cardio' },
  { name: 'Elliptical', muscle_group: 'Cardio', category: 'Cardio' },
  { name: 'Stair Climber', muscle_group: 'Cardio', category: 'Cardio' },
]
