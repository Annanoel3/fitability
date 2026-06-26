import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Called whenever UserProfile is created or updated to compute and store restriction_tags & capability_tags
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    // Support both direct calls (with profile_id) and automation calls (with event data)
    let profile_id = body.profile_id || body.event?.entity_id;
    
    // If no profile_id, fetch it for the current user
    if (!profile_id) {
      const userProfiles = await base44.entities.UserProfile.filter({ created_by_id: user.id });
      if (userProfiles.length === 0) return Response.json({ error: 'No profile found for user' }, { status: 404 });
      profile_id = userProfiles[0].id;
    }

    // Fetch the profile
    const profile = await base44.entities.UserProfile.get(profile_id);
    if (!profile) return Response.json({ error: 'Profile not found' }, { status: 404 });

    // Compute tags using same logic as Dashboard
    const { restriction, capability } = buildUserTags(profile);
    const restriction_tags = Array.from(restriction);
    const capability_tags = Array.from(capability);

    // Store back in UserProfile
    await base44.entities.UserProfile.update(profile_id, {
      restriction_tags,
      capability_tags
    });

    return Response.json({
      success: true,
      profile_id,
      restriction_tags_count: restriction_tags.length,
      capability_tags_count: capability_tags.length,
      restriction_tags,
      capability_tags
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Exact same logic as Dashboard buildUserTags
function buildUserTags(p) {
  const restriction = new Set();
  const capability = new Set();
  const limitations = (p.body_limitations || []).join(' ').toLowerCase();
  const disabilities = (p.disabilities || []).join(' ').toLowerCase();
  const allText = limitations + ' ' + disabilities;

  // ── MOBILITY / POSITION ──
  if (p.fitness_mode === 'Wheelchair' || p.current_abilities?.can_stand === false) {
    restriction.add('cannot_stand');
    restriction.add('wheelchair_user');
  }
  if (p.current_abilities?.can_walk === false) restriction.add('cannot_stand');
  if (p.activity_level === 'Bedridden') {
    restriction.add('cannot_stand');
    restriction.add('no_high_impact');
    restriction.add('very_low_mobility');
  }
  if (allText.includes('paralyz') || allText.includes('paraplegia') || allText.includes('quadriplegia')) {
    restriction.add('cannot_stand');
    restriction.add('paraplegia');
  }

  // ── AMPUTATIONS / LIMB LOSS ──
  const leftLeg = limitations.includes('left leg') || limitations.includes('left lower');
  const rightLeg = limitations.includes('right leg') || limitations.includes('right lower');
  const bothLegs = limitations.includes('no leg') || limitations.includes('bilateral leg') || limitations.includes('double amputat') || (leftLeg && rightLeg);
  const leftArm = limitations.includes('left arm') || limitations.includes('left upper') || limitations.includes('lost left');
  const rightArm = limitations.includes('right arm') || limitations.includes('right upper') || limitations.includes('lost right');
  const bothArms = limitations.includes('no arm') || limitations.includes('bilateral arm') || (leftArm && rightArm);

  if (bothLegs) {
    restriction.add('no_legs');
    restriction.add('cannot_stand');
    restriction.add('no_high_impact');
  } else if (leftLeg || rightLeg) {
    restriction.add('single_leg_amputation');
    restriction.add('no_high_impact');
  }
  if (bothArms) {
    restriction.add('no_arms');
  } else if (leftArm) {
    restriction.add('single_arm_amputation');
    restriction.add('no_bilateral_arms');
  } else if (rightArm) {
    restriction.add('single_arm_amputation');
    restriction.add('no_bilateral_arms');
  }
  if (!bothLegs && !leftLeg && !rightLeg && (limitations.includes('amputat') || limitations.includes('prosthetic')) && limitations.includes('leg')) {
    restriction.add('single_leg_amputation');
    restriction.add('no_high_impact');
  }
  if (!bothArms && !leftArm && !rightArm && (limitations.includes('amputat') || limitations.includes('prosthetic')) && limitations.includes('arm')) {
    restriction.add('single_arm_amputation');
    restriction.add('no_bilateral_arms');
  }

  // ── JOINT PAIN ──
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
      if (a.includes('knee')) restriction.add('knee_replacement');
      if (a.includes('hip')) restriction.add('hip_replacement');
      if (a.includes('back') || a.includes('lumbar')) restriction.add('no_spinal_flexion');
      if (a.includes('neck') || a.includes('cervical')) restriction.add('no_neck_flexion');
      if (a.includes('shoulder')) restriction.add('no_overhead_press');
      if (a.includes('ankle') || a.includes('foot')) restriction.add('no_high_impact');
    }
  });

  // ── BODY LIMITATION KEYWORDS ──
  if (limitations.includes('knee')) {
    restriction.add('knee_pain');
    if (limitations.includes('replacement') || limitations.includes('severe') || limitations.includes('surgery')) restriction.add('knee_replacement');
  }
  if (limitations.includes('hip')) {
    restriction.add('hip_pain');
    if (limitations.includes('replacement') || limitations.includes('severe')) restriction.add('hip_replacement');
  }
  if (limitations.includes('back') || limitations.includes('lumbar') || limitations.includes('spine')) restriction.add('back_pain');
  if (limitations.includes('herniat') || limitations.includes('disc')) {
    restriction.add('back_pain');
    restriction.add('no_spinal_flexion');
  }
  if (limitations.includes('neck') || limitations.includes('cervical')) restriction.add('neck_injury');
  if (limitations.includes('shoulder') || limitations.includes('rotator')) restriction.add('shoulder_injury');
  if (limitations.includes('wrist') || limitations.includes('carpal')) restriction.add('wrist_injury');
  if (limitations.includes('ankle')) restriction.add('ankle_pain');
  if (limitations.includes('balance')) restriction.add('balance_issues');
  if (limitations.includes('scoliosis')) {
    restriction.add('scoliosis');
    if (limitations.includes('severe')) restriction.add('no_spinal_flexion');
  }
  if (limitations.includes('osteoporosis')) {
    restriction.add('osteoporosis');
    restriction.add('no_spinal_flexion');
    restriction.add('no_high_impact');
  }

  // ── MEDICAL CONDITIONS ──
  if (disabilities.includes('heart') || disabilities.includes('cardiac') || disabilities.includes('cardiovascular')) {
    restriction.add('heart_condition');
    restriction.add('no_high_impact');
    restriction.add('breathing_difficulty');
    capability.add('heart_safe');
  }
  if (disabilities.includes('copd') || disabilities.includes('emphysema') || disabilities.includes('pulmonary')) {
    restriction.add('copd');
    restriction.add('breathing_difficulty');
    capability.add('breathing_focused');
    capability.add('heart_safe');
  }
  if (disabilities.includes('epilepsy') || disabilities.includes('seizure')) {
    restriction.add('seizure_risk');
    restriction.add('no_head_inversion');
    capability.add('vertigo_safe');
  }
  if (allText.includes('osteoporosis')) {
    restriction.add('osteoporosis');
    restriction.add('no_spinal_flexion');
    restriction.add('no_high_impact');
    capability.add('osteoporosis_safe');
  }
  if (allText.includes('fracture') || allText.includes('brittle bone')) {
    restriction.add('fracture_risk');
    restriction.add('no_high_impact');
  }
  if (disabilities.includes('vertigo') || disabilities.includes('vestibular')) {
    restriction.add('vertigo');
    restriction.add('balance_issues');
    restriction.add('no_head_inversion');
    capability.add('vertigo_safe');
  }
  if (disabilities.includes('pregnancy')) {
    restriction.add('pregnancy');
    restriction.add('no_spinal_flexion');
    capability.add('pregnancy_safe');
  }
  if (disabilities.includes('parkinson')) {
    restriction.add('parkinsons');
    restriction.add('no_high_impact');
    capability.add('balance_training');
    capability.add('coordination');
  }
  if (disabilities.includes('multiple sclerosis') || disabilities.includes(' ms ') || disabilities.includes('ms,')) {
    restriction.add('multiple_sclerosis');
    restriction.add('heat_sensitive');
    capability.add('fatigue_management');
  }
  if (disabilities.includes('fibromyalgia') || disabilities.includes('chronic fatigue') || disabilities.includes('cfs')) {
    restriction.add('fibromyalgia');
    restriction.add('chronic_fatigue');
    capability.add('fatigue_management');
    capability.add('chronic_pain');
  }
  if (disabilities.includes('arthritis') || disabilities.includes('rheumatoid')) {
    restriction.add('arthritis');
    restriction.add('no_high_impact');
    capability.add('joint_mobility');
    capability.add('chronic_pain');
  }
  if (disabilities.includes('rheumatoid')) restriction.add('rheumatoid_arthritis');
  if (disabilities.includes('stroke')) {
    capability.add('stroke_recovery');
    capability.add('coordination');
    capability.add('balance_training');
  }
  if (disabilities.includes('cerebral palsy')) {
    restriction.add('cerebral_palsy');
    capability.add('coordination');
    capability.add('balance_training');
  }
  if (disabilities.includes('autism') || disabilities.includes('asd')) {
    capability.add('sensory_grounding');
  }
  if (disabilities.includes('diabetes')) {
    capability.add('heart_safe');
  }

  // ── BMI / WEIGHT ──
  const bmi = (p.weight_lbs && p.height_inches)
    ? (p.weight_lbs / (p.height_inches * p.height_inches)) * 703
    : null;
  if (bmi && bmi >= 35) {
    restriction.add('no_high_impact');
    restriction.add('high_bmi');
    capability.add('low_mobility');
    capability.add('fatigue_management');
  } else if (bmi && bmi >= 30) {
    restriction.add('no_high_impact');
  }

  // ── ACTIVITY LEVEL ──
  if (p.activity_level === 'Bedridden' || p.activity_level === 'Mostly seated') {
    restriction.add('no_high_impact');
    restriction.add('very_low_mobility');
  }

  // ── RISK FACTORS ──
  (p.risk_factors || []).forEach(r => {
    const rf = r.toLowerCase();
    if (rf.includes('fall')) restriction.add('balance_issues');
    if (rf.includes('surgery') && (rf.includes('recent') || rf.includes('post'))) restriction.add('fracture_risk');
    if (rf.includes('pacemaker') || rf.includes('defibrillator')) {
      restriction.add('heart_condition');
      restriction.add('breathing_difficulty');
    }
    if (rf.includes('blood pressure') || rf.includes('hypertension')) restriction.add('breathing_difficulty');
    if (rf.includes('immune') || rf.includes('immunocompromised')) restriction.add('immune_compromised');
  });

  return { restriction, capability };
}