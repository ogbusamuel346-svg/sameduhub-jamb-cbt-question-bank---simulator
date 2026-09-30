import { Subject } from '../types/index.ts';

export const JAMB_QUESTIONS_PER_SUBJECT = 60;
export const OFFLINE_PRACTICE_QUESTIONS_PER_SUBJECT = 20;
export const AI_QUESTIONS_PER_REQUEST = 3;

export const JAMB_SUBJECTS: Subject[] = [
  {
    id: 'english',
    name: 'Use of English',
    code: 'ENG',
    icon: 'BookOpen',
    category: 'General',
    description: 'Compulsory for all candidates: Comprehension, Lexis & Structure, Oral Forms, Antonyms & Synonyms.',
    defaultTimeMinutes: 40,
  },
  {
    id: 'mathematics',
    name: 'Mathematics',
    code: 'MTH',
    icon: 'Calculator',
    category: 'Science',
    description: 'Number & Numeration, Algebra, Geometry, Trigonometry, Calculus, Statistics & Probability.',
    defaultTimeMinutes: 40,
  },
  {
    id: 'physics',
    name: 'Physics',
    code: 'PHY',
    icon: 'Zap',
    category: 'Science',
    description: 'Mechanics, Thermal Physics, Waves, Optics, Electricity, Magnetism & Modern Physics.',
    defaultTimeMinutes: 40,
  },
  {
    id: 'chemistry',
    name: 'Chemistry',
    code: 'CHM',
    icon: 'FlaskConical',
    category: 'Science',
    description: 'Atomic Structure, Chemical Bonding, Stoichiometry, Organic Chemistry, Kinetics & Electrolysis.',
    defaultTimeMinutes: 40,
  },
  {
    id: 'biology',
    name: 'Biology',
    code: 'BIO',
    icon: 'Dna',
    category: 'Science',
    description: 'Cell Biology, Genetics, Ecology, Anatomy & Physiology, Reproduction & Plant Biology.',
    defaultTimeMinutes: 40,
  },
  {
    id: 'economics',
    name: 'Economics',
    code: 'ECO',
    icon: 'TrendingUp',
    category: 'Social Science',
    description: 'Microeconomics, Macroeconomics, Market Structures, Public Finance, Inflation & International Trade.',
    defaultTimeMinutes: 40,
  },
  {
    id: 'government',
    name: 'Government',
    code: 'GOV',
    icon: 'Landmark',
    category: 'Arts',
    description: 'Political Concepts, Constitutional Development, Nigerian Government & International Relations.',
    defaultTimeMinutes: 40,
  },
  {
    id: 'literature',
    name: 'Literature in English',
    code: 'LIT',
    icon: 'Scroll',
    category: 'Arts',
    description: 'Drama, Prose, Poetry, Literary Devices and Prescribed African & Non-African Texts.',
    defaultTimeMinutes: 40,
  },
  {
    id: 'commerce',
    name: 'Commerce',
    code: 'COM',
    icon: 'Briefcase',
    category: 'Social Science',
    description: 'Trade, Banking, Insurance, Warehousing, Marketing and Business Management.',
    defaultTimeMinutes: 40,
  },
  {
    id: 'crs',
    name: 'Christian Religious Studies',
    code: 'CRS',
    icon: 'Cross',
    category: 'Arts',
    description: 'Old Testament, Life of Christ, Early Christian Church & Epistle Teachings.',
    defaultTimeMinutes: 40,
  }
];

export const SUBJECT_TOPICS: Record<string, string[]> = {
  english: [
    'Comprehension & Summary',
    'Lexis and Structure',
    'Antonyms & Synonyms',
    'Oral Forms & Vowel Sounds',
    'Stress Patterns & Intonation',
    'Idioms & Idiomatic Expressions',
    'Sentence Interpretation'
  ],
  mathematics: [
    'Indices and Logarithms',
    'Quadratic Equations',
    'Matrices and Determinants',
    'Sequences and Series (AP & GP)',
    'Differentiation and Integration',
    'Trigonometry and Coordinate Geometry',
    'Probability and Statistics',
    'Permutations and Combinations'
  ],
  physics: [
    'Units and Dimensions',
    'Kinematics & Projectile Motion',
    'Newtonian Mechanics & Momentum',
    'Work, Energy and Power',
    'Wave Motion and Sound Waves',
    'Geometric Optics & Reflection',
    'Current Electricity & Ohm’s Law',
    'Electromagnetism & Induction',
    'Radioactivity and Nuclear Energy'
  ],
  chemistry: [
    'Atomic Structure and Periodicity',
    'Chemical Bonding and Geometry',
    'Stoichiometry and Mole Concept',
    'Acids, Bases and Salts',
    'Rates of Reactions & Equilibrium',
    'Redox Reactions and Electrolysis',
    'Hydrocarbons and Functional Groups',
    'Polymers and Biomolecules'
  ],
  biology: [
    'Cell Structure and Organelles',
    'Cellular Respiration and Photosynthesis',
    'Genetics and Heredity',
    'Ecology and Habitats',
    'Nutrition and Digestive System',
    'Circulatory and Excretory Systems',
    'Reproduction in Flowering Plants',
    'Evolution and Adaptation'
  ],
  economics: [
    'Theory of Demand and Supply',
    'Elasticity of Demand and Supply',
    'Production and Cost Analysis',
    'Market Structures (Perfect & Monopoly)',
    'National Income Accounting',
    'Money, Banking and Inflation',
    'Public Finance and Taxation',
    'International Trade & Balance of Payments'
  ],
  government: [
    'Forms and Arms of Government',
    'Rule of Law and Citizenship',
    'Electoral Systems and Suffrage',
    'Pre-colonial Nigerian Administration',
    'Colonial Rule and Nationalism',
    'Constitutional Development (1922-1999)',
    'Nigerian Federalism and Local Government',
    'Foreign Policy and ECOWAS/UN'
  ],
  literature: [
    'Literary Genres and Forms',
    'Plot, Setting and Characterization',
    'Themes, Style and Structure',
    'Poetry: Figures of Speech and Appreciation',
    'Drama: Elements and Dramatic Techniques',
    'Prose: Narrative Techniques and Appreciation',
    'African and Non-African Literature',
    'Literary Terms and Devices'
  ],
  commerce: [
    'Introduction to Commerce',
    'Trade and Aids to Trade',
    'Business Ownership and Organisation',
    'Banking, Money and Financial Institutions',
    'Insurance and Risk Management',
    'Transportation, Communication and Warehousing',
    'Marketing, Advertising and Consumer Protection',
    'Business Management and Office Practice'
  ],
  crs: [
    'Creation, Covenant and the Patriarchs',
    'Leadership, Prophecy and Social Justice',
    'The Life and Teachings of Jesus',
    'Miracles, Parables, Death and Resurrection',
    'The Early Christian Church',
    'Pauline Epistles and Christian Conduct',
    'Faith, Love, Service and Christian Ethics',
    'Christianity in Nigerian Society'
  ]
};

export const JAMB_SYLLABUS_SOURCE_URL = 'https://ibass.jamb.gov.ng/';
