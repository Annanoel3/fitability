export function buildUserTags(profile) {
  const restriction = new Set(); // exercises with ANY of these tags are excluded for this user
  const capability = new Set();  // passed to LLM to guide exercise selection toward suitable exercises
  const p = profile;
  const otherNotes = (p.risk_factor_other || '').toLowerCase();
  const limitations = (p.body_limitations || []).join(' ').toLowerCase() + ' ' + otherNotes;
  const disabilities = (p.disabilities || []).join(' ').toLowerCase();
  const allText = limitations + ' ' + disabilities;

  // ── ABILITIES CHECKLIST TAGS ──
  const ca = p.current_abilities || {};

  // ── GRADED STANDING SET — capability signals from banded answers ──
  const GRADED_FLOOR = { pushups: "None", plank: "Cannot", cardio: "Cannot", lift: "Light only", stairs: "Less than 1", balance: "Can't", sit_to_stand: "Can't" };
  if (ca.cardio && ca.cardio !== GRADED_FLOOR.cardio) capability.add('cardiovascular');
  if (ca.cardio === "20+ min") capability.add('endurance');
  if (ca.lift && ca.lift !== GRADED_FLOOR.lift) capability.add('moderate_lifting');
  if (ca.lift === "50+ lbs") capability.add('heavy_lifting');
  if (ca.pushups && ca.pushups !== GRADED_FLOOR.pushups) capability.add('upper_body_strength');
  if (ca.plank && ca.plank !== GRADED_FLOOR.plank) capability.add('core_strength');
  if (ca.stairs && ca.stairs !== GRADED_FLOOR.stairs) capability.add('lower_body_strength');
  if (ca.balance && ca.balance !== GRADED_FLOOR.balance) { capability.add('balance_training'); }
  if (ca.balance === "30+ sec") capability.add('advanced_balance');
  if (ca.sit_to_stand && ca.sit_to_stand !== GRADED_FLOOR.sit_to_stand) capability.add('lower_body_strength');
  if (ca.sit_to_stand === "16+") capability.add('full_body_mobility');
  // Poor balance signals a restriction
  if (ca.balance === "Can't" || ca.balance === "Under 10 sec") restriction.add('balance_issues');
  // Cannot do stairs at all → no high-impact jumping/running
  if (ca.stairs === "Less than 1") restriction.add('no_high_impact');

  // ── GRADED SEATED SET — capability and restriction signals ──
  const SEATED_FLOOR = { seated_arm_raise: "Cannot", seated_push: "Cannot", seated_grip: "Very weak / none", seated_trunk: "Cannot", seated_lift: "Cannot lift anything", seated_endurance: "Under 1 min" };
  const isSeatedSet = ca.seated_arm_raise !== undefined || ca.seated_trunk !== undefined || ca.seated_lift !== undefined;
  if (isSeatedSet) {
    // These users are non-ambulatory — always restrict standing/high-impact
    restriction.add('cannot_stand'); restriction.add('no_high_impact');
    // Grade mobility further from seated answers
    const trunkOk = ca.seated_trunk && ca.seated_trunk !== SEATED_FLOOR.seated_trunk;
    const liftOk = ca.seated_lift && ca.seated_lift !== SEATED_FLOOR.seated_lift;
    const armOk = ca.seated_arm_raise && ca.seated_arm_raise !== SEATED_FLOOR.seated_arm_raise;
    const enduranceOk = ca.seated_endurance && ca.seated_endurance !== "Under 1 min";
    if (!trunkOk && !armOk) restriction.add('very_low_mobility');
    if (trunkOk) capability.add('seated_core');
    if (armOk) capability.add('seated_upper_body');
    if (liftOk) capability.add('moderate_lifting');
    if (enduranceOk) capability.add('seated_cardio');
    if (ca.seated_grip === "Strong" || ca.seated_grip === "Moderate") capability.add('grip_strength');
    if (ca.seated_endurance === "15+ min") capability.add('endurance');
  }

  // ── CONDITION SEVERITY — pacing/recovery guidance ONLY, no hard restrictions ──
  // A capable person may be heavily affected; severity drives ramp speed, not exercise eligibility.
  if (p.condition_severity === 'Moderately') {
    capability.add('gentle_progression'); capability.add('fatigue_management');
  }
  if (p.condition_severity === 'Severely') {
    capability.add('gentle_progression'); capability.add('fatigue_management'); capability.add('extra_modifications');
  }

  // ── SELF-REPORTED FITNESS — intensity guidance ──
  if (p.self_reported_fitness === 'Strong') capability.add('high_intensity');
  if (p.self_reported_fitness === 'Athletic') { capability.add('high_intensity'); capability.add('advanced_training'); }

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
    if (rf.includes('osteoporosis')) { restriction.add('osteoporosis'); restriction.add('no_spinal_flexion'); restriction.add('no_high_impact'); capability.add('osteoporosis_safe'); }
    if (rf.includes('dizz') || rf.includes('vertigo')) { restriction.add('no_head_inversion'); capability.add('vertigo_safe'); }
    if (rf.includes('seizure') || rf.includes('epilep')) { restriction.add('seizure_risk'); restriction.add('no_head_inversion'); capability.add('vertigo_safe'); }
    if (rf.includes('clot') || rf.includes('dvt') || rf.includes('thrombo')) { restriction.add('blood_clot_risk'); restriction.add('no_high_impact'); capability.add('heart_safe'); }
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

// ── DIFFICULTY FLOOR ──
// A minimum difficulty driven by the user's capability level, activity, and self-reported fitness.
// This raises the bar for capable users so they get Moderate/Advanced work instead of
// gentle defaults. It does NOT override safety — the ceiling (difficultyAllowed) still
// applies on top, and restriction_tags still filter first. The floor only raises the
// minimum among exercises that are already safe for the user.
//
// Returns a DIFFICULTY_RANK value (1=Beginner, 2=Easy, 3=Moderate, 4=Advanced).
export function getDifficultyFloor(profile, restrictionSet) {
  // Restricted users: no floor — keep everything gentle
  if (restrictionSet.has('very_low_mobility')) return 1;
  if (restrictionSet.has('cannot_stand')) return 1;

  const ca = profile.current_abilities || {};
  const fitness = profile.self_reported_fitness;
  const activity = profile.activity_level;

  // ── BASE FLOOR — driven by fitness, abilities, activity (PRIMARY drivers) ──
  let floor = 1;
  if (fitness === 'Athletic') floor = 4;
  else if (fitness === 'Strong') floor = 3;
  else {
    let signals = 0;
    if (ca.pushups && !['None', '0-5'].includes(ca.pushups)) signals++;
    if (ca.plank && !['Cannot', 'Under 10 sec'].includes(ca.plank)) signals++;
    if (ca.cardio && ca.cardio !== 'Cannot') signals++;
    if (ca.stairs && ca.stairs !== 'Less than 1') signals++;
    if (ca.balance && !["Can't", 'Under 10 sec'].includes(ca.balance)) signals++;
    if (ca.lift && !['Light only', 'Cannot lift anything'].includes(ca.lift)) signals++;

    if (fitness === 'Medium' && signals >= 3) floor = 3;
    else if (fitness === 'Medium' && signals >= 1) floor = 2;
    else if (fitness === 'Light' && signals >= 4) floor = 2;
    else if (activity === 'Active' || activity === 'Moderate activity') floor = 2;
  }

  // ── FIX B: Sex as a SMALL secondary nudge (+0.5 for male) ──
  // Never a full tier; primary drivers dominate. A fit woman still gets
  // challenging work; an unfit man is NOT over-challenged. The nudge only
  // affects sort ordering (which exercises are "above floor"), not pool
  // membership or the ceiling.
  if (profile.sex === 'Male') floor = Math.min(floor + 0.5, 4);

  // ── FIX A1: BMI cap — lowers the floor for obese users ──
  // Applied LAST so it always wins over the sex nudge. BMI≥35 → cap at 1
  // (Beginner); BMI≥30 → cap at 2 (Easy). This prevents an obese-but-otherwise-
  // able user from being pushed to Moderate/Advanced work.
  const bmi = (profile.weight_lbs && profile.height_inches)
    ? (profile.weight_lbs / (profile.height_inches * profile.height_inches)) * 703
    : null;
  if (bmi && bmi >= 35) floor = Math.min(floor, 1);
  else if (bmi && bmi >= 30) floor = Math.min(floor, 2);

  return floor;
}