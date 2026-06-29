export function buildUserTags(profile) {
  const restriction = new Set(); // exercises with ANY of these tags are excluded for this user
  const capability = new Set();  // passed to LLM to guide exercise selection toward suitable exercises
  const p = profile;
  const limitations = (p.body_limitations || []).join(' ').toLowerCase();
  const disabilities = (p.disabilities || []).join(' ').toLowerCase();
  const allText = limitations + ' ' + disabilities;

  // ── ABILITIES CHECKLIST TAGS ──
  const ca = p.current_abilities || {};

  // SUPPORTED set (condition_severity === "Severely"): derive mobility restrictions from what they can't do
  if (p.condition_severity === 'Severely') {
    const canWalkRoom = ca.walk_across_room === true;
    const canStepUnaided = ca.take_few_steps_unaided === true;
    const canStandFromChair = ca.stand_from_chair_support === true;
    if (!canWalkRoom && !canStepUnaided) {
      restriction.add('cannot_stand'); restriction.add('no_high_impact'); restriction.add('very_low_mobility');
    } else if (!canStandFromChair) {
      restriction.add('cannot_stand'); restriction.add('no_high_impact');
    } else {
      restriction.add('no_high_impact'); restriction.add('very_low_mobility');
    }
    // If only seated abilities checked, enforce seated focus
    const onlySeatedChecked = (ca.seated_arm_raise === true || ca.seated_leg_march === true || ca.reach_forward_seated === true)
      && !canWalkRoom && !canStepUnaided;
    if (onlySeatedChecked) {
      restriction.add('cannot_stand');
    }
  }

  // HIGH set (condition_severity === "A little"): positive capability signals — no extra restrictions
  if (p.condition_severity === 'A little') {
    if (ca.brisk_walk_or_jog === true) capability.add('cardiovascular');
    if (ca.lift_25_lbs === true) capability.add('moderate_lifting');
    if (ca.squat_down === true) capability.add('lower_body_strength');
    if (ca.balance_30_sec === true) capability.add('balance_training');
    if (ca.get_up_from_floor_no_hands === true) capability.add('full_body_mobility');
    if (ca.walk_30_min === true) capability.add('endurance');
  }

  // ── MOBILITY / POSITION ──
  if (p.fitness_mode === 'Wheelchair' || p.current_abilities?.can_stand === false) {
    restriction.add('cannot_stand'); restriction.add('wheelchair_user');
  }
  if (p.current_abilities?.can_walk === false) restriction.add('cannot_stand');
  if (p.activity_level === 'Bedridden') {
    restriction.add('cannot_stand'); restriction.add('no_high_impact'); restriction.add('very_low_mobility');
  }
  if (allText.includes('paralyz') || allText.includes('paraplegia') || allText.includes('quadriplegia')) {
    restriction.add('cannot_stand'); restriction.add('paraplegia');
  }

  // ── AMPUTATIONS / LIMB LOSS ──
  const leftLeg = limitations.includes('left leg') || limitations.includes('left lower');
  const rightLeg = limitations.includes('right leg') || limitations.includes('right lower');
  const bothLegs = limitations.includes('no leg') || limitations.includes('bilateral leg') || limitations.includes('double amputat') || (leftLeg && rightLeg);
  const leftArm = limitations.includes('left arm') || limitations.includes('left upper') || limitations.includes('lost left');
  const rightArm = limitations.includes('right arm') || limitations.includes('right upper') || limitations.includes('lost right');
  const bothArms = limitations.includes('no arm') || limitations.includes('bilateral arm') || (leftArm && rightArm);

  if (bothLegs) { restriction.add('no_legs'); restriction.add('cannot_stand'); restriction.add('no_high_impact'); }
  else if (leftLeg || rightLeg) { restriction.add('single_leg_amputation'); restriction.add('no_high_impact'); }
  if (bothArms) { restriction.add('no_arms'); }
  else if (leftArm) { restriction.add('single_arm_amputation'); restriction.add('no_bilateral_arms'); }
  else if (rightArm) { restriction.add('single_arm_amputation'); restriction.add('no_bilateral_arms'); }
  // Generic fallback
  if (!bothLegs && !leftLeg && !rightLeg && (limitations.includes('amputat') || limitations.includes('prosthetic')) && limitations.includes('leg')) {
    restriction.add('single_leg_amputation'); restriction.add('no_high_impact');
  }
  if (!bothArms && !leftArm && !rightArm && (limitations.includes('amputat') || limitations.includes('prosthetic')) && limitations.includes('arm')) {
    restriction.add('single_arm_amputation'); restriction.add('no_bilateral_arms');
  }

  // ── JOINT PAIN — scaled by severity ──
  // Pain 1-3: LLM handles via safety_notes, no hard filter
  // Pain 4-6: filter exercises that heavily load that joint
  // Pain 7+:  filter all exercises that stress that area
  Object.entries(p.pain_areas || {}).forEach(([area, level]) => {
    const a = area.toLowerCase();
    if (level >= 4) {
      if (a.includes('knee')) restriction.add('knee_pain');
      if (a.includes('hip')) restriction.add('hip_pain');
      if (a.includes('back') || a.includes('lumbar')) restriction.add('back_pain');
      if (a.includes('neck') || a.includes('cervical')) restriction.add('neck_injury');
      if (a.includes('shoulder')) restriction.add('shoulder_injury');
      if (a.includes('wrist') || a.includes('hand')) restriction.add('wrist_injury');
      if (a.includes('elbow')) restriction.add('elbow_injury');
      if (a.includes('ankle') || a.includes('foot')) restriction.add('ankle_pain');
    }
    if (level >= 7) {
      if (a.includes('knee')) restriction.add('knee_replacement'); // most restrictive knee tag
      if (a.includes('hip')) restriction.add('hip_replacement');
      if (a.includes('back') || a.includes('lumbar')) restriction.add('no_spinal_flexion');
      if (a.includes('neck') || a.includes('cervical')) restriction.add('no_neck_flexion');
      if (a.includes('shoulder')) restriction.add('no_overhead_press');
      if (a.includes('ankle') || a.includes('foot')) restriction.add('no_high_impact');
    }
  });

  // ── BODY LIMITATION KEYWORDS → joint tags ──
  if (limitations.includes('knee')) {
    restriction.add('knee_pain');
    if (limitations.includes('replacement') || limitations.includes('severe') || limitations.includes('surgery')) restriction.add('knee_replacement');
  }
  if (limitations.includes('hip')) {
    restriction.add('hip_pain');
    if (limitations.includes('replacement') || limitations.includes('severe')) restriction.add('hip_replacement');
  }
  if (limitations.includes('back') || limitations.includes('lumbar') || limitations.includes('spine')) restriction.add('back_pain');
  if (limitations.includes('herniat') || limitations.includes('disc')) { restriction.add('back_pain'); restriction.add('no_spinal_flexion'); }
  if (limitations.includes('neck') || limitations.includes('cervical')) restriction.add('neck_injury');
  if (limitations.includes('shoulder') || limitations.includes('rotator')) restriction.add('shoulder_injury');
  if (limitations.includes('wrist') || limitations.includes('carpal')) restriction.add('wrist_injury');
  if (limitations.includes('ankle')) restriction.add('ankle_pain');
  if (limitations.includes('balance')) restriction.add('balance_issues');
  if (limitations.includes('scoliosis')) {
    restriction.add('scoliosis');
    if (limitations.includes('severe')) restriction.add('no_spinal_flexion');
  }
  if (limitations.includes('osteoporosis')) { restriction.add('osteoporosis'); restriction.add('no_spinal_flexion'); restriction.add('no_high_impact'); }

  // ── MEDICAL CONDITIONS ──
  if (disabilities.includes('heart') || disabilities.includes('cardiac') || disabilities.includes('cardiovascular')) {
    restriction.add('heart_condition'); restriction.add('no_high_impact'); restriction.add('breathing_difficulty');
    capability.add('heart_safe');
  }
  if (disabilities.includes('copd') || disabilities.includes('emphysema') || disabilities.includes('pulmonary')) {
    restriction.add('copd'); restriction.add('breathing_difficulty');
    capability.add('breathing_focused'); capability.add('heart_safe');
  }
  if (disabilities.includes('epilepsy') || disabilities.includes('seizure')) {
    restriction.add('seizure_risk'); restriction.add('no_head_inversion');
    capability.add('vertigo_safe');
  }
  if (allText.includes('osteoporosis')) {
    restriction.add('osteoporosis'); restriction.add('no_spinal_flexion'); restriction.add('no_high_impact');
    capability.add('osteoporosis_safe');
  }
  if (allText.includes('fracture') || allText.includes('brittle bone')) {
    restriction.add('fracture_risk'); restriction.add('no_high_impact');
  }
  if (disabilities.includes('vertigo') || disabilities.includes('vestibular')) {
    restriction.add('vertigo'); restriction.add('balance_issues'); restriction.add('no_head_inversion');
    capability.add('vertigo_safe');
  }
  if (disabilities.includes('pregnancy')) {
    restriction.add('pregnancy'); restriction.add('no_spinal_flexion');
    capability.add('pregnancy_safe');
  }
  if (disabilities.includes('parkinson')) {
    restriction.add('parkinsons'); restriction.add('no_high_impact');
    capability.add('balance_training'); capability.add('coordination');
  }
  if (disabilities.includes('multiple sclerosis') || disabilities.includes(' ms ') || disabilities.includes('ms,')) {
    restriction.add('multiple_sclerosis'); restriction.add('heat_sensitive');
    capability.add('fatigue_management');
  }
  if (disabilities.includes('fibromyalgia') || disabilities.includes('chronic fatigue') || disabilities.includes('cfs')) {
    restriction.add('fibromyalgia'); restriction.add('chronic_fatigue');
    capability.add('fatigue_management'); capability.add('chronic_pain');
  }
  if (disabilities.includes('arthritis') || disabilities.includes('rheumatoid')) {
    restriction.add('arthritis'); restriction.add('no_high_impact');
    capability.add('joint_mobility'); capability.add('chronic_pain');
  }
  if (disabilities.includes('rheumatoid')) restriction.add('rheumatoid_arthritis');
  if (disabilities.includes('stroke')) {
    restriction.add('stroke_recovery'); // exercises tagged stroke_recovery are FOR this person, not against — LLM uses capability tags instead
    capability.add('stroke_recovery'); capability.add('coordination'); capability.add('balance_training');
  }
  if (disabilities.includes('cerebral palsy')) {
    restriction.add('cerebral_palsy');
    capability.add('coordination'); capability.add('balance_training');
  }
  if (disabilities.includes('autism') || disabilities.includes('asd')) {
    capability.add('sensory_grounding');
  }
  if (disabilities.includes('diabetes')) {
    capability.add('heart_safe');
  }

  // ── ADDITIONAL NEUROLOGICAL / SYSTEMIC CONDITIONS ──
  if (disabilities.includes('muscular dystrophy') || disabilities.includes('duchenne') || disabilities.includes('becker')) {
    restriction.add('muscular_dystrophy'); restriction.add('no_high_impact'); restriction.add('very_low_mobility');
    capability.add('low_mobility'); capability.add('fatigue_management');
  }
  if (disabilities.includes('tbi') || disabilities.includes('traumatic brain') || disabilities.includes('brain injury')) {
    restriction.add('tbi'); restriction.add('no_high_impact'); restriction.add('balance_issues');
    capability.add('coordination'); capability.add('balance_training'); capability.add('stroke_recovery');
  }
  if (disabilities.includes('ehlers-danlos') || disabilities.includes('eds') || disabilities.includes('hypermobility')) {
    restriction.add('hypermobility'); restriction.add('joint_instability'); capability.add('chronic_pain');
  }
  if (disabilities.includes('visual impairment') || disabilities.includes('blind') || disabilities.includes('low vision')) {
    restriction.add('low_vision'); restriction.add('balance_issues'); capability.add('low_mobility');
  }
  if (disabilities.includes('intellectual disability') || disabilities.includes('developmental disability') || disabilities.includes('down syndrome')) {
    restriction.add('intellectual_disability'); capability.add('low_mobility'); capability.add('coordination');
  }
  if (disabilities.includes('brain tumor') || disabilities.includes('glioma')) {
    restriction.add('brain_tumor'); restriction.add('no_high_impact'); restriction.add('balance_issues');
    capability.add('low_mobility'); capability.add('stroke_recovery');
  }
  if (allText.includes('frail') || allText.includes('fall risk')) {
    restriction.add('balance_issues'); restriction.add('fall_risk'); restriction.add('no_high_impact'); capability.add('low_mobility');
  }
  if (allText.includes('post-surgery') || allText.includes('post surgery') || allText.includes('post-op') || allText.includes('recovering from surgery')) {
    restriction.add('post_surgery'); restriction.add('no_high_impact'); capability.add('low_mobility');
  }
  if (disabilities.includes('dementia') || disabilities.includes('alzheimer')) {
    restriction.add('cognitive_impairment'); capability.add('low_mobility'); capability.add('coordination');
  }

  // ── BMI / WEIGHT ──
  const bmi = (p.weight_lbs && p.height_inches)
    ? (p.weight_lbs / (p.height_inches * p.height_inches)) * 703
    : null;
  if (bmi && bmi >= 35) {
    restriction.add('no_high_impact'); restriction.add('high_bmi');
    capability.add('low_mobility'); capability.add('fatigue_management'); capability.add('obesity');
  } else if (bmi && bmi >= 30) {
    restriction.add('no_high_impact'); capability.add('obesity');
  }

  // ── ACTIVITY LEVEL ──
  if (p.activity_level === 'Bedridden' || p.activity_level === 'Mostly seated') {
    restriction.add('no_high_impact'); restriction.add('very_low_mobility');
  }

  // ── RISK FACTORS ──
  (p.risk_factors || []).forEach(r => {
    const rf = r.toLowerCase();
    if (rf.includes('fall')) restriction.add('balance_issues');
    if (rf.includes('surgery') && (rf.includes('recent') || rf.includes('post'))) restriction.add('fracture_risk');
    if (rf.includes('pacemaker') || rf.includes('defibrillator')) { restriction.add('heart_condition'); restriction.add('no_high_impact'); restriction.add('breathing_difficulty'); capability.add('heart_safe'); }
    if (rf.includes('heart') || rf.includes('cardiac') || rf.includes('cardiovascular')) { restriction.add('heart_condition'); restriction.add('no_high_impact'); capability.add('heart_safe'); }
    if (rf.includes('copd') || rf.includes('asthma') || rf.includes('respiratory') || rf.includes('pulmonary')) restriction.add('breathing_difficulty');
    if (rf.includes('blood pressure') || rf.includes('hypertension')) restriction.add('breathing_difficulty');
    if (rf.includes('immune') || rf.includes('immunocompromised')) restriction.add('immune_compromised');
  });

  return { restriction, capability };
}

export const DIFFICULTY_RANK = { Beginner: 1, Easy: 2, Moderate: 3, Advanced: 4 };

// Deterministic difficulty ceiling — a safety backstop on top of the AI's calibration.
// Genuinely low-capability users (very_low_mobility = bedridden / mostly seated / frail)
// should never be served Moderate or Advanced exercises, even if the AI under-adapts.
// We intentionally do NOT cap other tiers, because many low-mobility users
// (e.g. athletic wheelchair users) are highly capable and capping them would be insulting.
export function difficultyAllowed(exerciseDifficulty, restrictionSet) {
  const cap = restrictionSet.has('very_low_mobility') ? 2 : 4;
  return (DIFFICULTY_RANK[exerciseDifficulty] || 1) <= cap;
}