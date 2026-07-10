// Workout safety re-check: name matching, smart substitution, and never-empty fallback.
// Used by Dashboard.jsx handleGenerateWorkout to post-process LLM-generated exercises.

import { difficultyAllowed } from "@/lib/userTags";

// --- NAME NORMALIZATION ---
// Library exercises have prefixed names like "STR: Sit to Stand", "PD: March in Place", "BAL: Heel Raise".
// The LLM outputs bare names like "Sit to Stand". We normalize by stripping the "XXX: " prefix.
function normalizeName(raw) {
  const name = (raw || '').toLowerCase().trim();
  // Strip leading category prefix: "STR: ", "PD: ", "BAL: ", "MS: ", "CP: ", etc.
  const stripped = name.replace(/^[a-z]{1,5}:\s*/, '');
  return stripped;
}

// Build a lookup map from normalized exercise name → array of library exercises (there can be multiple variants).
export function buildLibraryLookup(library) {
  const map = {};
  library.forEach(ex => {
    const key = normalizeName(ex.name);
    if (!map[key]) map[key] = [];
    map[key].push(ex);
  });
  return map;
}

// Find the best-matching library exercise for a given LLM exercise name.
// Returns the library exercise object, or null if no match.
export function findLibraryMatch(llmExercise, libLookup) {
  const key = normalizeName(llmExercise.name);
  const variants = libLookup[key];
  if (!variants || variants.length === 0) return null;
  // Return the first variant — all share the same base movement.
  return variants[0];
}

// --- SAFE VARIANT SUBSTITUTION ---
// When an exercise is flagged for a restricted joint, try to find a condition-specific
// variant of the same movement that is safe for this user (e.g. seated march vs standing march).
function findSafeVariant(llmExercise, libLookup, userRestrictionTags, userEquipment) {
  const key = normalizeName(llmExercise.name);
  const variants = libLookup[key];
  if (!variants || variants.length === 0) return null;

  // Check each variant for safety
  for (const lib of variants) {
    const tags = lib.restriction_tags || [];
    // Must not have any restriction tag that overlaps user's restrictions
    if (tags.some(t => userRestrictionTags.has(t))) continue;
    // Must pass difficulty check
    if (!difficultyAllowed(lib.difficulty, userRestrictionTags)) continue;
    // Must not require equipment the user doesn't have
    const requiredEquip = lib.equipment_tags || [];
    if (requiredEquip.length > 0 && !requiredEquip.every(eq => userEquipment.includes(eq))) continue;
    // Must not be Standing if user cannot stand
    if (userRestrictionTags.has('cannot_stand') && lib.position === 'Standing') continue;
    return lib;
  }
  return null;
}

// --- NEVER-EMPTY FALLBACK ---
// If after filtering/substitution the main exercise set is below the minimum target,
// backfill with known-safe seated/low-impact exercises from the library.
export function findFallbackExercises(library, userRestrictionTags, userEquipment, userCapabilityTags, needed, excludeNames) {
  const excludeSet = new Set((excludeNames || []).map(n => normalizeName(n)));

  // Priority: exercises tagged suitable_for conditions matching the user, seated/supported, bodyweight.
  // These are gentle, universally safe defaults for highly-restricted users.
  const prioritySuitableFor = ['low_mobility', 'chronic_pain', 'seated_only', 'heart_safe', 'balance_issues', 'stroke_recovery'];
  const preferCategories = ['Strength', 'Flexibility', 'Balance', 'Cardio'];

  const candidates = library.filter(ex => {
    // Already included?
    if (excludeSet.has(normalizeName(ex.name))) return false;

    // Must pass restriction tags
    const tags = ex.restriction_tags || [];
    if (tags.some(t => userRestrictionTags.has(t))) return false;

    // Must pass difficulty
    if (!difficultyAllowed(ex.difficulty, userRestrictionTags)) return false;

    // Must not require unavailable equipment
    const requiredEquip = ex.equipment_tags || [];
    if (requiredEquip.length > 0 && !requiredEquip.every(eq => userEquipment.includes(eq))) return false;

    // Must not be Standing if user cannot stand
    if (userRestrictionTags.has('cannot_stand') && ex.position === 'Standing') return false;

    // Skip warmup/cooldown/breathing/recovery categories — we want main exercises
    if (!preferCategories.includes(ex.category)) return false;

    return true;
  });

  // Sort by suitability: prefer exercises whose suitable_for_tags match user's capabilities/needs
  candidates.sort((a, b) => {
    const aScore = (a.suitable_for_tags || []).filter(t => prioritySuitableFor.includes(t) || userCapabilityTags.has(t)).length;
    const bScore = (b.suitable_for_tags || []).filter(t => prioritySuitableFor.includes(t) || userCapabilityTags.has(t)).length;
    return bScore - aScore;
  });

  // Return up to `needed` exercises, preferring variety in category
  const selected = [];
  const usedCategories = {};
  for (const ex of candidates) {
    if (selected.length >= needed) break;
    // Prefer at most 2 from the same category to ensure variety
    const cat = ex.category || 'Other';
    if ((usedCategories[cat] || 0) >= 2) continue;
    usedCategories[cat] = (usedCategories[cat] || 0) + 1;
    selected.push(ex);
  }

  // If we still don't have enough, relax the variety constraint
  if (selected.length < needed) {
    for (const ex of candidates) {
      if (selected.length >= needed) break;
      if (selected.some(s => s.id === ex.id)) continue;
      selected.push(ex);
    }
  }

  return selected.slice(0, needed);
}

// --- MAIN: Process LLM exercises through safety re-check ---
// Returns { exercises, safetyNotes }
export function safetyCheckExercises(llmExercises, library, userRestrictionTags, userEquipment, userCapabilityTags) {
  const libLookup = buildLibraryLookup(library);
  const removedBySafety = [];
  const substitutedExercises = [];
  const keptExercises = [];

  for (const ex of (llmExercises || [])) {
    // Guardrail 1: cannot_stand + Standing → try seated variant first
    if (userRestrictionTags.has('cannot_stand') && ex.position === 'Standing') {
      const safeVariant = findSafeVariant(ex, libLookup, userRestrictionTags, userEquipment);
      if (safeVariant) {
        substitutedExercises.push({
          ...ex,
          name: safeVariant.name,
          position: safeVariant.position,
          restriction_tags: safeVariant.restriction_tags || [],
          safety_notes: (ex.safety_notes || '') + (ex.safety_notes ? ' ' : '') + `Substituted with safe seated/supported variant: ${safeVariant.name}.`,
        });
        continue;
      }
      removedBySafety.push(ex.name + ' (standing, no safe seated variant)');
      continue;
    }

    // Try to find the library match for curated restriction_tags
    const libMatch = findLibraryMatch(ex, libLookup);
    // Use library's curated tags as source of truth when available; fall back to LLM tags only if no library match
    const tags = libMatch ? (libMatch.restriction_tags || []) : (ex.restriction_tags || []);

    // Check if any restriction tag overlaps user's restrictions
    if (tags.some(t => userRestrictionTags.has(t))) {
      // Try to find a safe variant of this movement
      const safeVariant = findSafeVariant(ex, libLookup, userRestrictionTags, userEquipment);
      if (safeVariant && safeVariant.name !== ex.name) {
        substitutedExercises.push({
          ...ex,
          name: safeVariant.name,
          position: safeVariant.position,
          restriction_tags: safeVariant.restriction_tags || [],
          safety_notes: (ex.safety_notes || '') + (ex.safety_notes ? ' ' : '') + `Substituted with safer variant: ${safeVariant.name}.`,
        });
        continue;
      }
      // No safe variant — only remove if the library match confirms it's unsafe.
      // If there's no library match, the tags are LLM-self-assigned and unreliable; KEEP the exercise.
      if (libMatch) {
        removedBySafety.push(ex.name);
        continue;
      }
      // LLM-generated exercise with no library match: keep it (the pre-filtered library context already guided the LLM)
      keptExercises.push(ex);
      continue;
    }

    // Check difficulty using library match if available
    if (libMatch && !difficultyAllowed(libMatch.difficulty, userRestrictionTags)) {
      const safeVariant = findSafeVariant(ex, libLookup, userRestrictionTags, userEquipment);
      if (safeVariant) {
        substitutedExercises.push({
          ...ex,
          name: safeVariant.name,
          position: safeVariant.position,
          restriction_tags: safeVariant.restriction_tags || [],
          safety_notes: (ex.safety_notes || '') + (ex.safety_notes ? ' ' : '') + `Substituted with easier variant: ${safeVariant.name}.`,
        });
        continue;
      }
      removedBySafety.push(ex.name + ' (difficulty too high)');
      continue;
    }

    keptExercises.push(ex);
  }

  let exercises = [...keptExercises, ...substitutedExercises];

  // --- NEVER-EMPTY FALLBACK: if below 3 exercises, backfill with safe library exercises ---
  const MIN_EXERCISES = 3;
  let fallbackExercises = [];
  let safetyNotes = '';

  if (exercises.length < MIN_EXERCISES) {
    const needed = MIN_EXERCISES - exercises.length;
    const currentNames = exercises.map(e => e.name);
    fallbackExercises = findFallbackExercises(library, userRestrictionTags, userEquipment, userCapabilityTags, needed, currentNames);
    exercises = [...exercises, ...fallbackExercises];
    if (fallbackExercises.length > 0) {
      safetyNotes += ` Backfilled with ${fallbackExercises.length} safe seated/low-impact exercise(s): ${fallbackExercises.map(e => e.name).join(', ')}.`;
    }
  }

  if (removedBySafety.length) {
    safetyNotes = 'Final deterministic safety check removed: ' + removedBySafety.join(', ') + '.' + safetyNotes;
  }

  return { exercises, safetyNotes };
}