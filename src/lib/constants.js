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

export const BODY_LIMITATIONS = [
  "Cannot kneel", "Cannot squat", "Cannot raise arms overhead",
  "Cannot bear weight on left wrist", "Cannot bear weight on right wrist",
  "Cannot stand longer than 5 minutes", "Cannot stand longer than 10 minutes",
  "Cannot stand longer than 15 minutes", "Cannot stand at all",
  "Cannot walk farther than 50 feet", "Cannot walk farther than 100 feet",
  "Cannot walk farther than 500 feet", "Cannot walk at all",
  "Uses cane", "Uses walker", "Uses wheelchair", "Uses prosthetic",
  "Cannot grip with left hand", "Cannot grip with right hand",
  "Cannot bend at waist", "Cannot twist torso",
  "Cannot bear weight on left leg", "Cannot bear weight on right leg",
  "Limited neck rotation", "Cannot lie flat on back",
  "Cannot lie on stomach", "Cannot get up from floor",
  "Cannot cross legs", "Limited shoulder range left",
  "Limited shoulder range right", "Cannot lift more than 5 lbs",
  "Cannot lift more than 10 lbs"
];

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