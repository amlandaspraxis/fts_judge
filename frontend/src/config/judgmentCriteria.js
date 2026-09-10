/**
 * Official Judgment Criteria by Competition Category
 * Each category contains exactly 5 criteria carrying 20 marks each.
 * Maximum Total Score = 100 Marks.
 */

export const CATEGORY_JUDGMENT_CRITERIA = {
  singing_idol: {
    key: "singing_idol",
    name: "Singing Idol",
    criteria: [
      { id: "singing_c1", label: "Sur & Taal.", marks: 20 },
      { id: "singing_c2", label: "Stage Presence.", marks: 20 },
      { id: "singing_c3", label: "Voice Quality.", marks: 20 },
      { id: "singing_c4", label: "Voice Modulation.", marks: 20 },
      { id: "singing_c5", label: "Overall impact.", marks: 20 },
    ],
    total: 100
  },
  poetry_slam: {
    key: "poetry_slam",
    name: "Poetry Slam",
    criteria: [
      { id: "poetry_c1", label: "Originality.", marks: 20 },
      { id: "poetry_c2", label: "Stage Presence.", marks: 20 },
      { id: "poetry_c3", label: "Theme.", marks: 20 },
      { id: "poetry_c4", label: "Voice Modulation.", marks: 20 },
      { id: "poetry_c5", label: "Overall impact.", marks: 20 },
    ],
    total: 100
  },
  elocution: {
    key: "elocution",
    name: "Elocution",
    criteria: [
      { id: "elocution_c1", label: "Content / Theme.", marks: 20 },
      { id: "elocution_c2", label: "Delivery.", marks: 20 },
      { id: "elocution_c3", label: "Fluency.", marks: 20 },
      { id: "elocution_c4", label: "Spontaneity.", marks: 20 },
      { id: "elocution_c5", label: "Overall impact.", marks: 20 },
    ],
    total: 100
  },
  open_mic: {
    key: "open_mic",
    name: "Open Mic",
    criteria: [
      { id: "openmic_c1", label: "Rhythm & Beat.", marks: 20 },
      { id: "openmic_c2", label: "Harmony.", marks: 20 },
      { id: "openmic_c3", label: "Composition.", marks: 20 },
      { id: "openmic_c4", label: "Synchronization.", marks: 20 },
      { id: "openmic_c5", label: "Overall impact.", marks: 20 },
    ],
    total: 100
  },
  special_talents: {
    key: "special_talents",
    name: "Special Talents",
    criteria: [
      { id: "special_c1", label: "Stage Presence.", marks: 20 },
      { id: "special_c2", label: "Execution & Precision.", marks: 20 },
      { id: "special_c3", label: "Confidence.", marks: 20 },
      { id: "special_c4", label: "Surprise Element.", marks: 20 },
      { id: "special_c5", label: "Overall impact.", marks: 20 },
    ],
    total: 100
  },
  dancing_superstar: {
    key: "dancing_superstar",
    name: "Dancing Superstar",
    criteria: [
      { id: "dance_c1", label: "Theme interpretation.", marks: 20 },
      { id: "dance_c2", label: "Choreography creativity.", marks: 20 },
      { id: "dance_c3", label: "Synchronization.", marks: 20 },
      { id: "dance_c4", label: "Expressions & Stage presence.", marks: 20 },
      { id: "dance_c5", label: "Overall impact.", marks: 20 },
    ],
    total: 100
  },
  mr_miss_freshmen: {
    key: "mr_miss_freshmen",
    name: "Mr. & Miss Freshmen",
    criteria: [
      { id: "freshmen_c1", label: "Pose.", marks: 20 },
      { id: "freshmen_c2", label: "Confidence.", marks: 20 },
      { id: "freshmen_c3", label: "Attitude.", marks: 20 },
      { id: "freshmen_c4", label: "Elegance & Personality.", marks: 20 },
      { id: "freshmen_c5", label: "Overall impact.", marks: 20 },
    ],
    total: 100
  }
};

/**
 * Resolve any category representation (ID, name, label, code) to its normalized criteria definition.
 */
export function getCategoryCriteriaData(categoryOrIdentifier) {
  if (!categoryOrIdentifier) {
    return CATEGORY_JUDGMENT_CRITERIA.singing_idol;
  }

  // If already a criteria object with criteria array
  if (categoryOrIdentifier && Array.isArray(categoryOrIdentifier.criteria)) {
    return categoryOrIdentifier;
  }

  // Extract string candidate from object or primitive
  let candidate = "";
  if (typeof categoryOrIdentifier === "string") {
    candidate = categoryOrIdentifier;
  } else if (typeof categoryOrIdentifier === "object") {
    candidate = [
      categoryOrIdentifier.id,
      categoryOrIdentifier.name,
      categoryOrIdentifier.label,
      categoryOrIdentifier.code,
      categoryOrIdentifier.prefix,
      categoryOrIdentifier.categoryName,
      categoryOrIdentifier.categoryId
    ]
      .filter(Boolean)
      .join(" ");
  }

  const s = candidate.toLowerCase();

  // 1. Singing Idol
  if (s.includes("sing") || s.includes("sng") || s.includes("music") || s.includes("msc") || s.includes("vocal")) {
    return CATEGORY_JUDGMENT_CRITERIA.singing_idol;
  }

  // 2. Poetry Slam
  if (s.includes("poet") || s.includes("poe") || s.includes("pty") || s.includes("slam") || s.includes("spoken word")) {
    return CATEGORY_JUDGMENT_CRITERIA.poetry_slam;
  }

  // 3. Elocution
  if (s.includes("elocut") || s.includes("elo") || s.includes("speech") || s.includes("speaking")) {
    return CATEGORY_JUDGMENT_CRITERIA.elocution;
  }

  // 4. Open Mic
  if (s.includes("open mic") || s.includes("mic") || s.includes("comedy") || s.includes("cmd") || s.includes("band") || s.includes("bnd")) {
    return CATEGORY_JUDGMENT_CRITERIA.open_mic;
  }

  // 5. Special Talents
  if (s.includes("special") || s.includes("spl") || s.includes("unique") || s.includes("talent")) {
    return CATEGORY_JUDGMENT_CRITERIA.special_talents;
  }

  // 6. Dancing Superstar
  if (s.includes("danc") || s.includes("dan") || s.includes("dnc")) {
    return CATEGORY_JUDGMENT_CRITERIA.dancing_superstar;
  }

  // 7. Mr. & Miss Freshmen
  if (s.includes("freshm") || s.includes("fashion") || s.includes("mmf") || s.includes("runway") || s.includes("mr.") || s.includes("miss") || s.includes("mrs")) {
    return CATEGORY_JUDGMENT_CRITERIA.mr_miss_freshmen;
  }

  return CATEGORY_JUDGMENT_CRITERIA.singing_idol;
}

/**
 * Returns the array of 5 criteria objects for the given category.
 */
export function getCriteriaForCategory(categoryOrIdentifier) {
  return getCategoryCriteriaData(categoryOrIdentifier).criteria;
}

export default CATEGORY_JUDGMENT_CRITERIA;
