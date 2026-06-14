export const GOALS = [
  "Lose weight", "Improve mobility", "Reduce pain", "Improve balance",
  "Build strength", "Increase stamina", "Improve flexibility", "Walk farther",
  "Stand longer", "Wheelchair fitness", "Improve independence", "Fall prevention",
  "Better heart health", "Better daily functioning"
];

export const ACTIVITY_LEVELS = [
  { value: "Bedridden", label: "Bedridden", description: "Mostly in bed" },
  { value: "Mostly seated", label: "Mostly Seated", description: "Spend most time sitting" },
  { value: "Wheelchair user", label: "Wheelchair User", description: "Primary mobility via wheelchair" },
  { value: "Limited walking", label: "Limited Walking", description: "Can walk short distances" },
  { value: "Light activity", label: "Light Activity", description: "Some daily movement" },
  { value: "Moderate activity", label: "Moderate Activity", description: "Regular light exercise" },
  { value: "Active", label: "Active", description: "Consistently active" }
];

// Body-area grouped conditions — used by the new StepDisabilities
export const BODY_CONDITIONS = [
  {
    area: "Right Knee",
    icon: "🦵",
    conditions: [
      "Right knee pain", "Right knee arthritis", "Right knee replacement",
      "Torn ACL / meniscus (right)", "Right knee surgery (recent)",
      "Cannot fully bend right knee", "Cannot kneel on right knee",
      "Blast injury (right leg)"
    ]
  },
  {
    area: "Left Knee",
    icon: "🦵",
    conditions: [
      "Left knee pain", "Left knee arthritis", "Left knee replacement",
      "Torn ACL / meniscus (left)", "Left knee surgery (recent)",
      "Cannot fully bend left knee", "Cannot kneel on left knee",
      "Blast injury (left leg)"
    ]
  },
  {
    area: "Right Shoulder",
    icon: "💪",
    conditions: [
      "Right shoulder pain", "Torn rotator cuff (right)", "Right shoulder replacement",
      "Right shoulder surgery (recent)", "Cannot raise right arm overhead",
      "Limited right shoulder range of motion"
    ]
  },
  {
    area: "Left Shoulder",
    icon: "💪",
    conditions: [
      "Left shoulder pain", "Torn rotator cuff (left)", "Left shoulder replacement",
      "Left shoulder surgery (recent)", "Cannot raise left arm overhead",
      "Limited left shoulder range of motion"
    ]
  },
  {
    area: "Back",
    icon: "🔙",
    conditions: [
      "Lower back pain", "Upper back pain", "Herniated disc",
      "Spinal stenosis", "Scoliosis", "Spinal fusion surgery",
      "Sciatica", "Cannot bend at waist", "Cannot twist torso",
      "Cannot lie flat on back"
    ]
  },
  {
    area: "Neck",
    icon: "🫀",
    conditions: [
      "Neck pain", "Cervical herniated disc", "Whiplash injury",
      "Neck surgery (recent)", "Limited neck rotation", "Cannot turn head fully"
    ]
  },
  {
    area: "Hips",
    icon: "🦴",
    conditions: [
      "Right hip pain", "Left hip pain", "Hip replacement (right)",
      "Hip replacement (left)", "Hip arthritis", "Hip labral tear",
      "Hip surgery (recent)", "Limited hip range of motion",
      "Cannot bear weight on right leg", "Cannot bear weight on left leg"
    ]
  },
  {
    area: "Ankles & Feet",
    icon: "🦶",
    conditions: [
      "Right ankle pain / sprain", "Left ankle pain / sprain",
      "Plantar fasciitis (right)", "Plantar fasciitis (left)",
      "Foot surgery (recent)", "Limited ankle mobility",
      "Uses prosthetic (lower limb)", "Cannot walk farther than 50 feet"
    ]
  },
  {
    area: "Wrists & Hands",
    icon: "🤚",
    conditions: [
      "Right wrist pain", "Left wrist pain", "Carpal tunnel (right)",
      "Carpal tunnel (left)", "Cannot grip with right hand", "Cannot grip with left hand",
      "Arthritis in hands", "Wrist fracture / surgery"
    ]
  },
  {
    area: "Mobility & Movement",
    icon: "🦽",
    conditions: [
      "Wheelchair user", "Uses walker", "Uses cane",
      "Cannot stand at all", "Cannot stand longer than 5 minutes",
      "Cannot get up from floor", "Amputee (upper limb)", "Amputee (lower limb)",
      "Paralysis", "Partial paralysis", "Balance issues"
    ]
  },
  {
    area: "Neurological",
    icon: "🧠",
    conditions: [
      "Parkinson's disease", "Stroke recovery", "Traumatic brain injury",
      "Vertigo / dizziness", "Essential tremor", "Multiple sclerosis",
      "Peripheral neuropathy", "Epilepsy / seizure disorder",
      "Cerebral palsy", "Balance disorders"
    ]
  },
  {
    area: "Heart & Lungs",
    icon: "❤️",
    conditions: [
      "Heart disease", "High blood pressure", "Heart failure",
      "Post-cardiac surgery", "COPD", "Asthma",
      "Pulmonary fibrosis", "Oxygen dependent", "Exercise-induced chest pain"
    ]
  },
  {
    area: "Chronic Conditions",
    icon: "🩹",
    conditions: [
      "Fibromyalgia", "Chronic pain (general)", "Rheumatoid arthritis",
      "Arthritis (general)", "Neuropathy", "Diabetes",
      "Osteoporosis", "Lupus", "Ehlers-Danlos syndrome",
      "Chronic fatigue syndrome", "Muscular dystrophy"
    ]
  },
  {
    area: "Mental Health",
    icon: "🌿",
    conditions: [
      "PTSD", "Anxiety", "Depression", "Cognitive impairment"
    ]
  },
  {
    area: "Post-Surgery / Recovery",
    icon: "🏥",
    conditions: [
      "Post-abdominal surgery", "Cancer recovery", "Post-surgical recovery (other)",
      "Recent hospitalization", "Hernia", "Ostomy / colostomy present",
      "Spinal cord injury", "Combat injury", "Service-connected disability"
    ]
  }
];

export const DISABILITIES_DB = {
  "Mobility": [
    "Wheelchair user", "Amputee (upper)", "Amputee (lower)", "Paralysis",
    "Partial paralysis", "Multiple sclerosis", "Cerebral palsy",
    "Muscular dystrophy", "Spinal cord injury", "Hip replacement",
    "Knee replacement", "Joint fusion", "Scoliosis"
  ],
  "Pain Conditions": [
    "Fibromyalgia", "Chronic pain", "Arthritis", "Rheumatoid arthritis",
    "Back pain", "Neck pain", "Neuropathy", "Complex regional pain syndrome",
    "Tendinitis", "Bursitis", "Plantar fasciitis"
  ],
  "Neurological": [
    "Parkinson's disease", "Stroke recovery", "Traumatic brain injury",
    "Vertigo", "Balance disorders", "Epilepsy", "Peripheral neuropathy",
    "Essential tremor"
  ],
  "Respiratory": [
    "COPD", "Asthma", "Pulmonary fibrosis", "Sleep apnea"
  ],
  "Cardiovascular": [
    "Heart disease", "High blood pressure", "Heart failure",
    "Post-cardiac surgery", "Peripheral artery disease"
  ],
  "Mental Health": [
    "PTSD", "Anxiety", "Depression", "Cognitive impairment"
  ],
  "Veterans": [
    "Combat injury", "Service-connected disability", "Blast injury",
    "Military sexual trauma"
  ],
  "Other": [
    "Diabetes", "Obesity", "Osteoporosis", "Cancer recovery",
    "Post-surgical recovery", "Chronic fatigue syndrome",
    "Ehlers-Danlos syndrome", "Lupus"
  ]
};

export const BODY_LIMITATION_GROUPS = [
  {
    area: "Knees",
    icon: "🦵",
    options: [
      "Knee replacement (left)", "Knee replacement (right)",
      "Knee replacement (both)", "Torn ACL/meniscus",
      "Knee arthritis", "Knee surgery (recent)",
      "Cannot kneel", "Cannot fully bend knees",
      "Cannot squat", "General knee pain"
    ]
  },
  {
    area: "Back",
    icon: "🔙",
    options: [
      "Lower back pain", "Upper back pain",
      "Herniated disc", "Spinal stenosis",
      "Scoliosis", "Spinal fusion surgery",
      "Cannot bend at waist", "Cannot twist torso",
      "Cannot lie flat on back", "Sciatica"
    ]
  },
  {
    area: "Hips",
    icon: "🦴",
    options: [
      "Hip replacement (left)", "Hip replacement (right)",
      "Hip replacement (both)", "Hip arthritis",
      "Hip labral tear", "Hip surgery (recent)",
      "Cannot bear weight on left leg", "Cannot bear weight on right leg",
      "General hip pain", "Limited hip range of motion"
    ]
  },
  {
    area: "Shoulders & Arms",
    icon: "💪",
    options: [
      "Rotator cuff injury (left)", "Rotator cuff injury (right)",
      "Shoulder replacement (left)", "Shoulder replacement (right)",
      "Limited shoulder range (left)", "Limited shoulder range (right)",
      "Cannot raise arms overhead", "Elbow injury/pain",
      "General shoulder pain", "Post-shoulder surgery"
    ]
  },
  {
    area: "Wrists & Hands",
    icon: "🤚",
    options: [
      "Cannot grip with left hand", "Cannot grip with right hand",
      "Cannot bear weight on left wrist", "Cannot bear weight on right wrist",
      "Carpal tunnel (left)", "Carpal tunnel (right)",
      "Wrist fracture/surgery", "Arthritis in hands",
      "Limited finger dexterity"
    ]
  },
  {
    area: "Ankles & Feet",
    icon: "🦶",
    options: [
      "Ankle injury/sprain (left)", "Ankle injury/sprain (right)",
      "Plantar fasciitis (left)", "Plantar fasciitis (right)",
      "Foot surgery (recent)", "Cannot walk farther than 50 feet",
      "Cannot walk farther than 100 feet", "Cannot walk at all",
      "Limited ankle mobility", "Uses prosthetic (lower)"
    ]
  },
  {
    area: "Neck",
    icon: "🫀",
    options: [
      "Neck pain (chronic)", "Cervical herniated disc",
      "Limited neck rotation", "Neck surgery (recent)",
      "Whiplash injury", "Cannot turn head fully"
    ]
  },
  {
    area: "Standing & Walking",
    icon: "🚶",
    options: [
      "Cannot stand at all", "Cannot stand longer than 5 minutes",
      "Cannot stand longer than 10 minutes", "Cannot stand longer than 15 minutes",
      "Uses cane", "Uses walker", "Uses wheelchair",
      "Cannot get up from floor", "Balance issues"
    ]
  },
  {
    area: "Core & Abdomen",
    icon: "🫁",
    options: [
      "Post-abdominal surgery", "Hernia",
      "Cannot do sit-ups/crunches", "Weak core",
      "Diastasis recti", "Ostomy/colostomy present"
    ]
  }
];

// Flat list for backward compatibility
export const BODY_LIMITATIONS = BODY_LIMITATION_GROUPS.flatMap(g => g.options);

export const BODY_AREAS = [
  "Head/Neck", "Left Shoulder", "Right Shoulder",
  "Upper Back", "Lower Back", "Chest",
  "Left Arm", "Right Arm", "Left Wrist/Hand", "Right Wrist/Hand",
  "Abdomen", "Left Hip", "Right Hip",
  "Left Knee", "Right Knee", "Left Ankle/Foot", "Right Ankle/Foot"
];

export const ABILITIES_CHECKLIST = [
  { key: "stand_from_chair", label: "Stand from a chair without help" },
  { key: "walk_stairs", label: "Walk up stairs" },
  { key: "lift_5_lbs", label: "Lift 5 pounds" },
  { key: "lift_10_lbs", label: "Lift 10 pounds" },
  { key: "reach_overhead", label: "Reach overhead" },
  { key: "balance_one_foot", label: "Balance on one foot (5 seconds)" },
  { key: "walk_10_min", label: "Walk for 10 minutes" },
  { key: "get_up_from_floor", label: "Get up from the floor" },
  { key: "carry_groceries", label: "Carry groceries" },
  { key: "open_jar", label: "Open a jar" }
];

export const RISK_FACTORS = [
  "History of falls", "Recent surgery (last 6 months)",
  "Osteoporosis", "Heart condition", "Dizziness/Vertigo",
  "Seizure disorder", "Blood clot history", "Pacemaker/defibrillator",
  "Oxygen dependent", "Dialysis", "Active cancer treatment",
  "Pregnant", "Recent hospitalization"
];

export const EMERGENCY_SYMPTOMS = [
  "Chest pain", "Severe dizziness", "Loss of consciousness",
  "Difficulty breathing", "Sudden severe headache",
  "Sudden numbness or weakness", "Vision changes"
];