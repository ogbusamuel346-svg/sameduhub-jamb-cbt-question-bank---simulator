import { Question } from '../types/index.ts';

export const INITIAL_QUESTIONS: Question[] = [
  // --- USE OF ENGLISH ---
  {
    id: 'eng-001',
    subjectId: 'english',
    topic: 'Comprehension & Summary',
    difficulty: 'medium',
    year: 2024,
    passage: `In recent decades, artificial intelligence (AI) has shifted from speculative science fiction into an indispensable driver of modern industry. From healthcare diagnostics predicting diseases with pinpoint accuracy to precision agriculture maximizing food production in arid regions, its benefits are tangible. However, this algorithmic revolution poses serious ethical dilemmas. Biased datasets perpetuate historical discrimination, while automated labour models threaten to displace vulnerable blue-collar workers faster than traditional economies can re-skill them. Sociologists insist that the technology must be democratized and bounded by ethical regulatory guardrails before the socio-economic gulf widens irreversibly.`,
    questionText: 'According to the passage, the primary danger highlighted regarding the rapid adoption of AI is that:',
    options: {
      A: 'It completely eliminates all agricultural and medical activities.',
      B: 'Its automated systems exacerbate economic inequality and bias if left unregulated.',
      C: 'It produces purely fictional outputs without real-world empirical utility.',
      D: 'Traditional universities refuse to teach software development skills.'
    },
    correctAnswer: 'B',
    explanation: 'The passage explicitly states that biased datasets perpetuate historical discrimination, automated labour threatens vulnerable workers, and without ethical regulatory guardrails, the socio-economic gulf will widen irreversibly.',
    status: 'approved',
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-01-15T08:00:00Z',
    createdBy: 'Samuel Ogbu (Admin)'
  },
  {
    id: 'eng-002',
    subjectId: 'english',
    topic: 'Antonyms & Synonyms',
    difficulty: 'medium',
    year: 2023,
    questionText: 'Choose the word that is nearest in meaning to the capitalized word: The minister’s EPHEMERAL popularity evaporated once the economic policies took full effect.',
    options: {
      A: 'Enduring',
      B: 'Short-lived',
      C: 'Unprecedented',
      D: 'Exaggerated'
    },
    correctAnswer: 'B',
    explanation: '"Ephemeral" means lasting for a very short time, transitory, or fleeting. Therefore, "short-lived" is the closest in meaning. "Enduring" is its antonym.',
    status: 'approved',
    createdAt: '2026-01-16T09:30:00Z',
    updatedAt: '2026-01-16T09:30:00Z',
    createdBy: 'Samuel Ogbu (Admin)'
  },
  {
    id: 'eng-003',
    subjectId: 'english',
    topic: 'Lexis and Structure',
    difficulty: 'hard',
    year: 2024,
    questionText: 'Neither the school principal nor the subject teachers ______ present at the ministerial education summit yesterday.',
    options: {
      A: 'was',
      B: 'were',
      C: 'has been',
      D: 'are'
    },
    correctAnswer: 'B',
    explanation: 'According to the rule of proximity in subject-verb concord with "neither... nor", the verb agrees with the closer subject. Since "the subject teachers" is plural, the plural past verb "were" is correct.',
    status: 'approved',
    createdAt: '2026-01-18T10:15:00Z',
    updatedAt: '2026-01-18T10:15:00Z',
    createdBy: 'Samuel Ogbu (Admin)'
  },
  {
    id: 'eng-004',
    subjectId: 'english',
    topic: 'Stress Patterns & Intonation',
    difficulty: 'medium',
    year: 2022,
    questionText: 'Which syllable carries the primary stress in the word: PHOTOGRAPHIC?',
    options: {
      A: 'PHO-to-graph-ic (1st syllable)',
      B: 'pho-TO-graph-ic (2nd syllable)',
      C: 'pho-to-GRAPH-ic (3rd syllable)',
      D: 'pho-to-graph-IC (4th syllable)'
    },
    correctAnswer: 'C',
    explanation: 'In English morphology, words ending in the suffix "-ic" take primary stress on the penultimate (second to last) syllable. Hence, pho-to-GRAPH-ic has primary stress on "GRAPH".',
    status: 'approved',
    createdAt: '2026-01-20T11:00:00Z',
    updatedAt: '2026-01-20T11:00:00Z',
    createdBy: 'Samuel Ogbu (Admin)'
  },

  // --- MATHEMATICS ---
  {
    id: 'mth-001',
    subjectId: 'mathematics',
    topic: 'Indices and Logarithms',
    difficulty: 'medium',
    year: 2023,
    questionText: 'If log₁₀(x) + log₁₀(x - 3) = 1, find the valid real value of x.',
    options: {
      A: 'x = 5 only',
      B: 'x = -2 only',
      C: 'x = 5 or x = -2',
      D: 'x = 10'
    },
    correctAnswer: 'A',
    explanation: 'Using log rules: log₁₀[x(x - 3)] = 1 => x(x - 3) = 10¹ => x² - 3x - 10 = 0. Factoring: (x - 5)(x + 2) = 0, so x = 5 or x = -2. However, the logarithm of a non-positive number is undefined in real numbers (x > 3), so x = 5 is the only valid solution.',
    status: 'approved',
    createdAt: '2026-01-15T12:00:00Z',
    updatedAt: '2026-01-15T12:00:00Z',
    createdBy: 'Samuel Ogbu (Admin)'
  },
  {
    id: 'mth-002',
    subjectId: 'mathematics',
    topic: 'Differentiation and Integration',
    difficulty: 'hard',
    year: 2024,
    questionText: 'Find the derivative dy/dx if y = (3x² - 5)⁴ with respect to x.',
    options: {
      A: '12x(3x² - 5)³',
      B: '24x(3x² - 5)³',
      C: '4(3x² - 5)³',
      D: '6x(3x² - 5)³'
    },
    correctAnswer: 'B',
    explanation: 'Using the chain rule: dy/dx = 4(3x² - 5)³ · d/dx(3x² - 5) = 4(3x² - 5)³ · (6x) = 24x(3x² - 5)³.',
    status: 'approved',
    createdAt: '2026-01-16T14:20:00Z',
    updatedAt: '2026-01-16T14:20:00Z',
    createdBy: 'Samuel Ogbu (Admin)'
  },
  {
    id: 'mth-003',
    subjectId: 'mathematics',
    topic: 'Matrices and Determinants',
    difficulty: 'easy',
    year: 2022,
    questionText: 'Evaluate the determinant of matrix M = [[4, 2], [3, 5]].',
    options: {
      A: '14',
      B: '26',
      C: '20',
      D: '6'
    },
    correctAnswer: 'A',
    explanation: 'For a 2x2 matrix [[a, b], [c, d]], det(M) = ad - bc. Here, (4 × 5) - (2 × 3) = 20 - 6 = 14.',
    status: 'approved',
    createdAt: '2026-01-17T15:00:00Z',
    updatedAt: '2026-01-17T15:00:00Z',
    createdBy: 'Samuel Ogbu (Admin)'
  },
  {
    id: 'mth-004',
    subjectId: 'mathematics',
    topic: 'Probability and Statistics',
    difficulty: 'medium',
    year: 2023,
    questionText: 'A bag contains 5 red balls, 4 blue balls, and 3 green balls. If two balls are drawn at random without replacement, what is the probability that both are blue?',
    options: {
      A: '1/11',
      B: '1/9',
      C: '4/33',
      D: '1/12'
    },
    correctAnswer: 'A',
    explanation: 'Total balls = 5 + 4 + 3 = 12. P(1st blue) = 4/12 = 1/3. Without replacement, 11 balls remain with 3 blue. P(2nd blue) = 3/11. Combined P = (4/12) × (3/11) = 12/132 = 1/11.',
    status: 'approved',
    createdAt: '2026-01-19T09:40:00Z',
    updatedAt: '2026-01-19T09:40:00Z',
    createdBy: 'Samuel Ogbu (Admin)'
  },

  // --- PHYSICS ---
  {
    id: 'phy-001',
    subjectId: 'physics',
    topic: 'Kinematics & Projectile Motion',
    difficulty: 'medium',
    year: 2023,
    questionText: 'A stone is projected horizontally with an initial speed of 15 m/s from the top of a cliff 45 m high. Calculate the horizontal range covered before it strikes the level ground. (Take g = 10 m/s²)',
    options: {
      A: '30 m',
      B: '45 m',
      C: '60 m',
      D: '75 m'
    },
    correctAnswer: 'B',
    explanation: 'Vertical motion: h = 0.5gt² => 45 = 0.5(10)t² => 45 = 5t² => t² = 9 => t = 3 seconds. Horizontal range R = u × t = 15 m/s × 3 s = 45 m.',
    status: 'approved',
    createdAt: '2026-01-17T16:10:00Z',
    updatedAt: '2026-01-17T16:10:00Z',
    createdBy: 'Samuel Ogbu (Admin)'
  },
  {
    id: 'phy-002',
    subjectId: 'physics',
    topic: 'Current Electricity & Ohm’s Law',
    difficulty: 'easy',
    year: 2024,
    questionText: 'Three resistors of resistances 2 Ω, 3 Ω, and 6 Ω are connected in parallel. What is their effective total resistance?',
    options: {
      A: '1 Ω',
      B: '11 Ω',
      C: '0.5 Ω',
      D: '2.5 Ω'
    },
    correctAnswer: 'A',
    explanation: '1/R_total = 1/2 + 1/3 + 1/6 = 3/6 + 2/6 + 1/6 = 6/6 = 1. Therefore, R_total = 1 Ω.',
    status: 'approved',
    createdAt: '2026-01-18T11:45:00Z',
    updatedAt: '2026-01-18T11:45:00Z',
    createdBy: 'Samuel Ogbu (Admin)'
  },
  {
    id: 'phy-003',
    subjectId: 'physics',
    topic: 'Radioactivity and Nuclear Energy',
    difficulty: 'medium',
    year: 2022,
    questionText: 'A radioactive isotope has a half-life of 4 days. If the initial mass is 64 grams, what mass remains undecayed after 16 days?',
    options: {
      A: '16 grams',
      B: '8 grams',
      C: '4 grams',
      D: '2 grams'
    },
    correctAnswer: 'C',
    explanation: 'Number of half-lives elapsed n = Total time / Half-life = 16 / 4 = 4 half-lives. Remaining mass = Initial mass / (2ⁿ) = 64 / (2⁴) = 64 / 16 = 4 grams.',
    status: 'approved',
    createdAt: '2026-01-20T13:15:00Z',
    updatedAt: '2026-01-20T13:15:00Z',
    createdBy: 'Samuel Ogbu (Admin)'
  },

  // --- CHEMISTRY ---
  {
    id: 'chm-001',
    subjectId: 'chemistry',
    topic: 'Stoichiometry and Mole Concept',
    difficulty: 'medium',
    year: 2024,
    questionText: 'What volume of oxygen gas measured at standard temperature and pressure (s.t.p.) is required to completely burn 2.8 g of ethene gas (C₂H₄)? [Molar mass of C₂H₄ = 28 g/mol; Molar volume of gas at s.t.p. = 22.4 dm³]',
    options: {
      A: '2.24 dm³',
      B: '4.48 dm³',
      C: '6.72 dm³',
      D: '8.96 dm³'
    },
    correctAnswer: 'C',
    explanation: 'Balanced equation: C₂H₄ + 3O₂ -> 2CO₂ + 2H₂O. Moles of C₂H₄ = 2.8 g / 28 g/mol = 0.1 mol. From the mole ratio 1:3, moles of O₂ required = 0.1 × 3 = 0.3 mol. Volume of O₂ = 0.3 mol × 22.4 dm³/mol = 6.72 dm³.',
    status: 'approved',
    createdAt: '2026-01-19T14:30:00Z',
    updatedAt: '2026-01-19T14:30:00Z',
    createdBy: 'Samuel Ogbu (Admin)'
  },
  {
    id: 'chm-002',
    subjectId: 'chemistry',
    topic: 'Acids, Bases and Salts',
    difficulty: 'easy',
    year: 2023,
    questionText: 'What is the pH of a 0.001 M solution of hydrochloric acid (HCl)?',
    options: {
      A: '1',
      B: '2',
      C: '3',
      D: '11'
    },
    correctAnswer: 'C',
    explanation: 'HCl is a strong monobasic acid, so [H⁺] = 0.001 M = 1.0 × 10⁻³ M. pH = -log₁₀[H⁺] = -log₁₀(10⁻³) = 3.',
    status: 'approved',
    createdAt: '2026-01-21T08:50:00Z',
    updatedAt: '2026-01-21T08:50:00Z',
    createdBy: 'Samuel Ogbu (Admin)'
  },
  {
    id: 'chm-003',
    subjectId: 'chemistry',
    topic: 'Hydrocarbons and Functional Groups',
    difficulty: 'hard',
    year: 2023,
    questionText: 'When ethanol (C₂H₅OH) is heated with excess concentrated tetraoxosulphate(VI) acid (H₂SO₄) at 170°C, the organic product formed is:',
    options: {
      A: 'Ethene',
      B: 'Ethane',
      C: 'Ethoxyethane (Diethyl ether)',
      D: 'Ethanoic acid'
    },
    correctAnswer: 'A',
    explanation: 'At 170°C in the presence of excess concentrated H₂SO₄, ethanol undergoes dehydration to form ethene gas (C₂H₄). Note: at a lower temperature of 140°C with excess alcohol, ethoxyethane is formed.',
    status: 'approved',
    createdAt: '2026-01-22T10:00:00Z',
    updatedAt: '2026-01-22T10:00:00Z',
    createdBy: 'Samuel Ogbu (Admin)'
  },

  // --- BIOLOGY ---
  {
    id: 'bio-001',
    subjectId: 'biology',
    topic: 'Genetics and Heredity',
    difficulty: 'medium',
    year: 2024,
    questionText: 'In humans, a man with heterozygous blood group A (IᴬIᴼ) marries a woman with blood group AB (IᴬIᴮ). Which of the following blood groups CANNOT be found in their offspring?',
    options: {
      A: 'Group A',
      B: 'Group B',
      C: 'Group AB',
      D: 'Group O'
    },
    correctAnswer: 'D',
    explanation: 'The father produces gametes Iᴬ and Iᴼ. The mother produces gametes Iᴬ and Iᴮ. Possible genotype combinations: IᴬIᴬ (Group A), IᴬIᴮ (Group AB), IᴬIᴼ (Group A), and IᴮIᴼ (Group B). Since both alleles must be Iᴼ for Group O, Group O offspring is impossible.',
    status: 'approved',
    createdAt: '2026-01-20T17:00:00Z',
    updatedAt: '2026-01-20T17:00:00Z',
    createdBy: 'Samuel Ogbu (Admin)'
  },
  {
    id: 'bio-002',
    subjectId: 'biology',
    topic: 'Cell Structure and Organelles',
    difficulty: 'easy',
    year: 2022,
    questionText: 'Which eukaryotic cellular organelle contains hydrolytic enzymes responsible for intracellular digestion and autolysis?',
    options: {
      A: 'Ribosome',
      B: 'Lysosome',
      C: 'Golgi apparatus',
      D: 'Mitochondrion'
    },
    correctAnswer: 'B',
    explanation: 'Lysosomes are membrane-bound vesicles containing acidic hydrolytic enzymes capable of breaking down biomolecules, cellular debris, and worn-out organelles.',
    status: 'approved',
    createdAt: '2026-01-22T12:00:00Z',
    updatedAt: '2026-01-22T12:00:00Z',
    createdBy: 'Samuel Ogbu (Admin)'
  },
  {
    id: 'bio-003',
    subjectId: 'biology',
    topic: 'Ecology and Habitats',
    difficulty: 'medium',
    year: 2023,
    questionText: 'In a typical terrestrial ecosystem food chain, what approximate percentage of energy is transferred from one trophic level to the next?',
    options: {
      A: '1%',
      B: '10%',
      C: '50%',
      D: '90%'
    },
    correctAnswer: 'B',
    explanation: 'According to Lindeman’s ten percent law of energy efficiency, only about 10% of the energy available at one trophic level is transferred to the next higher level, with the remaining 90% lost primarily as metabolic heat.',
    status: 'approved',
    createdAt: '2026-01-23T09:10:00Z',
    updatedAt: '2026-01-23T09:10:00Z',
    createdBy: 'Samuel Ogbu (Admin)'
  },

  // --- ECONOMICS ---
  {
    id: 'eco-001',
    subjectId: 'economics',
    topic: 'Elasticity of Demand and Supply',
    difficulty: 'medium',
    year: 2024,
    questionText: 'When the price of a commodity increases from ₦200 to ₦250, its quantity demanded falls from 100 units to 70 units. Calculate the price elasticity of demand (ignoring the negative sign).',
    options: {
      A: '0.8',
      B: '1.2',
      C: '1.5',
      D: '2.0'
    },
    correctAnswer: 'B',
    explanation: '% Change in quantity demanded = (30 / 100) × 100 = 30%. % Change in price = (50 / 200) × 100 = 25%. Price Elasticity of Demand = (% Change in Q) / (% Change in P) = 30% / 25% = 1.2 (Elastic demand).',
    status: 'approved',
    createdAt: '2026-01-21T13:40:00Z',
    updatedAt: '2026-01-21T13:40:00Z',
    createdBy: 'Samuel Ogbu (Admin)'
  },
  {
    id: 'eco-002',
    subjectId: 'economics',
    topic: 'Money, Banking and Inflation',
    difficulty: 'easy',
    year: 2023,
    questionText: 'Inflation caused predominantly by an increase in the cost of raw materials and wage rates is known as:',
    options: {
      A: 'Demand-pull inflation',
      B: 'Cost-push inflation',
      C: 'Hyperinflation',
      D: 'Imported inflation'
    },
    correctAnswer: 'B',
    explanation: 'Cost-push inflation occurs when overall prices increase (inflation) due to increases in the cost of wages and raw materials, shifting the aggregate supply curve inward.',
    status: 'approved',
    createdAt: '2026-01-22T14:15:00Z',
    updatedAt: '2026-01-22T14:15:00Z',
    createdBy: 'Samuel Ogbu (Admin)'
  },

  // --- GOVERNMENT ---
  {
    id: 'gov-001',
    subjectId: 'government',
    topic: 'Constitutional Development (1922-1999)',
    difficulty: 'medium',
    year: 2023,
    questionText: 'Which colonial constitution introduced the elective principle for the first time in Nigeria, allowing the election of members into the Legislative Council in Lagos and Calabar?',
    options: {
      A: 'Clifford Constitution of 1922',
      B: 'Richards Constitution of 1946',
      C: 'Macpherson Constitution of 1951',
      D: 'Lyttelton Constitution of 1954'
    },
    correctAnswer: 'A',
    explanation: 'The Sir Hugh Clifford Constitution of 1922 introduced the elective principle in Nigeria for the first time, providing for four elected Africans (three from Lagos and one from Calabar).',
    status: 'approved',
    createdAt: '2026-01-23T11:20:00Z',
    updatedAt: '2026-01-23T11:20:00Z',
    createdBy: 'Samuel Ogbu (Admin)'
  },
  {
    id: 'gov-002',
    subjectId: 'government',
    topic: 'Forms and Arms of Government',
    difficulty: 'easy',
    year: 2024,
    questionText: 'The legal doctrine that no individual or authority is above the law and that everyone is subject to ordinary laws of the land administered by ordinary courts is known as:',
    options: {
      A: 'Separation of Powers',
      B: 'Rule of Law',
      C: 'Parliamentary Supremacy',
      D: 'Judicial Immunity'
    },
    correctAnswer: 'B',
    explanation: 'The Rule of Law, formulated classically by A.V. Dicey, asserts supremacy of regular law, equality before the law, and predominance of legal spirit.',
    status: 'approved',
    createdAt: '2026-01-24T10:05:00Z',
    updatedAt: '2026-01-24T10:05:00Z',
    createdBy: 'Samuel Ogbu (Admin)'
  },

  // --- REVIEW QUEUE DEMO QUESTIONS ---
  {
    id: 'rev-001',
    subjectId: 'mathematics',
    topic: 'Sequences and Series (AP & GP)',
    difficulty: 'hard',
    year: 2024,
    questionText: 'The third term of a geometric progression (G.P.) is 36 and the sixth term is 972. Find the first term (a) and the common ratio (r).',
    options: {
      A: 'a = 4, r = 3',
      B: 'a = 3, r = 4',
      C: 'a = 2, r = 6',
      D: 'a = 6, r = 2'
    },
    correctAnswer: 'A',
    explanation: 'T₃ = ar² = 36 and T₆ = ar⁵ = 972. Dividing: ar⁵ / ar² = 972 / 36 => r³ = 27 => r = 3. Substituting into T₃: a(3)² = 36 => 9a = 36 => a = 4.',
    status: 'pending',
    createdAt: '2026-02-01T15:00:00Z',
    updatedAt: '2026-02-01T15:00:00Z',
    createdBy: 'David Adeleke (Educator Contributor)'
  },
  {
    id: 'rev-002',
    subjectId: 'physics',
    topic: 'Geometric Optics & Reflection',
    difficulty: 'medium',
    year: 2024,
    questionText: 'An object is placed 15 cm in front of a concave mirror of focal length 10 cm. Find the image distance and state the nature of the image formed.',
    options: {
      A: '30 cm, Real and Inverted',
      B: '30 cm, Virtual and Erect',
      C: '6 cm, Real and Inverted',
      D: '15 cm, Virtual and Erect'
    },
    correctAnswer: 'A',
    explanation: 'Using mirror equation: 1/f = 1/u + 1/v. For concave mirror: f = +10 cm, u = +15 cm. 1/10 = 1/15 + 1/v => 1/v = 1/10 - 1/15 = (3 - 2)/30 = 1/30. So v = +30 cm. Since v is positive, the image is Real and Inverted.',
    status: 'pending',
    createdAt: '2026-02-02T16:20:00Z',
    updatedAt: '2026-02-02T16:20:00Z',
    createdBy: 'Dr. Mary Okon (Physics Dept)'
  }
];
